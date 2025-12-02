import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, boolean, date, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Teams table
export const teams = pgTable("teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  inviteCode: varchar("invite_code", { length: 20 }).notNull().unique(),
  ownerId: varchar("owner_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Team = typeof teams.$inferSelect;
export type InsertTeam = typeof teams.$inferInsert;

// Team members table
export const teamMembers = pgTable("team_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).notNull().default("member"), // owner, admin, member
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = typeof teamMembers.$inferInsert;

export const contacts = pgTable("contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").references(() => teams.id, { onDelete: "cascade" }),
  createdBy: varchar("created_by").references(() => users.id),
  updatedBy: varchar("updated_by").references(() => users.id),
  fullName: text("full_name").notNull(),
  shortName: text("short_name"),
  phone: text("phone"),
  email: text("email"),
  socialLinks: jsonb("social_links").$type<string[]>().default([]),
  tags: jsonb("tags").$type<string[]>().default([]),
  roleTags: jsonb("role_tags").$type<string[]>().default([]),
  
  contributionScore: integer("contribution_score").notNull().default(0),
  potentialScore: integer("potential_score").notNull().default(0),
  contributionClass: varchar("contribution_class", { length: 1 }).notNull().default("D"),
  potentialClass: varchar("potential_class", { length: 1 }).notNull().default("D"),
  valueCategory: varchar("value_category", { length: 2 }).notNull().default("DD"),
  
  contributionDetails: jsonb("contribution_details").$type<{
    financial: number;
    network: number;
    trust: number;
  }>().default({ financial: 0, network: 0, trust: 0 }),
  
  potentialDetails: jsonb("potential_details").$type<{
    personal: number;
    resources: number;
    network: number;
    synergy: number;
    systemRole: number;
  }>().default({ personal: 0, resources: 0, network: 0, synergy: 0, systemRole: 0 }),
  
  importanceLevel: varchar("importance_level", { length: 1 }).notNull().default("C"),
  recommendedAttentionLevel: integer("recommended_attention_level").notNull().default(2),
  attentionLevel: integer("attention_level").notNull().default(1),
  desiredFrequencyDays: integer("desired_frequency_days").notNull().default(30),
  
  lastContactDate: date("last_contact_date"),
  responseQuality: integer("response_quality").notNull().default(2),
  relationshipEnergy: integer("relationship_energy").notNull().default(3),
  attentionTrend: integer("attention_trend").notNull().default(0),
  
  heatIndex: real("heat_index").notNull().default(0.5),
  heatStatus: varchar("heat_status", { length: 10 }).notNull().default("yellow"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const interactions = pgTable("interactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contactId: varchar("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  createdBy: varchar("created_by").references(() => users.id),
  date: date("date").notNull(),
  type: varchar("type", { length: 20 }).notNull(),
  channel: varchar("channel", { length: 20 }).notNull(),
  note: text("note"),
  isMeaningful: boolean("is_meaningful").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Backups table for daily automatic backups
export const backups = pgTable("backups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  createdBy: varchar("created_by").references(() => users.id),
  description: text("description"),
  contactsCount: integer("contacts_count").notNull().default(0),
  interactionsCount: integer("interactions_count").notNull().default(0),
  data: jsonb("data").$type<{
    contacts: any[];
    interactions: any[];
  }>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Backup = typeof backups.$inferSelect;
export type InsertBackup = typeof backups.$inferInsert;

const contributionDetailsSchema = z.object({
  financial: z.number().min(0).max(3).default(0),
  network: z.number().min(0).max(3).default(0),
  trust: z.number().min(0).max(3).default(0),
});

const potentialDetailsSchema = z.object({
  personal: z.number().min(0).max(3).default(0),
  resources: z.number().min(0).max(3).default(0),
  network: z.number().min(0).max(3).default(0),
  synergy: z.number().min(0).max(3).default(0),
  systemRole: z.number().min(0).max(3).default(0),
});

// Team schemas
export const insertTeamSchema = createInsertSchema(teams).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(1, "Название команды обязательно"),
  inviteCode: z.string().min(6, "Код должен быть минимум 6 символов"),
  ownerId: z.string().min(1),
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
  joinedAt: true,
}).extend({
  teamId: z.string().min(1),
  userId: z.string().min(1),
  role: z.enum(["owner", "admin", "member"]).default("member"),
});

export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  contributionScore: true,
  potentialScore: true,
  contributionClass: true,
  potentialClass: true,
  valueCategory: true,
  recommendedAttentionLevel: true,
  heatIndex: true,
  heatStatus: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  teamId: z.string().optional(),
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
  fullName: z.string().min(1, "Имя обязательно"),
  socialLinks: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  roleTags: z.array(z.string()).default([]),
  contributionDetails: contributionDetailsSchema.default({ financial: 0, network: 0, trust: 0 }),
  potentialDetails: potentialDetailsSchema.default({ personal: 0, resources: 0, network: 0, synergy: 0, systemRole: 0 }),
  importanceLevel: z.enum(["A", "B", "C"]).default("C"),
  attentionLevel: z.number().min(1).max(10).default(1),
  desiredFrequencyDays: z.number().min(1).default(30),
  responseQuality: z.number().min(0).max(3).default(2),
  relationshipEnergy: z.number().min(1).max(5).default(3),
  attentionTrend: z.number().min(-1).max(1).default(0),
  lastContactDate: z.string().nullable().optional(),
});

export const insertInteractionSchema = createInsertSchema(interactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  contactId: z.string().min(1),
  createdBy: z.string().optional(),
  date: z.string().min(1),
  type: z.enum(["call", "meeting", "message", "event", "gift", "intro", "other"]),
  channel: z.enum(["phone", "telegram", "whatsapp", "email", "offline", "other"]),
  note: z.string().optional(),
  isMeaningful: z.boolean().default(false),
});

export type InsertContact = z.infer<typeof insertContactSchema>;
export type Contact = typeof contacts.$inferSelect;
export type InsertInteraction = z.infer<typeof insertInteractionSchema>;
export type Interaction = typeof interactions.$inferSelect;

export function getRecommendedAttentionLevel(importanceLevel: string): number {
  switch (importanceLevel) {
    case "A": return 8;
    case "B": return 5;
    case "C": return 2;
    default: return 2;
  }
}

export function getAttentionGapStatus(actual: number, recommended: number): "green" | "yellow" | "red" {
  const gap = recommended - actual;
  if (gap <= 0) return "green";
  if (gap <= 2) return "yellow";
  return "red";
}

export function getClassFromScore(score: number, maxScore: number = 9): string {
  if (maxScore === 15) {
    if (score >= 12) return "A";
    if (score >= 8) return "B";
    if (score >= 4) return "C";
    return "D";
  }
  if (score >= 7) return "A";
  if (score >= 5) return "B";
  if (score >= 2) return "C";
  return "D";
}

export function calculateHeatIndex(
  daysSinceLastContact: number,
  desiredFrequencyDays: number,
  responseQuality: number,
  relationshipEnergy: number,
  attentionTrend: number
): { heatIndex: number; heatStatus: "green" | "yellow" | "red" } {
  const ratio = daysSinceLastContact / (2.0 * desiredFrequencyDays);
  let R = 1.0 - ratio;
  if (R < 0) R = 0;
  if (R > 1) R = 1;

  const Q = responseQuality / 3.0;
  const E = (relationshipEnergy - 1) / 4.0;
  
  let T = 0.5;
  if (attentionTrend === -1) T = 0.0;
  else if (attentionTrend === 1) T = 1.0;

  const heatIndex = 0.4 * R + 0.3 * E + 0.2 * Q + 0.1 * T;

  let heatStatus: "green" | "yellow" | "red";
  if (heatIndex >= 0.70) {
    heatStatus = "green";
  } else if (heatIndex >= 0.40) {
    heatStatus = "yellow";
  } else {
    heatStatus = "red";
  }

  if (daysSinceLastContact > 3 * desiredFrequencyDays) {
    heatStatus = "red";
  }

  if (
    daysSinceLastContact <= 0.5 * desiredFrequencyDays &&
    relationshipEnergy >= 4 &&
    responseQuality >= 2
  ) {
    heatStatus = "green";
  }

  return { heatIndex: Math.round(heatIndex * 100) / 100, heatStatus };
}
