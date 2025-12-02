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
  contacts, 
  interactions,
  users,
  teams,
  teamMembers,
  backups,
  attachments,
  getClassFromScore,
  calculateHeatIndex,
  getRecommendedAttentionLevel,
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
}

function calculateScoresAndClass(details: { 
  financial?: number; 
  network?: number; 
  trust?: number;
} | { 
  personal?: number; 
  resources?: number; 
  network?: number; 
  synergy?: number; 
  systemRole?: number; 
}, maxScore: number = 9): { score: number; scoreClass: string } {
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
    const contribution = calculateScoresAndClass(insertContact.contributionDetails || {}, 9);
    const potential = calculateScoresAndClass(insertContact.potentialDetails || {}, 15);
    
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

    const defaultContribution = { financial: 0, network: 0, trust: 0 };
    const defaultPotential = { personal: 0, resources: 0, network: 0, synergy: 0, systemRole: 0 };
    
    const existingContribution = existing.contributionDetails as { 
      financial?: number; network?: number; tactical?: number; 
      strategic?: number; loyalty?: number; trust?: number 
    } | null;
    
    let baseContribution = defaultContribution;
    if (existingContribution) {
      if ('trust' in existingContribution) {
        baseContribution = { 
          financial: existingContribution.financial || 0, 
          network: existingContribution.network || 0, 
          trust: existingContribution.trust || 0 
        };
      } else {
        const trustValue = Math.min(3, Math.round(((existingContribution.tactical || 0) + (existingContribution.strategic || 0) + (existingContribution.loyalty || 0)) / 3));
        baseContribution = { 
          financial: existingContribution.financial || 0, 
          network: existingContribution.network || 0, 
          trust: trustValue 
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

    const contribution = calculateScoresAndClass(mergedContribution, 9);
    const potential = calculateScoresAndClass(mergedPotential, 15);

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
        strategic?: number; loyalty?: number; trust?: number 
      } | null;
      
      if (details && !('trust' in details)) {
        const trustValue = Math.min(3, Math.round(((details.tactical || 0) + (details.strategic || 0) + (details.loyalty || 0)) / 3));
        const newDetails = { 
          financial: details.financial || 0, 
          network: details.network || 0, 
          trust: trustValue 
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
}

export const storage = new DatabaseStorage();
