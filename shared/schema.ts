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
}, (table) => [
  index("idx_team_members_team_id").on(table.teamId),
  index("idx_team_members_user_id").on(table.userId),
]);

export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = typeof teamMembers.$inferInsert;

// Type definitions for structured contact data
export type PhoneEntry = {
  type: "mobile" | "work" | "home" | "other";
  number: string;
  label?: string;
};

export type MessengerEntry = {
  platform: "telegram" | "whatsapp" | "viber" | "signal" | "wechat" | "other";
  username: string;
  label?: string;
};

export type SocialAccountEntry = {
  platform: "instagram" | "facebook" | "linkedin" | "twitter" | "vk" | "youtube" | "tiktok" | "other";
  url: string;
  label?: string;
};

export type EmailEntry = {
  type: "personal" | "work" | "other";
  email: string;
  label?: string;
};

export type FamilyMember = {
  name: string;
  relation: "spouse" | "child" | "parent" | "sibling" | "other";
  birthday?: string;
  notes?: string;
};

export type FamilyEvent = {
  title: string;
  date: string;
  notes?: string;
};

export type FamilyStatus = {
  maritalStatus?: "single" | "married" | "divorced" | "widowed" | "partnership";
  members: FamilyMember[];
  events: FamilyEvent[];
  notes?: string;
};

// Staff/Team member types (assistants, drivers, etc.)
export type StaffPhone = {
  type: "mobile" | "work" | "other";
  number: string;
};

export type StaffMessenger = {
  platform: "telegram" | "whatsapp" | "viber" | "other";
  username: string;
};

export type StaffMember = {
  name: string;
  role: "assistant" | "driver" | "secretary" | "manager" | "security" | "other";
  roleCustom?: string;
  phones: StaffPhone[];
  messengers: StaffMessenger[];
  notes?: string;
};

export const contacts = pgTable("contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").references(() => teams.id, { onDelete: "cascade" }),
  createdBy: varchar("created_by").references(() => users.id),
  updatedBy: varchar("updated_by").references(() => users.id),
  
  // Name fields
  firstName: text("first_name"),
  lastName: text("last_name"),
  patronymic: text("patronymic"),
  fullName: text("full_name").notNull(), // Computed: lastName + firstName + patronymic
  shortName: text("short_name"),
  
  // Avatar
  avatarUrl: text("avatar_url"),
  
  // Company info
  company: text("company"),
  companyRole: text("company_role"),
  
  // Contact methods (legacy single fields kept for backwards compatibility)
  phone: text("phone"),
  email: text("email"),
  
  // Structured contact methods
  phones: jsonb("phones").$type<PhoneEntry[]>().default([]),
  emails: jsonb("emails").$type<EmailEntry[]>().default([]),
  messengers: jsonb("messengers").$type<MessengerEntry[]>().default([]),
  socialAccounts: jsonb("social_accounts").$type<SocialAccountEntry[]>().default([]),
  
  // Legacy field (deprecated, use socialAccounts instead)
  socialLinks: jsonb("social_links").$type<string[]>().default([]),
  
  // Family information
  familyStatus: jsonb("family_status").$type<FamilyStatus>().default({ members: [], events: [] }),
  
  // Staff/Team (assistants, drivers, etc.)
  staffMembers: jsonb("staff_members").$type<StaffMember[]>().default([]),
  
  // Interests
  hobbies: text("hobbies"),
  preferences: text("preferences"),
  importantDates: text("important_dates"),
  giftPreferences: text("gift_preferences"),
  otherInterests: text("other_interests"),
  
  // Tags
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
    emotional: number;
    intellectual: number;
  }>().default({ financial: 0, network: 0, trust: 0, emotional: 0, intellectual: 0 }),
  
  potentialDetails: jsonb("potential_details").$type<{
    personal: number;
    resources: number;
    network: number;
    synergy: number;
    systemRole: number;
  }>().default({ personal: 0, resources: 0, network: 0, synergy: 0, systemRole: 0 }),
  
  // Purchase totals (calculated from purchases table)
  purchaseTotals: jsonb("purchase_totals").$type<{
    totalAmount: number;
    currency: string;
    count: number;
    lastPurchaseDate: string | null;
  }>().default({ totalAmount: 0, currency: "RUB", count: 0, lastPurchaseDate: null }),
  
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
}, (table) => [
  index("idx_contacts_team_id").on(table.teamId),
  index("idx_contacts_heat_status").on(table.heatStatus),
  index("idx_contacts_importance_level").on(table.importanceLevel),
]);

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
}, (table) => [
  index("idx_interactions_contact_id").on(table.contactId),
  index("idx_interactions_date").on(table.date),
]);

// AI Insights cache table for offline/PWA support
export const aiInsightsCache = pgTable("ai_insights_cache", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contactId: varchar("contact_id").references(() => contacts.id, { onDelete: "cascade" }), // nullable for team-wide cache
  teamId: varchar("team_id").references(() => teams.id, { onDelete: "cascade" }),
  insightType: varchar("insight_type", { length: 30 }).notNull(), // 'insights', 'recommendations', 'summary', 'dashboard', 'analytics'
  data: jsonb("data").notNull(),
  modelUsed: varchar("model_used", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"), // When the cache should be invalidated
}, (table) => [
  index("idx_ai_cache_contact_id").on(table.contactId),
  index("idx_ai_cache_team_id").on(table.teamId),
  index("idx_ai_cache_insight_type").on(table.insightType),
]);

export type AIInsightsCache = typeof aiInsightsCache.$inferSelect;
export type InsertAIInsightsCache = typeof aiInsightsCache.$inferInsert;

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
}, (table) => [
  index("idx_backups_team_id").on(table.teamId),
]);

export type Backup = typeof backups.$inferSelect;
export type InsertBackup = typeof backups.$inferInsert;

// Attachments table for file uploads
export const attachments = pgTable("attachments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contactId: varchar("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  teamId: varchar("team_id").references(() => teams.id, { onDelete: "cascade" }),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  
  category: varchar("category", { length: 30 }).notNull(), // personal, family, team, work, documents, hobbies, gifts, preferences, dates, notes, other
  subCategory: varchar("sub_category", { length: 50 }), // e.g., "child_photo", "driver_photo", "contract"
  
  fileName: varchar("file_name", { length: 255 }).notNull(),
  originalName: varchar("original_name", { length: 255 }).notNull(),
  fileType: varchar("file_type", { length: 100 }).notNull(), // MIME type
  fileSize: integer("file_size").notNull(), // in bytes
  storagePath: varchar("storage_path", { length: 500 }).notNull(), // path in object storage
  
  description: text("description"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_attachments_contact_id").on(table.contactId),
  index("idx_attachments_team_id").on(table.teamId),
  index("idx_attachments_category").on(table.category),
]);

export type Attachment = typeof attachments.$inferSelect;
export type InsertAttachment = typeof attachments.$inferInsert;

export const insertAttachmentSchema = createInsertSchema(attachments).omit({
  id: true,
  createdAt: true,
}).extend({
  contactId: z.string().min(1),
  teamId: z.string().optional(),
  uploadedBy: z.string().optional(),
  category: z.enum(["personal", "family", "team", "work", "documents", "hobbies", "gifts", "preferences", "dates", "notes", "other"]),
  subCategory: z.string().optional(),
  fileName: z.string().min(1),
  originalName: z.string().min(1),
  fileType: z.string().min(1),
  fileSize: z.number().min(0),
  storagePath: z.string().min(1),
  description: z.string().optional(),
});

// Contact connections table for relationship graph
export const connectionTypes = [
  "friend", "colleague", "partner", "family", "client", "mentor", "classmate", "neighbor", "acquaintance", "other"
] as const;

export type ConnectionType = typeof connectionTypes[number];

export const contactConnections = pgTable("contact_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  fromContactId: varchar("from_contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  toContactId: varchar("to_contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  connectionType: varchar("connection_type", { length: 30 }).notNull().default("acquaintance"),
  strength: integer("strength").notNull().default(1), // 1-5 relationship strength
  notes: text("notes"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_connections_team_id").on(table.teamId),
  index("idx_connections_from_contact").on(table.fromContactId),
  index("idx_connections_to_contact").on(table.toContactId),
]);

export type ContactConnection = typeof contactConnections.$inferSelect;
export type InsertContactConnection = typeof contactConnections.$inferInsert;

export const insertContactConnectionSchema = createInsertSchema(contactConnections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  teamId: z.string().min(1),
  fromContactId: z.string().min(1),
  toContactId: z.string().min(1),
  connectionType: z.enum(connectionTypes).default("acquaintance"),
  strength: z.number().min(1).max(5).default(1),
  notes: z.string().optional(),
  createdBy: z.string().optional(),
});

// Gift occasions
export const giftOccasions = [
  "birthday", "new_year", "anniversary", "holiday", "business", "thank_you", "apology", "no_occasion", "other"
] as const;

export type GiftOccasion = typeof giftOccasions[number];

// Gifts table
export const gifts = pgTable("gifts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  contactId: varchar("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  createdBy: varchar("created_by").references(() => users.id),
  
  title: text("title").notNull(),
  description: text("description"),
  amount: real("amount"), // approximate cost
  currency: varchar("currency", { length: 10 }).default("RUB"),
  direction: varchar("direction", { length: 10 }).notNull(), // "given" or "received"
  occasion: varchar("occasion", { length: 30 }).default("no_occasion"),
  date: date("date").notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_gifts_team_id").on(table.teamId),
  index("idx_gifts_contact_id").on(table.contactId),
  index("idx_gifts_date").on(table.date),
  index("idx_gifts_direction").on(table.direction),
]);

export type Gift = typeof gifts.$inferSelect;
export type InsertGift = typeof gifts.$inferInsert;

export const insertGiftSchema = createInsertSchema(gifts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  teamId: z.string().min(1),
  contactId: z.string().min(1),
  createdBy: z.string().optional(),
  title: z.string().min(1, "Название подарка обязательно"),
  description: z.string().optional().nullable(),
  amount: z.number().min(0).optional().nullable(),
  currency: z.string().default("USD"),
  direction: z.enum(["given", "received"]),
  occasion: z.enum(giftOccasions).default("no_occasion"),
  date: z.string().min(1, "Дата обязательна"),
});

export const updateGiftSchema = z.object({
  title: z.string().min(1, "Название подарка обязательно").optional(),
  description: z.string().optional().nullable(),
  amount: z.number().min(0).optional().nullable(),
  currency: z.string().optional(),
  direction: z.enum(["given", "received"]).optional(),
  occasion: z.enum(giftOccasions).optional(),
  date: z.string().optional(),
});

// Product categories for purchases
export const productCategories = [
  "consulting", "training", "software", "hardware", "subscription", "service", "product", "other"
] as const;

export type ProductCategory = typeof productCategories[number];

// Purchase totals stored on contact
export type PurchaseTotals = {
  totalAmount: number;
  currency: string;
  count: number;
  lastPurchaseDate: string | null;
};

// Purchases table
export const purchases = pgTable("purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  contactId: varchar("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  createdBy: varchar("created_by").references(() => users.id),
  
  productName: text("product_name").notNull(),
  category: varchar("category", { length: 30 }).default("product"),
  amount: real("amount").notNull(),
  currency: varchar("currency", { length: 10 }).default("RUB"),
  purchasedAt: date("purchased_at").notNull(),
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_purchases_team_id").on(table.teamId),
  index("idx_purchases_contact_id").on(table.contactId),
  index("idx_purchases_date").on(table.purchasedAt),
]);

export type Purchase = typeof purchases.$inferSelect;
export type InsertPurchase = typeof purchases.$inferInsert;

export const supportedCurrencies = ["RUB", "USD", "EUR", "KZT"] as const;

export const insertPurchaseSchema = createInsertSchema(purchases).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  teamId: z.string().min(1),
  contactId: z.string().min(1),
  createdBy: z.string().optional(),
  productName: z.string().min(1, "Название продукта обязательно"),
  category: z.enum(productCategories).default("product"),
  amount: z.number().finite().min(0.01, "Сумма должна быть положительной"),
  currency: z.enum(supportedCurrencies).default("RUB"),
  purchasedAt: z.string().min(1, "Дата покупки обязательна"),
  notes: z.string().optional().nullable(),
});

export const updatePurchaseSchema = z.object({
  productName: z.string().min(1, "Название продукта обязательно").optional(),
  category: z.enum(productCategories).optional(),
  amount: z.number().finite().min(0.01, "Сумма должна быть положительной").optional(),
  currency: z.enum(supportedCurrencies).optional(),
  purchasedAt: z.string().optional(),
  notes: z.string().optional().nullable(),
});

// Financial score thresholds (in RUB)
export const FINANCIAL_SCORE_THRESHOLDS = {
  SCORE_0: 0,        // 0₽ = 0 баллов
  SCORE_1: 100000,   // <100k = 1 балл
  SCORE_2: 500000,   // <500k = 2 балла
  SCORE_3: 500000,   // ≥500k = 3 балла
} as const;

export function calculateFinancialScore(totalAmount: number): number {
  if (totalAmount >= FINANCIAL_SCORE_THRESHOLDS.SCORE_3) return 3;
  if (totalAmount >= FINANCIAL_SCORE_THRESHOLDS.SCORE_1) return 2;
  if (totalAmount > FINANCIAL_SCORE_THRESHOLDS.SCORE_0) return 1;
  return 0;
}

const contributionDetailsSchema = z.object({
  financial: z.number().min(0).max(3).default(0),
  network: z.number().min(0).max(3).default(0),
  trust: z.number().min(0).max(3).default(0),
  emotional: z.number().min(0).max(3).default(0),
  intellectual: z.number().min(0).max(3).default(0),
});

const potentialDetailsSchema = z.object({
  personal: z.number().min(0).max(3).default(0),
  resources: z.number().min(0).max(3).default(0),
  network: z.number().min(0).max(3).default(0),
  synergy: z.number().min(0).max(3).default(0),
  systemRole: z.number().min(0).max(3).default(0),
});

const phoneEntrySchema = z.object({
  type: z.enum(["mobile", "work", "home", "other"]),
  number: z.string(),
  label: z.string().optional(),
});

const messengerEntrySchema = z.object({
  platform: z.enum(["telegram", "whatsapp", "viber", "signal", "wechat", "other"]),
  username: z.string(),
  label: z.string().optional(),
});

const socialAccountEntrySchema = z.object({
  platform: z.enum(["instagram", "facebook", "linkedin", "twitter", "vk", "youtube", "tiktok", "other"]),
  url: z.string(),
  label: z.string().optional(),
});

const emailEntrySchema = z.object({
  type: z.enum(["personal", "work", "other"]),
  email: z.string().refine(val => val === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
    message: "Неверный формат email"
  }),
  label: z.string().optional(),
});

const familyMemberSchema = z.object({
  name: z.string(),
  relation: z.enum(["spouse", "child", "parent", "sibling", "other"]),
  birthday: z.string().optional(),
  notes: z.string().optional(),
});

const familyEventSchema = z.object({
  title: z.string(),
  date: z.string(),
  notes: z.string().optional(),
});

const familyStatusSchema = z.object({
  maritalStatus: z.enum(["single", "married", "divorced", "widowed", "partnership"]).optional(),
  members: z.array(familyMemberSchema).default([]),
  events: z.array(familyEventSchema).default([]),
  notes: z.string().optional(),
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
  
  // Name fields
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  patronymic: z.string().optional(),
  fullName: z.string().min(1, "Имя обязательно"),
  shortName: z.string().optional().nullable(),
  
  // Company info
  company: z.string().optional().nullable(),
  companyRole: z.string().optional().nullable(),
  
  // Contact methods
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  phones: z.array(phoneEntrySchema).default([]),
  emails: z.array(emailEntrySchema).default([]),
  messengers: z.array(messengerEntrySchema).default([]),
  socialAccounts: z.array(socialAccountEntrySchema).default([]),
  socialLinks: z.array(z.string()).default([]),
  
  // Family info
  familyStatus: familyStatusSchema.default({ members: [], events: [] }),
  
  // Tags
  tags: z.array(z.string()).default([]),
  roleTags: z.array(z.string()).default([]),
  
  // Scoring
  contributionDetails: contributionDetailsSchema.default({ financial: 0, network: 0, trust: 0, emotional: 0, intellectual: 0 }),
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

export function getClassFromScore(score: number, maxScore: number = 15): string {
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
