import { 
  type Contact, 
  type InsertContact, 
  type Interaction,
  type InsertInteraction,
  contacts, 
  interactions,
  getClassFromScore,
  calculateHeatIndex,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, ilike, or, sql } from "drizzle-orm";

export interface IStorage {
  getContacts(): Promise<Contact[]>;
  getContact(id: string): Promise<Contact | undefined>;
  createContact(contact: InsertContact): Promise<Contact>;
  updateContact(id: string, contact: Partial<InsertContact>): Promise<Contact | undefined>;
  deleteContact(id: string): Promise<boolean>;
  
  getInteractions(contactId: string): Promise<Interaction[]>;
  getInteraction(id: string): Promise<Interaction | undefined>;
  createInteraction(interaction: InsertInteraction): Promise<Interaction>;
  deleteInteraction(id: string): Promise<boolean>;
  
  recalculateContactMetrics(contactId: string): Promise<Contact | undefined>;
  recalculateAllContactMetrics(): Promise<void>;
}

function calculateScoresAndClass(details: { 
  financial?: number; 
  network?: number; 
  tactical?: number; 
  strategic?: number; 
  loyalty?: number; 
} | { 
  personal?: number; 
  resources?: number; 
  network?: number; 
  synergy?: number; 
  systemRole?: number; 
}): { score: number; scoreClass: string } {
  const values = Object.values(details || {});
  const score = values.reduce((sum, val) => sum + (val || 0), 0);
  const scoreClass = getClassFromScore(score);
  return { score, scoreClass };
}

export class DatabaseStorage implements IStorage {
  async getContacts(): Promise<Contact[]> {
    return await db.select().from(contacts).orderBy(desc(contacts.heatIndex));
  }

  async getContact(id: string): Promise<Contact | undefined> {
    const [contact] = await db.select().from(contacts).where(eq(contacts.id, id));
    return contact;
  }

  async createContact(insertContact: InsertContact): Promise<Contact> {
    const contribution = calculateScoresAndClass(insertContact.contributionDetails || {});
    const potential = calculateScoresAndClass(insertContact.potentialDetails || {});
    
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

    const [contact] = await db.insert(contacts).values({
      ...insertContact,
      contributionScore: contribution.score,
      contributionClass: contribution.scoreClass,
      potentialScore: potential.score,
      potentialClass: potential.scoreClass,
      valueCategory: `${contribution.scoreClass}${potential.scoreClass}`,
      heatIndex,
      heatStatus,
    }).returning();
    
    return contact;
  }

  async updateContact(id: string, updateData: Partial<InsertContact>): Promise<Contact | undefined> {
    const existing = await this.getContact(id);
    if (!existing) return undefined;

    const defaultContribution = { financial: 0, network: 0, tactical: 0, strategic: 0, loyalty: 0 };
    const defaultPotential = { personal: 0, resources: 0, network: 0, synergy: 0, systemRole: 0 };
    
    const mergedContribution = {
      ...defaultContribution,
      ...existing.contributionDetails,
      ...updateData.contributionDetails,
    };
    const mergedPotential = {
      ...defaultPotential,
      ...existing.potentialDetails,
      ...updateData.potentialDetails,
    };

    const contribution = calculateScoresAndClass(mergedContribution);
    const potential = calculateScoresAndClass(mergedPotential);

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
      lastContactDate: lastContactDate ? String(lastContactDate) : null 
    });
  }

  async recalculateAllContactMetrics(): Promise<void> {
    const allContacts = await this.getContacts();
    for (const contact of allContacts) {
      await this.recalculateContactMetrics(contact.id);
    }
  }
}

export const storage = new DatabaseStorage();
