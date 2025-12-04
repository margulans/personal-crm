import { 
  type Contact, 
  type InsertContact, 
  type Interaction,
  type InsertInteraction,
  type User,
  type UpsertUser,
  type Team,
  type InsertTeam,
  type TeamMember,
  type InsertTeamMember,
  type Backup,
  type InsertBackup,
  type Attachment,
  type InsertAttachment,
  type ContactConnection,
  type InsertContactConnection,
  type Gift,
  type InsertGift,
  type Purchase,
  type InsertPurchase,
  type PurchaseTotals,
  type Contribution,
  type InsertContribution,
  type ContributionCriterionType,
  contacts, 
  interactions,
  users,
  teams,
  teamMembers,
  backups,
  attachments,
  contactConnections,
  gifts,
  purchases,
  contributions,
  getClassFromScore,
  calculateHeatIndex,
  getRecommendedAttentionLevel,
  calculateFinancialScore,
  contributionCriteriaTypes,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, ilike, or, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Team operations
  getTeam(id: string): Promise<Team | undefined>;
  getTeamByInviteCode(code: string): Promise<Team | undefined>;
  createTeam(team: InsertTeam): Promise<Team>;
  updateTeam(id: string, data: Partial<InsertTeam>): Promise<Team | undefined>;
  deleteTeam(id: string): Promise<boolean>;
  getUserTeams(userId: string): Promise<(Team & { role: string })[]>;
  
  // Team member operations
  getTeamMembers(teamId: string): Promise<(TeamMember & { user: User })[]>;
  addTeamMember(member: InsertTeamMember): Promise<TeamMember>;
  removeTeamMember(teamId: string, userId: string): Promise<boolean>;
  getTeamMember(teamId: string, userId: string): Promise<TeamMember | undefined>;
  
  // Contact operations
  getContacts(teamId: string): Promise<Contact[]>;
  getContactsAll(): Promise<Contact[]>;
  getContact(id: string, teamId?: string): Promise<Contact | undefined>;
  createContact(contact: InsertContact): Promise<Contact>;
  updateContact(id: string, contact: Partial<InsertContact>): Promise<Contact | undefined>;
  deleteContact(id: string): Promise<boolean>;
  
  // Interaction operations
  getInteractions(contactId: string): Promise<Interaction[]>;
  getInteraction(id: string): Promise<Interaction | undefined>;
  createInteraction(interaction: InsertInteraction): Promise<Interaction>;
  deleteInteraction(id: string): Promise<boolean>;
  
  // Utility operations
  recalculateContactMetrics(contactId: string): Promise<Contact | undefined>;
  recalculateAllContactMetrics(teamId: string): Promise<void>;
  migrateContributionData(teamId: string): Promise<void>;
  
  // Backup operations
  getBackups(teamId: string): Promise<Backup[]>;
  getBackup(id: string): Promise<Backup | undefined>;
  createBackup(teamId: string, userId: string, description?: string): Promise<Backup>;
  restoreBackup(backupId: string): Promise<boolean>;
  deleteBackup(id: string): Promise<boolean>;
  deleteOldBackups(teamId: string, keepCount: number): Promise<number>;
  
  // Attachment operations
  getAttachments(contactId: string): Promise<Attachment[]>;
  getAttachmentsByCategory(contactId: string, category: string): Promise<Attachment[]>;
  getAttachment(id: string): Promise<Attachment | undefined>;
  createAttachment(attachment: InsertAttachment): Promise<Attachment>;
  deleteAttachment(id: string): Promise<boolean>;
  
  // Connection operations for relationship graph
  getConnections(teamId: string): Promise<ContactConnection[]>;
  getContactConnections(contactId: string, teamId: string): Promise<ContactConnection[]>;
  getConnection(id: string, teamId: string): Promise<ContactConnection | undefined>;
  checkDuplicateConnection(fromContactId: string, toContactId: string, teamId: string): Promise<boolean>;
  createConnection(connection: InsertContactConnection): Promise<ContactConnection>;
  updateConnection(id: string, data: Pick<InsertContactConnection, "connectionType" | "strength" | "notes">, teamId: string): Promise<ContactConnection | undefined>;
  deleteConnection(id: string, teamId: string): Promise<boolean>;
  
  // Gift operations
  getGifts(teamId: string): Promise<Gift[]>;
  getContactGifts(contactId: string, teamId: string): Promise<Gift[]>;
  getGift(id: string, teamId: string): Promise<Gift | undefined>;
  createGift(gift: InsertGift): Promise<Gift>;
  updateGift(id: string, data: Partial<InsertGift>, teamId: string): Promise<Gift | undefined>;
  deleteGift(id: string, teamId: string): Promise<boolean>;
  
  // Purchase operations
  getPurchases(teamId: string): Promise<Purchase[]>;
  getContactPurchases(contactId: string, teamId: string): Promise<Purchase[]>;
  getPurchase(id: string, teamId: string): Promise<Purchase | undefined>;
  createPurchase(purchase: InsertPurchase): Promise<Purchase>;
  updatePurchase(id: string, data: Partial<InsertPurchase>, teamId: string): Promise<Purchase | undefined>;
  deletePurchase(id: string, teamId: string): Promise<boolean>;
  recalculatePurchaseTotals(contactId: string, teamId: string): Promise<void>;
  
  // Contribution operations (all criterion types)
  getContributions(teamId: string): Promise<Contribution[]>;
  getContactContributions(contactId: string, teamId: string): Promise<Contribution[]>;
  getContribution(id: string, teamId: string): Promise<Contribution | undefined>;
  createContribution(contribution: InsertContribution): Promise<Contribution>;
  updateContribution(id: string, data: Partial<InsertContribution>, teamId: string): Promise<Contribution | undefined>;
  deleteContribution(id: string, teamId: string): Promise<boolean>;
  recalculateContributionTotals(contactId: string, teamId: string): Promise<void>;
}

function calculateContributionScoreAndClass(details: { 
  financial?: number; 
  network?: number; 
  trust?: number;
  emotional?: number;
  intellectual?: number;
}, maxScore: number = 15): { score: number; scoreClass: string } {
  const d = details || {};
  // Financial = 50% weight (max 7.5 points when value = 3)
  // Other 4 criteria = 50% weight total (12.5% each, max 1.875 points each when value = 3)
  const financialWeight = 2.5; // 3 * 2.5 = 7.5 (50%)
  const otherWeight = 0.625;   // 3 * 0.625 = 1.875 per criterion (12.5% each)
  
  const score = Math.round(
    (d.financial || 0) * financialWeight +
    (d.network || 0) * otherWeight +
    (d.trust || 0) * otherWeight +
    (d.emotional || 0) * otherWeight +
    (d.intellectual || 0) * otherWeight
  );
  
  const scoreClass = getClassFromScore(score, maxScore);
  return { score, scoreClass };
}

function calculatePotentialScoreAndClass(details: { 
  personal?: number; 
  resources?: number; 
  network?: number; 
  synergy?: number; 
  systemRole?: number; 
}, maxScore: number = 15): { score: number; scoreClass: string } {
  const values = Object.values(details || {});
  const score = values.reduce((sum, val) => sum + (val || 0), 0);
  const scoreClass = getClassFromScore(score, maxScore);
  return { score, scoreClass };
}

function calculateImportanceFromCategory(contributionClass: string, potentialClass: string): "A" | "B" | "C" {
  const classPoints: Record<string, number> = { A: 4, B: 3, C: 2, D: 1 };
  const sum = (classPoints[contributionClass] || 1) + (classPoints[potentialClass] || 1);
  
  if (sum >= 7) return "A";
  if (sum >= 5) return "B";
  return "C";
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // First, check if a user with this email already exists (different id)
    if (userData.email) {
      const existingByEmail = await db
        .select()
        .from(users)
        .where(eq(users.email, userData.email));
      
      if (existingByEmail.length > 0 && existingByEmail[0].id !== userData.id) {
        // User with this email exists with different id - update the existing record
        const [user] = await db
          .update(users)
          .set({
            ...userData,
            id: existingByEmail[0].id, // Keep original id
            updatedAt: new Date(),
          })
          .where(eq(users.id, existingByEmail[0].id))
          .returning();
        return user;
      }
    }

    // Normal upsert by id
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Team operations
  async getTeam(id: string): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    return team;
  }

  async getTeamByInviteCode(code: string): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.inviteCode, code));
    return team;
  }

  async createTeam(teamData: InsertTeam): Promise<Team> {
    const [team] = await db.insert(teams).values(teamData).returning();
    
    await db.insert(teamMembers).values({
      teamId: team.id,
      userId: teamData.ownerId,
      role: "owner",
    });
    
    return team;
  }

  async updateTeam(id: string, data: Partial<InsertTeam>): Promise<Team | undefined> {
    const [team] = await db
      .update(teams)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(teams.id, id))
      .returning();
    return team;
  }

  async deleteTeam(id: string): Promise<boolean> {
    const result = await db.delete(teams).where(eq(teams.id, id)).returning();
    return result.length > 0;
  }

  async getUserTeams(userId: string): Promise<(Team & { role: string })[]> {
    const memberships = await db
      .select({
        team: teams,
        role: teamMembers.role,
      })
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(eq(teamMembers.userId, userId));
    
    return memberships.map((m) => ({ ...m.team, role: m.role }));
  }

  // Team member operations
  async getTeamMembers(teamId: string): Promise<(TeamMember & { user: User })[]> {
    const members = await db
      .select({
        member: teamMembers,
        user: users,
      })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(eq(teamMembers.teamId, teamId));
    
    return members.map((m) => ({ ...m.member, user: m.user }));
  }

  async addTeamMember(member: InsertTeamMember): Promise<TeamMember> {
    const [newMember] = await db.insert(teamMembers).values(member).returning();
    return newMember;
  }

  async removeTeamMember(teamId: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
      .returning();
    return result.length > 0;
  }

  async getTeamMember(teamId: string, userId: string): Promise<TeamMember | undefined> {
    const [member] = await db
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));
    return member;
  }

  // Contact operations
  async getContacts(teamId: string): Promise<Contact[]> {
    return await db.select().from(contacts).where(eq(contacts.teamId, teamId)).orderBy(desc(contacts.heatIndex));
  }
  
  async getContactsAll(): Promise<Contact[]> {
    return await db.select().from(contacts).orderBy(desc(contacts.heatIndex));
  }

  async getContact(id: string, teamId?: string): Promise<Contact | undefined> {
    const [contact] = await db.select().from(contacts).where(eq(contacts.id, id));
    if (contact && teamId && contact.teamId !== teamId) {
      return undefined;
    }
    return contact;
  }

  async createContact(insertContact: InsertContact): Promise<Contact> {
    const contribution = calculateContributionScoreAndClass(insertContact.contributionDetails || {}, 15);
    const potential = calculatePotentialScoreAndClass(insertContact.potentialDetails || {}, 15);
    
    const today = new Date();
    const lastContactDate = insertContact.lastContactDate ? new Date(insertContact.lastContactDate) : null;
    const daysSince = lastContactDate 
      ? Math.floor((today.getTime() - lastContactDate.getTime()) / (1000 * 60 * 60 * 24))
      : insertContact.desiredFrequencyDays || 30;
    
    const { heatIndex, heatStatus } = calculateHeatIndex(
      daysSince,
      insertContact.desiredFrequencyDays || 30,
      insertContact.responseQuality ?? 2,
      insertContact.relationshipEnergy ?? 3,
      insertContact.attentionTrend ?? 0
    );

    const importanceLevel = calculateImportanceFromCategory(contribution.scoreClass, potential.scoreClass);
    const recommendedAttentionLevel = getRecommendedAttentionLevel(importanceLevel);

    const [contact] = await db.insert(contacts).values({
      ...insertContact,
      contributionScore: contribution.score,
      contributionClass: contribution.scoreClass,
      potentialScore: potential.score,
      potentialClass: potential.scoreClass,
      valueCategory: `${contribution.scoreClass}${potential.scoreClass}`,
      importanceLevel,
      recommendedAttentionLevel,
      heatIndex,
      heatStatus,
    }).returning();
    
    return contact;
  }

  async updateContact(id: string, updateData: Partial<InsertContact>): Promise<Contact | undefined> {
    const existing = await this.getContact(id);
    if (!existing) return undefined;

    const defaultContribution = { financial: 0, network: 0, trust: 0, emotional: 0, intellectual: 0 };
    const defaultPotential = { personal: 0, resources: 0, network: 0, synergy: 0, systemRole: 0 };
    
    const existingContribution = existing.contributionDetails as { 
      financial?: number; network?: number; tactical?: number; 
      strategic?: number; loyalty?: number; trust?: number;
      emotional?: number; intellectual?: number;
    } | null;
    
    let baseContribution = defaultContribution;
    if (existingContribution) {
      if ('trust' in existingContribution) {
        baseContribution = { 
          financial: existingContribution.financial || 0, 
          network: existingContribution.network || 0, 
          trust: existingContribution.trust || 0,
          emotional: existingContribution.emotional || 0,
          intellectual: existingContribution.intellectual || 0,
        };
      } else {
        const trustValue = Math.min(3, Math.round(((existingContribution.tactical || 0) + (existingContribution.strategic || 0) + (existingContribution.loyalty || 0)) / 3));
        baseContribution = { 
          financial: existingContribution.financial || 0, 
          network: existingContribution.network || 0, 
          trust: trustValue,
          emotional: 0,
          intellectual: 0,
        };
      }
    }
    
    const mergedContribution = {
      ...baseContribution,
      ...updateData.contributionDetails,
    };
    const mergedPotential = {
      ...defaultPotential,
      ...existing.potentialDetails,
      ...updateData.potentialDetails,
    };

    const contribution = calculateContributionScoreAndClass(mergedContribution, 15);
    const potential = calculatePotentialScoreAndClass(mergedPotential, 15);

    const lastContactDate = updateData.lastContactDate !== undefined 
      ? updateData.lastContactDate 
      : existing.lastContactDate;
    
    const today = new Date();
    const lastDate = lastContactDate ? new Date(lastContactDate) : null;
    const daysSince = lastDate 
      ? Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
      : (updateData.desiredFrequencyDays ?? existing.desiredFrequencyDays);

    const { heatIndex, heatStatus } = calculateHeatIndex(
      daysSince,
      updateData.desiredFrequencyDays ?? existing.desiredFrequencyDays,
      updateData.responseQuality ?? existing.responseQuality,
      updateData.relationshipEnergy ?? existing.relationshipEnergy,
      updateData.attentionTrend ?? existing.attentionTrend
    );

    const importanceLevel = calculateImportanceFromCategory(contribution.scoreClass, potential.scoreClass);
    const recommendedAttentionLevel = getRecommendedAttentionLevel(importanceLevel);

    const [updated] = await db.update(contacts)
      .set({
        ...updateData,
        contributionDetails: mergedContribution,
        potentialDetails: mergedPotential,
        contributionScore: contribution.score,
        contributionClass: contribution.scoreClass,
        potentialScore: potential.score,
        potentialClass: potential.scoreClass,
        valueCategory: `${contribution.scoreClass}${potential.scoreClass}`,
        importanceLevel,
        recommendedAttentionLevel,
        heatIndex,
        heatStatus,
        updatedAt: new Date(),
      })
      .where(eq(contacts.id, id))
      .returning();

    return updated;
  }

  async deleteContact(id: string): Promise<boolean> {
    const result = await db.delete(contacts).where(eq(contacts.id, id)).returning();
    return result.length > 0;
  }

  async getInteractions(contactId: string): Promise<Interaction[]> {
    return await db.select()
      .from(interactions)
      .where(eq(interactions.contactId, contactId))
      .orderBy(desc(interactions.date));
  }

  async getInteraction(id: string): Promise<Interaction | undefined> {
    const [interaction] = await db.select().from(interactions).where(eq(interactions.id, id));
    return interaction;
  }

  async createInteraction(insertInteraction: InsertInteraction): Promise<Interaction> {
    const [interaction] = await db.insert(interactions).values(insertInteraction).returning();
    
    if (interaction.isMeaningful) {
      await this.updateLastContactDate(insertInteraction.contactId, insertInteraction.date);
    }
    
    return interaction;
  }

  async deleteInteraction(id: string): Promise<boolean> {
    const interaction = await this.getInteraction(id);
    if (!interaction) return false;
    
    const result = await db.delete(interactions).where(eq(interactions.id, id)).returning();
    
    if (result.length > 0 && interaction.isMeaningful) {
      await this.recalculateContactMetrics(interaction.contactId);
    }
    
    return result.length > 0;
  }

  private async updateLastContactDate(contactId: string, date: string): Promise<void> {
    const contact = await this.getContact(contactId);
    if (!contact) return;

    const currentLastContact = contact.lastContactDate;
    const newDate = new Date(date);
    
    if (!currentLastContact || newDate > new Date(currentLastContact)) {
      await this.updateContact(contactId, { lastContactDate: date });
    }
  }

  async recalculateContactMetrics(contactId: string): Promise<Contact | undefined> {
    const contact = await this.getContact(contactId);
    if (!contact) return undefined;

    const meaningfulInteractions = await db.select()
      .from(interactions)
      .where(and(
        eq(interactions.contactId, contactId),
        eq(interactions.isMeaningful, true)
      ))
      .orderBy(desc(interactions.date));

    const lastMeaningful = meaningfulInteractions[0];
    const lastContactDate = lastMeaningful?.date || null;

    return await this.updateContact(contactId, { 
      lastContactDate: lastContactDate ? String(lastContactDate) : null,
    });
  }

  async recalculateAllContactMetrics(teamId: string): Promise<void> {
    const allContacts = await this.getContacts(teamId);
    for (const contact of allContacts) {
      await this.recalculateContactMetrics(contact.id);
    }
  }

  async migrateContributionData(teamId: string): Promise<void> {
    const allContacts = await this.getContacts(teamId);
    for (const contact of allContacts) {
      const details = contact.contributionDetails as { 
        financial?: number; network?: number; tactical?: number; 
        strategic?: number; loyalty?: number; trust?: number;
        emotional?: number; intellectual?: number;
      } | null;
      
      if (details && (!('trust' in details) || !('emotional' in details) || !('intellectual' in details))) {
        const trustValue = 'trust' in details ? (details.trust || 0) : 
          Math.min(3, Math.round(((details.tactical || 0) + (details.strategic || 0) + (details.loyalty || 0)) / 3));
        const newDetails = { 
          financial: details.financial || 0, 
          network: details.network || 0, 
          trust: trustValue,
          emotional: details.emotional || 0,
          intellectual: details.intellectual || 0,
        };
        await this.updateContact(contact.id, { contributionDetails: newDetails });
      }
    }
  }

  // Backup operations
  async getBackups(teamId: string): Promise<Backup[]> {
    return await db.select()
      .from(backups)
      .where(eq(backups.teamId, teamId))
      .orderBy(desc(backups.createdAt));
  }

  async getBackup(id: string): Promise<Backup | undefined> {
    const [backup] = await db.select().from(backups).where(eq(backups.id, id));
    return backup;
  }

  async createBackup(teamId: string, userId: string, description?: string): Promise<Backup> {
    const teamContacts = await this.getContacts(teamId);
    
    const allInteractions: Interaction[] = [];
    for (const contact of teamContacts) {
      const contactInteractions = await this.getInteractions(contact.id);
      allInteractions.push(...contactInteractions);
    }

    const [backup] = await db.insert(backups).values({
      teamId,
      createdBy: userId,
      description: description || `Автоматический бекап - ${new Date().toLocaleDateString('ru-RU')}`,
      contactsCount: teamContacts.length,
      interactionsCount: allInteractions.length,
      data: {
        contacts: teamContacts,
        interactions: allInteractions,
      },
    }).returning();

    return backup;
  }

  async restoreBackup(backupId: string): Promise<boolean> {
    const backup = await this.getBackup(backupId);
    if (!backup || !backup.data) return false;

    const { contacts: backupContacts, interactions: backupInteractions } = backup.data;

    await db.delete(contacts).where(eq(contacts.teamId, backup.teamId));

    for (const contactData of backupContacts) {
      const { id, createdAt, updatedAt, ...insertData } = contactData;
      await db.insert(contacts).values({
        ...insertData,
        id,
        createdAt: new Date(createdAt),
        updatedAt: new Date(),
      });
    }

    for (const interactionData of backupInteractions) {
      const { id, createdAt, updatedAt, ...insertData } = interactionData;
      await db.insert(interactions).values({
        ...insertData,
        id,
        createdAt: new Date(createdAt),
        updatedAt: new Date(),
      });
    }

    return true;
  }

  async deleteBackup(id: string): Promise<boolean> {
    const result = await db.delete(backups).where(eq(backups.id, id)).returning();
    return result.length > 0;
  }

  async deleteOldBackups(teamId: string, keepCount: number): Promise<number> {
    const allBackups = await this.getBackups(teamId);
    
    if (allBackups.length <= keepCount) return 0;

    const toDelete = allBackups.slice(keepCount);
    let deletedCount = 0;

    for (const backup of toDelete) {
      const deleted = await this.deleteBackup(backup.id);
      if (deleted) deletedCount++;
    }

    return deletedCount;
  }

  // Attachment operations
  async getAttachments(contactId: string): Promise<Attachment[]> {
    return db.select().from(attachments)
      .where(eq(attachments.contactId, contactId))
      .orderBy(desc(attachments.createdAt));
  }

  async getAttachmentsByCategory(contactId: string, category: string): Promise<Attachment[]> {
    return db.select().from(attachments)
      .where(and(
        eq(attachments.contactId, contactId),
        eq(attachments.category, category)
      ))
      .orderBy(desc(attachments.createdAt));
  }

  async getAttachment(id: string): Promise<Attachment | undefined> {
    const [attachment] = await db.select().from(attachments).where(eq(attachments.id, id));
    return attachment;
  }

  async createAttachment(attachment: InsertAttachment): Promise<Attachment> {
    const [created] = await db.insert(attachments).values(attachment).returning();
    return created;
  }

  async deleteAttachment(id: string): Promise<boolean> {
    const result = await db.delete(attachments).where(eq(attachments.id, id)).returning();
    return result.length > 0;
  }

  // Connection operations for relationship graph
  async getConnections(teamId: string): Promise<ContactConnection[]> {
    return db.select().from(contactConnections)
      .where(eq(contactConnections.teamId, teamId))
      .orderBy(desc(contactConnections.createdAt));
  }

  async getContactConnections(contactId: string, teamId: string): Promise<ContactConnection[]> {
    return db.select().from(contactConnections)
      .where(and(
        eq(contactConnections.teamId, teamId),
        or(
          eq(contactConnections.fromContactId, contactId),
          eq(contactConnections.toContactId, contactId)
        )
      ))
      .orderBy(desc(contactConnections.createdAt));
  }

  async getConnection(id: string, teamId: string): Promise<ContactConnection | undefined> {
    const [connection] = await db.select().from(contactConnections)
      .where(and(
        eq(contactConnections.id, id),
        eq(contactConnections.teamId, teamId)
      ));
    return connection;
  }

  async checkDuplicateConnection(fromContactId: string, toContactId: string, teamId: string): Promise<boolean> {
    const [existing] = await db.select({ id: contactConnections.id })
      .from(contactConnections)
      .where(and(
        eq(contactConnections.teamId, teamId),
        or(
          and(
            eq(contactConnections.fromContactId, fromContactId),
            eq(contactConnections.toContactId, toContactId)
          ),
          and(
            eq(contactConnections.fromContactId, toContactId),
            eq(contactConnections.toContactId, fromContactId)
          )
        )
      ))
      .limit(1);
    return !!existing;
  }

  async createConnection(connection: InsertContactConnection): Promise<ContactConnection> {
    const [created] = await db.insert(contactConnections).values(connection).returning();
    return created;
  }

  async updateConnection(id: string, data: Pick<InsertContactConnection, "connectionType" | "strength" | "notes">, teamId: string): Promise<ContactConnection | undefined> {
    const safeData: { connectionType?: string; strength?: number; notes?: string | null; updatedAt: Date } = {
      updatedAt: new Date()
    };
    if (data.connectionType !== undefined) safeData.connectionType = data.connectionType;
    if (data.strength !== undefined) safeData.strength = data.strength;
    if (data.notes !== undefined) safeData.notes = data.notes;
    
    const [updated] = await db
      .update(contactConnections)
      .set(safeData)
      .where(and(
        eq(contactConnections.id, id),
        eq(contactConnections.teamId, teamId)
      ))
      .returning();
    return updated;
  }

  async deleteConnection(id: string, teamId: string): Promise<boolean> {
    const result = await db.delete(contactConnections)
      .where(and(
        eq(contactConnections.id, id),
        eq(contactConnections.teamId, teamId)
      ))
      .returning();
    return result.length > 0;
  }

  // Gift operations
  async getGifts(teamId: string): Promise<Gift[]> {
    return db.select().from(gifts)
      .where(eq(gifts.teamId, teamId))
      .orderBy(desc(gifts.date));
  }

  async getContactGifts(contactId: string, teamId: string): Promise<Gift[]> {
    return db.select().from(gifts)
      .where(and(
        eq(gifts.contactId, contactId),
        eq(gifts.teamId, teamId)
      ))
      .orderBy(desc(gifts.date));
  }

  async getGift(id: string, teamId: string): Promise<Gift | undefined> {
    const [gift] = await db.select().from(gifts)
      .where(and(
        eq(gifts.id, id),
        eq(gifts.teamId, teamId)
      ));
    return gift;
  }

  async createGift(gift: InsertGift): Promise<Gift> {
    const [created] = await db.insert(gifts).values(gift).returning();
    return created;
  }

  async updateGift(id: string, data: Partial<InsertGift>, teamId: string): Promise<Gift | undefined> {
    const safeData: Partial<InsertGift> & { updatedAt: Date } = {
      ...data,
      updatedAt: new Date()
    };
    
    const [updated] = await db
      .update(gifts)
      .set(safeData)
      .where(and(
        eq(gifts.id, id),
        eq(gifts.teamId, teamId)
      ))
      .returning();
    return updated;
  }

  async deleteGift(id: string, teamId: string): Promise<boolean> {
    const result = await db.delete(gifts)
      .where(and(
        eq(gifts.id, id),
        eq(gifts.teamId, teamId)
      ))
      .returning();
    return result.length > 0;
  }

  // Purchase operations
  async getPurchases(teamId: string): Promise<Purchase[]> {
    return db.select().from(purchases)
      .where(eq(purchases.teamId, teamId))
      .orderBy(desc(purchases.purchasedAt));
  }

  async getContactPurchases(contactId: string, teamId: string): Promise<Purchase[]> {
    return db.select().from(purchases)
      .where(and(
        eq(purchases.contactId, contactId),
        eq(purchases.teamId, teamId)
      ))
      .orderBy(desc(purchases.purchasedAt));
  }

  async getPurchase(id: string, teamId: string): Promise<Purchase | undefined> {
    const [purchase] = await db.select().from(purchases)
      .where(and(
        eq(purchases.id, id),
        eq(purchases.teamId, teamId)
      ));
    return purchase;
  }

  async createPurchase(purchase: InsertPurchase): Promise<Purchase> {
    const [created] = await db.insert(purchases).values(purchase).returning();
    
    // Recalculate purchase totals and update financial score
    await this.recalculatePurchaseTotals(purchase.contactId, purchase.teamId);
    
    return created;
  }

  async updatePurchase(id: string, data: Partial<InsertPurchase>, teamId: string): Promise<Purchase | undefined> {
    const existing = await this.getPurchase(id, teamId);
    if (!existing) return undefined;
    
    const safeData: Partial<InsertPurchase> & { updatedAt: Date } = {
      ...data,
      updatedAt: new Date()
    };
    
    const [updated] = await db
      .update(purchases)
      .set(safeData)
      .where(and(
        eq(purchases.id, id),
        eq(purchases.teamId, teamId)
      ))
      .returning();
    
    // Recalculate purchase totals and update financial score
    await this.recalculatePurchaseTotals(existing.contactId, teamId);
    
    return updated;
  }

  async deletePurchase(id: string, teamId: string): Promise<boolean> {
    const existing = await this.getPurchase(id, teamId);
    if (!existing) return false;
    
    const result = await db.delete(purchases)
      .where(and(
        eq(purchases.id, id),
        eq(purchases.teamId, teamId)
      ))
      .returning();
    
    if (result.length > 0) {
      // Recalculate purchase totals and update financial score
      await this.recalculatePurchaseTotals(existing.contactId, teamId);
    }
    
    return result.length > 0;
  }

  async recalculatePurchaseTotals(contactId: string, teamId: string): Promise<void> {
    // Get all purchases for this contact
    const contactPurchases = await this.getContactPurchases(contactId, teamId);
    
    // Calculate totals with defensive checks
    // Only count valid amounts (positive, finite numbers)
    let totalAmount = 0;
    let validCount = 0;
    let lastPurchaseDate: string | null = null;
    
    for (const purchase of contactPurchases) {
      const amount = purchase.amount;
      // Only count valid positive finite amounts
      if (typeof amount === 'number' && isFinite(amount) && amount > 0) {
        totalAmount += amount;
        validCount++;
      }
      if (!lastPurchaseDate || (purchase.purchasedAt && purchase.purchasedAt > lastPurchaseDate)) {
        lastPurchaseDate = purchase.purchasedAt;
      }
    }
    
    const purchaseTotals: PurchaseTotals = {
      totalAmount,
      currency: "USD",
      count: validCount,
      lastPurchaseDate,
    };
    
    // Calculate financial score based on total amount
    const financialScore = calculateFinancialScore(totalAmount);
    
    // Get current contact to update contribution details
    const contact = await this.getContact(contactId, teamId);
    if (!contact) return;
    
    const currentContribution = contact.contributionDetails as {
      financial: number;
      network: number;
      trust: number;
      emotional: number;
      intellectual: number;
    } || { financial: 0, network: 0, trust: 0, emotional: 0, intellectual: 0 };
    
    // Update contact with new purchase totals and financial score
    await db.update(contacts)
      .set({
        purchaseTotals,
        contributionDetails: {
          ...currentContribution,
          financial: financialScore,
        },
        updatedAt: new Date(),
      })
      .where(eq(contacts.id, contactId));
    
    // Recalculate overall contact metrics (this will recalculate contribution score, class, etc.)
    await this.updateContact(contactId, {
      contributionDetails: {
        ...currentContribution,
        financial: financialScore,
      },
    });
  }

  // Contribution operations (all criterion types)
  async getContributions(teamId: string): Promise<Contribution[]> {
    return db.select()
      .from(contributions)
      .where(eq(contributions.teamId, teamId))
      .orderBy(desc(contributions.contributedAt));
  }

  async getContactContributions(contactId: string, teamId: string): Promise<Contribution[]> {
    return db.select()
      .from(contributions)
      .where(and(
        eq(contributions.contactId, contactId),
        eq(contributions.teamId, teamId)
      ))
      .orderBy(desc(contributions.contributedAt));
  }

  async getContribution(id: string, teamId: string): Promise<Contribution | undefined> {
    const [contribution] = await db.select()
      .from(contributions)
      .where(and(
        eq(contributions.id, id),
        eq(contributions.teamId, teamId)
      ));
    return contribution;
  }

  async createContribution(contribution: InsertContribution): Promise<Contribution> {
    const [created] = await db.insert(contributions).values({
      ...contribution,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    
    // Recalculate contribution totals for the contact
    await this.recalculateContributionTotals(contribution.contactId, contribution.teamId);
    
    return created;
  }

  async updateContribution(id: string, data: Partial<InsertContribution>, teamId: string): Promise<Contribution | undefined> {
    const existing = await this.getContribution(id, teamId);
    if (!existing) return undefined;
    
    const [updated] = await db.update(contributions)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(
        eq(contributions.id, id),
        eq(contributions.teamId, teamId)
      ))
      .returning();
    
    if (updated) {
      await this.recalculateContributionTotals(updated.contactId, teamId);
    }
    
    return updated;
  }

  async deleteContribution(id: string, teamId: string): Promise<boolean> {
    const existing = await this.getContribution(id, teamId);
    if (!existing) return false;
    
    const result = await db.delete(contributions)
      .where(and(
        eq(contributions.id, id),
        eq(contributions.teamId, teamId)
      ))
      .returning();
    
    if (result.length > 0) {
      await this.recalculateContributionTotals(existing.contactId, teamId);
    }
    
    return result.length > 0;
  }

  async recalculateContributionTotals(contactId: string, teamId: string): Promise<void> {
    // Get all contributions for this contact
    const contactContributions = await this.getContactContributions(contactId, teamId);
    
    // Get current contact to preserve existing details
    const contact = await this.getContact(contactId, teamId);
    if (!contact) return;
    
    const currentDetails = (contact.contributionDetails as { 
      financial?: number; 
      network?: number; 
      trust?: number;
      emotional?: number;
      intellectual?: number;
    }) || {};
    
    // Calculate totals per criterion type
    const totals: { [key: string]: { totalAmount: number; currency: string; count: number; lastDate: string | null } } = {};
    
    // New contribution details - reset scores for criteria without contributions
    const newDetails: { 
      financial: number; 
      network: number; 
      trust: number;
      emotional: number;
      intellectual: number;
    } = {
      financial: currentDetails.financial || 0,
      network: 0,
      trust: 0,
      emotional: 0,
      intellectual: 0,
    };
    
    for (const criterionType of contributionCriteriaTypes) {
      const criterionContributions = contactContributions.filter(c => c.criterionType === criterionType);
      
      let totalAmount = 0;
      let count = 0;
      let lastDate: string | null = null;
      
      for (const contribution of criterionContributions) {
        // Count all contributions
        count++;
        
        // Sum amounts for monetary contributions
        if (contribution.amount && typeof contribution.amount === 'number' && isFinite(contribution.amount) && contribution.amount > 0) {
          totalAmount += contribution.amount;
        }
        
        // Track last contribution date
        if (!lastDate || (contribution.contributedAt && contribution.contributedAt > lastDate)) {
          lastDate = contribution.contributedAt;
        }
      }
      
      if (count > 0) {
        totals[criterionType] = {
          totalAmount,
          currency: "USD",
          count,
          lastDate,
        };
        
        // Preserve existing score for criteria with contributions
        if (criterionType !== 'financial') {
          const key = criterionType as keyof typeof newDetails;
          newDetails[key] = currentDetails[key] || 0;
        }
      }
      // If count === 0, the score stays 0 (already set in newDetails initialization)
    }
    
    // Calculate new contribution score and class
    const { score, scoreClass } = calculateContributionScoreAndClass(newDetails);
    
    // Update contact with new contribution totals and reset details for empty criteria
    await db.update(contacts)
      .set({
        contributionTotals: totals,
        contributionDetails: newDetails,
        contributionScore: score,
        contributionClass: scoreClass,
        updatedAt: new Date(),
      })
      .where(eq(contacts.id, contactId));
  }
}

export const storage = new DatabaseStorage();
