import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { insertContactSchema, insertInteractionSchema, insertTeamSchema, insertAttachmentSchema, insertContactConnectionSchema, insertGiftSchema, updateGiftSchema, insertPurchaseSchema, updatePurchaseSchema, teams, aiInsightsCache } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { 
  generateContactInsights, 
  generateContactRecommendations, 
  summarizeInteractions, 
  getAIModelInfo,
  type ContactContext 
} from "./services/ai";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { eq, and, gt } from "drizzle-orm";

declare global {
  namespace Express {
    interface User {
      claims: {
        sub: string;
        email?: string;
        first_name?: string;
        last_name?: string;
        profile_image_url?: string;
      };
      access_token: string;
      refresh_token: string;
      expires_at: number;
    }
  }
}

function getUserId(req: Request): string {
  return (req.user as any)?.claims?.sub || "";
}

async function getCurrentTeamId(req: Request): Promise<string | null> {
  const userId = getUserId(req);
  if (!userId) return null;
  
  const teamIdFromHeader = req.headers["x-team-id"] as string;
  if (teamIdFromHeader) {
    const member = await storage.getTeamMember(teamIdFromHeader, userId);
    if (member) return teamIdFromHeader;
  }
  
  const teams = await storage.getUserTeams(userId);
  return teams.length > 0 ? teams[0].id : null;
}

// Strict team ID validation for secure endpoints (attachments, etc.)
// Returns teamId only if user has verified membership, null otherwise
async function getVerifiedTeamId(req: Request): Promise<string | null> {
  const userId = getUserId(req);
  if (!userId) return null;
  
  // Get teamId from header or default
  const teamId = await getCurrentTeamId(req);
  if (!teamId) return null;
  
  // Always verify current membership
  const member = await storage.getTeamMember(teamId, userId);
  return member ? teamId : null;
}

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  await setupAuth(app);

  app.get("/api/auth/user", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      const teams = await storage.getUserTeams(userId);
      res.json({ ...user, teams });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.get("/api/teams", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const teams = await storage.getUserTeams(userId);
      res.json(teams);
    } catch (error) {
      console.error("Error fetching teams:", error);
      res.status(500).json({ error: "Failed to fetch teams" });
    }
  });

  app.post("/api/teams", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { name } = req.body;
      
      if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: "Team name is required" });
      }
      
      const inviteCode = generateInviteCode();
      const team = await storage.createTeam({
        name: name.trim(),
        inviteCode,
        ownerId: userId,
      });
      
      res.status(201).json(team);
    } catch (error) {
      console.error("Error creating team:", error);
      res.status(500).json({ error: "Failed to create team" });
    }
  });

  app.get("/api/teams/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const teamId = req.params.id;
      
      const member = await storage.getTeamMember(teamId, userId);
      if (!member) {
        return res.status(403).json({ error: "Not a team member" });
      }
      
      const team = await storage.getTeam(teamId);
      const members = await storage.getTeamMembers(teamId);
      
      res.json({ ...team, members });
    } catch (error) {
      console.error("Error fetching team:", error);
      res.status(500).json({ error: "Failed to fetch team" });
    }
  });

  app.post("/api/teams/join", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { inviteCode } = req.body;
      
      if (!inviteCode) {
        return res.status(400).json({ error: "Invite code is required" });
      }
      
      const team = await storage.getTeamByInviteCode(inviteCode.toUpperCase().trim());
      if (!team) {
        return res.status(404).json({ error: "Invalid invite code" });
      }
      
      const existingMember = await storage.getTeamMember(team.id, userId);
      if (existingMember) {
        return res.status(400).json({ error: "Already a member of this team" });
      }
      
      await storage.addTeamMember({
        teamId: team.id,
        userId,
        role: "member",
      });
      
      res.json({ message: "Joined team successfully", team });
    } catch (error) {
      console.error("Error joining team:", error);
      res.status(500).json({ error: "Failed to join team" });
    }
  });

  app.delete("/api/teams/:id/members/:userId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUserId = getUserId(req);
      const { id: teamId, userId: targetUserId } = req.params;
      
      const currentMember = await storage.getTeamMember(teamId, currentUserId);
      if (!currentMember || (currentMember.role !== "owner" && currentMember.role !== "admin" && currentUserId !== targetUserId)) {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      const targetMember = await storage.getTeamMember(teamId, targetUserId);
      if (targetMember?.role === "owner") {
        return res.status(400).json({ error: "Cannot remove team owner" });
      }
      
      await storage.removeTeamMember(teamId, targetUserId);
      res.json({ message: "Member removed" });
    } catch (error) {
      console.error("Error removing member:", error);
      res.status(500).json({ error: "Failed to remove member" });
    }
  });

  app.post("/api/teams/:id/regenerate-code", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const teamId = req.params.id;
      
      const member = await storage.getTeamMember(teamId, userId);
      if (!member || (member.role !== "owner" && member.role !== "admin")) {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      const newCode = generateInviteCode();
      const team = await storage.updateTeam(teamId, { inviteCode: newCode });
      
      res.json(team);
    } catch (error) {
      console.error("Error regenerating code:", error);
      res.status(500).json({ error: "Failed to regenerate code" });
    }
  });

  app.get("/api/contacts", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const teamId = await getCurrentTeamId(req);
      if (!teamId) {
        return res.json([]);
      }
      const contacts = await storage.getContacts(teamId);
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      res.status(500).json({ error: "Failed to fetch contacts" });
    }
  });

  app.get("/api/contacts/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const teamId = await getCurrentTeamId(req);
      const contact = await storage.getContact(req.params.id, teamId || undefined);
      if (!contact) {
        return res.status(404).json({ error: "Contact not found" });
      }
      res.json(contact);
    } catch (error) {
      console.error("Error fetching contact:", error);
      res.status(500).json({ error: "Failed to fetch contact" });
    }
  });

  app.post("/api/contacts", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const teamId = await getCurrentTeamId(req);
      
      if (!teamId) {
        return res.status(400).json({ error: "You must be a member of a team to create contacts. Please create or join a team first." });
      }
      
      // Filter out empty emails, phones, messengers before validation
      let bodyData = { ...req.body };
      if (bodyData.emails && Array.isArray(bodyData.emails)) {
        bodyData.emails = bodyData.emails.filter((e: { email?: string }) => e.email && e.email.trim() !== "");
      }
      if (bodyData.phones && Array.isArray(bodyData.phones)) {
        bodyData.phones = bodyData.phones.filter((p: { number?: string }) => p.number && p.number.trim() !== "");
      }
      if (bodyData.messengers && Array.isArray(bodyData.messengers)) {
        bodyData.messengers = bodyData.messengers.filter((m: { username?: string }) => m.username && m.username.trim() !== "");
      }
      
      const data = insertContactSchema.parse({
        ...bodyData,
        teamId,
        createdBy: userId,
        updatedBy: userId,
      });
      const contact = await storage.createContact(data);
      res.status(201).json(contact);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ error: validationError.message });
      }
      console.error("Error creating contact:", error);
      res.status(500).json({ error: "Failed to create contact" });
    }
  });

  app.patch("/api/contacts/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const teamId = await getCurrentTeamId(req);
      
      const existing = await storage.getContact(req.params.id, teamId || undefined);
      if (!existing) {
        return res.status(404).json({ error: "Contact not found" });
      }
      
      // Normalize avatarUrl if present
      let bodyData = { ...req.body };
      if (bodyData.avatarUrl) {
        const objectStorageService = new ObjectStorageService();
        const normalizedPath = objectStorageService.normalizeObjectEntityPath(bodyData.avatarUrl);
        if (normalizedPath) {
          bodyData.avatarUrl = normalizedPath;
        }
      }
      
      // Filter out empty emails, phones, messengers before validation
      if (bodyData.emails && Array.isArray(bodyData.emails)) {
        bodyData.emails = bodyData.emails.filter((e: { email?: string }) => e.email && e.email.trim() !== "");
      }
      if (bodyData.phones && Array.isArray(bodyData.phones)) {
        bodyData.phones = bodyData.phones.filter((p: { number?: string }) => p.number && p.number.trim() !== "");
      }
      if (bodyData.messengers && Array.isArray(bodyData.messengers)) {
        bodyData.messengers = bodyData.messengers.filter((m: { username?: string }) => m.username && m.username.trim() !== "");
      }
      
      const partialSchema = insertContactSchema.partial();
      const data = partialSchema.parse({
        ...bodyData,
        updatedBy: userId,
      });
      const contact = await storage.updateContact(req.params.id, data);
      res.json(contact);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ error: validationError.message });
      }
      console.error("Error updating contact:", error);
      res.status(500).json({ error: "Failed to update contact" });
    }
  });

  // Get avatar image for contact
  app.get("/api/contacts/:id/avatar", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const teamId = await getCurrentTeamId(req);
      const contact = await storage.getContact(req.params.id, teamId || undefined);
      
      if (!contact) {
        return res.status(404).json({ error: "Contact not found" });
      }
      
      if (!contact.avatarUrl) {
        return res.status(404).json({ error: "No avatar" });
      }
      
      const objectStorageService = new ObjectStorageService();
      
      // Generate signed URL for the avatar
      const signedUrl = await objectStorageService.getSignedDownloadURL(contact.avatarUrl, 3600);
      
      res.json({ url: signedUrl, expires: new Date(Date.now() + 3600 * 1000).toISOString() });
    } catch (error) {
      console.error("Error getting avatar:", error);
      res.status(500).json({ error: "Failed to get avatar" });
    }
  });

  app.delete("/api/contacts/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const teamId = await getCurrentTeamId(req);
      
      const existing = await storage.getContact(req.params.id, teamId || undefined);
      if (!existing) {
        return res.status(404).json({ error: "Contact not found" });
      }
      
      await storage.deleteContact(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting contact:", error);
      res.status(500).json({ error: "Failed to delete contact" });
    }
  });

  app.get("/api/contacts/:contactId/interactions", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const teamId = await getCurrentTeamId(req);
      const contact = await storage.getContact(req.params.contactId, teamId || undefined);
      if (!contact) {
        return res.status(404).json({ error: "Contact not found" });
      }
      
      const interactions = await storage.getInteractions(req.params.contactId);
      res.json(interactions);
    } catch (error) {
      console.error("Error fetching interactions:", error);
      res.status(500).json({ error: "Failed to fetch interactions" });
    }
  });

  app.post("/api/contacts/:contactId/interactions", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const teamId = await getCurrentTeamId(req);
      const contact = await storage.getContact(req.params.contactId, teamId || undefined);
      if (!contact) {
        return res.status(404).json({ error: "Contact not found" });
      }
      
      const userId = getUserId(req);
      const data = insertInteractionSchema.parse({
        ...req.body,
        contactId: req.params.contactId,
        createdBy: userId,
      });
      const interaction = await storage.createInteraction(data);
      res.status(201).json(interaction);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ error: validationError.message });
      }
      console.error("Error creating interaction:", error);
      res.status(500).json({ error: "Failed to create interaction" });
    }
  });

  app.delete("/api/interactions/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const teamId = await getCurrentTeamId(req);
      
      const interaction = await storage.getInteraction(req.params.id);
      if (!interaction) {
        return res.status(404).json({ error: "Interaction not found" });
      }
      
      const contact = await storage.getContact(interaction.contactId, teamId || undefined);
      if (!contact) {
        return res.status(404).json({ error: "Contact not found" });
      }
      
      await storage.deleteInteraction(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting interaction:", error);
      res.status(500).json({ error: "Failed to delete interaction" });
    }
  });

  app.post("/api/recalculate", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const teamId = await getCurrentTeamId(req);
      if (!teamId) {
        return res.status(400).json({ error: "No team found" });
      }
      await storage.recalculateAllContactMetrics(teamId);
      res.json({ message: "All contacts recalculated successfully" });
    } catch (error) {
      console.error("Error recalculating metrics:", error);
      res.status(500).json({ error: "Failed to recalculate metrics" });
    }
  });

  app.get("/api/export/json", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const teamId = await getCurrentTeamId(req);
      if (!teamId) {
        return res.json([]);
      }
      const contacts = await storage.getContacts(teamId);
      const exportData = contacts.map(contact => ({
        fullName: contact.fullName,
        shortName: contact.shortName,
        phone: contact.phone,
        email: contact.email,
        socialLinks: contact.socialLinks,
        tags: contact.tags,
        roleTags: contact.roleTags,
        contributionDetails: contact.contributionDetails,
        potentialDetails: contact.potentialDetails,
        importanceLevel: contact.importanceLevel,
        attentionLevel: contact.attentionLevel,
        desiredFrequencyDays: contact.desiredFrequencyDays,
        lastContactDate: contact.lastContactDate,
        responseQuality: contact.responseQuality,
        relationshipEnergy: contact.relationshipEnergy,
        attentionTrend: contact.attentionTrend,
      }));
      
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="contacts-${new Date().toISOString().split('T')[0]}.json"`);
      res.json(exportData);
    } catch (error) {
      console.error("Error exporting contacts:", error);
      res.status(500).json({ error: "Failed to export contacts" });
    }
  });

  app.get("/api/export/csv", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const teamId = await getCurrentTeamId(req);
      if (!teamId) {
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.send("");
        return;
      }
      const contacts = await storage.getContacts(teamId);
      
      const headers = [
        "fullName", "shortName", "phone", "email", "socialLinks", "tags", "roleTags",
        "importanceLevel", "attentionLevel", "desiredFrequencyDays", "lastContactDate",
        "responseQuality", "relationshipEnergy", "attentionTrend",
        "contribution_financial", "contribution_network", "contribution_trust", 
        "contribution_emotional", "contribution_intellectual",
        "potential_personal", "potential_resources", "potential_network",
        "potential_synergy", "potential_systemRole"
      ];
      
      const escapeCSV = (value: string | null | undefined) => {
        if (value === null || value === undefined) return "";
        const str = String(value);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };
      
      const rows = contacts.map(contact => {
        const rawContrib = contact.contributionDetails as { 
          financial?: number; network?: number; trust?: number;
          emotional?: number; intellectual?: number;
        } | null;
        
        let contrib = { financial: 0, network: 0, trust: 0, emotional: 0, intellectual: 0 };
        if (rawContrib) {
          contrib = { 
            financial: rawContrib.financial || 0, 
            network: rawContrib.network || 0, 
            trust: rawContrib.trust || 0,
            emotional: rawContrib.emotional || 0,
            intellectual: rawContrib.intellectual || 0,
          };
        }
        
        const pot = contact.potentialDetails || { personal: 0, resources: 0, network: 0, synergy: 0, systemRole: 0 };
        
        return [
          escapeCSV(contact.fullName),
          escapeCSV(contact.shortName),
          escapeCSV(contact.phone),
          escapeCSV(contact.email),
          escapeCSV((contact.socialLinks || []).join(";")),
          escapeCSV((contact.tags || []).join(";")),
          escapeCSV((contact.roleTags || []).join(";")),
          escapeCSV(contact.importanceLevel),
          String(contact.attentionLevel),
          String(contact.desiredFrequencyDays),
          escapeCSV(contact.lastContactDate),
          String(contact.responseQuality),
          String(contact.relationshipEnergy),
          String(contact.attentionTrend),
          String(contrib.financial),
          String(contrib.network),
          String(contrib.trust),
          String(contrib.emotional),
          String(contrib.intellectual),
          String(pot.personal),
          String(pot.resources),
          String(pot.network),
          String(pot.synergy),
          String(pot.systemRole),
        ].join(",");
      });
      
      const csv = [headers.join(","), ...rows].join("\n");
      
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="contacts-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send("\uFEFF" + csv);
    } catch (error) {
      console.error("Error exporting contacts:", error);
      res.status(500).json({ error: "Failed to export contacts" });
    }
  });

  app.post("/api/contacts/bulk-delete", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const teamId = await getCurrentTeamId(req);
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "No contact IDs provided" });
      }
      
      let deleted = 0;
      for (const id of ids) {
        const contact = await storage.getContact(id, teamId || undefined);
        if (contact) {
          const result = await storage.deleteContact(id);
          if (result) deleted++;
        }
      }
      
      res.json({ message: `Deleted ${deleted} contacts`, deleted });
    } catch (error) {
      console.error("Error bulk deleting contacts:", error);
      res.status(500).json({ error: "Failed to delete contacts" });
    }
  });

  app.post("/api/contacts/bulk-update", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const teamId = await getCurrentTeamId(req);
      const { ids, updates } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "No contact IDs provided" });
      }
      
      const partialSchema = insertContactSchema.partial();
      const validUpdates = partialSchema.parse({ ...updates, updatedBy: userId });
      
      let updated = 0;
      for (const id of ids) {
        const contact = await storage.getContact(id, teamId || undefined);
        if (contact) {
          const result = await storage.updateContact(id, validUpdates);
          if (result) updated++;
        }
      }
      
      res.json({ message: `Updated ${updated} contacts`, updated });
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ error: validationError.message });
      }
      console.error("Error bulk updating contacts:", error);
      res.status(500).json({ error: "Failed to update contacts" });
    }
  });

  app.post("/api/import", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const teamId = await getCurrentTeamId(req);
      
      if (!teamId) {
        return res.status(400).json({ error: "You must be a member of a team to import contacts. Please create or join a team first." });
      }
      
      const { contacts: importContacts } = req.body;
      
      if (!Array.isArray(importContacts)) {
        return res.status(400).json({ error: "Invalid import data: expected an array of contacts" });
      }
      
      const results = { success: 0, failed: 0, errors: [] as string[] };
      
      for (const contactData of importContacts) {
        try {
          const validData = insertContactSchema.parse({
            fullName: contactData.fullName,
            shortName: contactData.shortName || null,
            phone: contactData.phone || null,
            email: contactData.email || null,
            teamId,
            createdBy: userId,
            updatedBy: userId,
            socialLinks: Array.isArray(contactData.socialLinks) 
              ? contactData.socialLinks 
              : (contactData.socialLinks ? String(contactData.socialLinks).split(";").filter(Boolean) : []),
            tags: Array.isArray(contactData.tags) 
              ? contactData.tags 
              : (contactData.tags ? String(contactData.tags).split(";").filter(Boolean) : []),
            roleTags: Array.isArray(contactData.roleTags) 
              ? contactData.roleTags 
              : (contactData.roleTags ? String(contactData.roleTags).split(";").filter(Boolean) : []),
            importanceLevel: ["A", "B", "C"].includes(contactData.importanceLevel) ? contactData.importanceLevel : "C",
            attentionLevel: Number(contactData.attentionLevel) || 1,
            desiredFrequencyDays: Number(contactData.desiredFrequencyDays) || 30,
            lastContactDate: contactData.lastContactDate || null,
            responseQuality: Number(contactData.responseQuality) || 2,
            relationshipEnergy: Number(contactData.relationshipEnergy) || 3,
            attentionTrend: Number(contactData.attentionTrend) || 0,
            contributionDetails: contactData.contributionDetails || {
              financial: Number(contactData.contribution_financial) || 0,
              network: Number(contactData.contribution_network) || 0,
              trust: Number(contactData.contribution_trust) || 0,
              emotional: Number(contactData.contribution_emotional) || 0,
              intellectual: Number(contactData.contribution_intellectual) || 0,
            },
            potentialDetails: contactData.potentialDetails || {
              personal: Number(contactData.potential_personal) || 0,
              resources: Number(contactData.potential_resources) || 0,
              network: Number(contactData.potential_network) || 0,
              synergy: Number(contactData.potential_synergy) || 0,
              systemRole: Number(contactData.potential_systemRole) || 0,
            },
          });
          
          await storage.createContact(validData);
          results.success++;
        } catch (error) {
          results.failed++;
          if (error instanceof ZodError) {
            const validationError = fromZodError(error);
            results.errors.push(`${contactData.fullName || 'Unknown'}: ${validationError.message}`);
          } else {
            results.errors.push(`${contactData.fullName || 'Unknown'}: ${String(error)}`);
          }
        }
      }
      
      res.json({
        message: `Import completed: ${results.success} success, ${results.failed} failed`,
        ...results
      });
    } catch (error) {
      console.error("Error importing contacts:", error);
      res.status(500).json({ error: "Failed to import contacts" });
    }
  });

  // Backup endpoints
  app.get("/api/backups", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const teamId = await getCurrentTeamId(req);
      if (!teamId) {
        return res.json([]);
      }
      const backupsList = await storage.getBackups(teamId);
      res.json(backupsList);
    } catch (error) {
      console.error("Error fetching backups:", error);
      res.status(500).json({ error: "Failed to fetch backups" });
    }
  });

  app.post("/api/backups", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const teamId = await getCurrentTeamId(req);
      
      if (!teamId) {
        return res.status(400).json({ error: "You must be a member of a team to create backups" });
      }
      
      const { description } = req.body;
      const backup = await storage.createBackup(teamId, userId, description);
      
      // Keep only last 30 backups (daily backups for a month)
      await storage.deleteOldBackups(teamId, 30);
      
      res.status(201).json(backup);
    } catch (error) {
      console.error("Error creating backup:", error);
      res.status(500).json({ error: "Failed to create backup" });
    }
  });

  app.post("/api/backups/:id/restore", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const teamId = await getCurrentTeamId(req);
      const backupId = req.params.id;
      
      if (!teamId) {
        return res.status(400).json({ error: "No team found" });
      }
      
      // Verify backup belongs to user's team
      const backup = await storage.getBackup(backupId);
      if (!backup || backup.teamId !== teamId) {
        return res.status(404).json({ error: "Backup not found" });
      }
      
      // Check if user is owner or admin (only they can restore)
      const member = await storage.getTeamMember(teamId, userId);
      if (!member || (member.role !== "owner" && member.role !== "admin")) {
        return res.status(403).json({ error: "Only team owner or admin can restore backups" });
      }
      
      // Create a backup before restoring (safety measure)
      await storage.createBackup(teamId, userId, `Автобекап перед восстановлением`);
      
      const success = await storage.restoreBackup(backupId);
      if (success) {
        res.json({ message: "Backup restored successfully" });
      } else {
        res.status(500).json({ error: "Failed to restore backup" });
      }
    } catch (error) {
      console.error("Error restoring backup:", error);
      res.status(500).json({ error: "Failed to restore backup" });
    }
  });

  app.delete("/api/backups/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const teamId = await getCurrentTeamId(req);
      const backupId = req.params.id;
      
      if (!teamId) {
        return res.status(400).json({ error: "No team found" });
      }
      
      // Verify backup belongs to user's team
      const backup = await storage.getBackup(backupId);
      if (!backup || backup.teamId !== teamId) {
        return res.status(404).json({ error: "Backup not found" });
      }
      
      // Check if user is owner or admin
      const member = await storage.getTeamMember(teamId, userId);
      if (!member || (member.role !== "owner" && member.role !== "admin")) {
        return res.status(403).json({ error: "Only team owner or admin can delete backups" });
      }
      
      await storage.deleteBackup(backupId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting backup:", error);
      res.status(500).json({ error: "Failed to delete backup" });
    }
  });

  // ============= AI ENDPOINTS =============
  
  // Get AI model info
  app.get("/api/ai/info", isAuthenticated, async (req: Request, res: Response) => {
    try {
      res.json(getAIModelInfo());
    } catch (error) {
      console.error("Error fetching AI info:", error);
      res.status(500).json({ error: "Failed to fetch AI info" });
    }
  });

  // Generate AI insights for a contact
  app.get("/api/ai/insights/:contactId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const teamId = await getCurrentTeamId(req);
      const contactId = req.params.contactId;
      const forceRefresh = req.query.refresh === "true";
      
      if (!teamId) {
        return res.status(400).json({ error: "No team found" });
      }
      
      // Verify contact belongs to user's team
      const contact = await storage.getContact(contactId);
      if (!contact || contact.teamId !== teamId) {
        return res.status(404).json({ error: "Contact not found" });
      }
      
      // Check cache first (valid for 24 hours)
      if (!forceRefresh) {
        const now = new Date();
        const cached = await db.select()
          .from(aiInsightsCache)
          .where(
            and(
              eq(aiInsightsCache.contactId, contactId),
              eq(aiInsightsCache.insightType, "insights"),
              gt(aiInsightsCache.expiresAt, now)
            )
          )
          .limit(1);
        
        if (cached.length > 0) {
          const cachedData = cached[0].data as Record<string, unknown>;
          return res.json({ 
            ...cachedData, 
            cached: true, 
            cachedAt: cached[0].createdAt,
            model: cached[0].modelUsed
          });
        }
      }
      
      // Get interactions for context
      const interactions = await storage.getInteractions(contactId);
      
      // Build contact context
      const contactContext: ContactContext = {
        fullName: contact.fullName,
        company: contact.company,
        companyRole: contact.companyRole,
        tags: contact.tags || [],
        roleTags: contact.roleTags || [],
        valueCategory: contact.valueCategory,
        importanceLevel: contact.importanceLevel,
        attentionLevel: contact.attentionLevel,
        heatStatus: contact.heatStatus,
        heatIndex: contact.heatIndex,
        lastContactDate: contact.lastContactDate,
        desiredFrequencyDays: contact.desiredFrequencyDays,
        hobbies: contact.hobbies,
        preferences: contact.preferences,
        giftPreferences: contact.giftPreferences,
        familyNotes: (contact.familyStatus as any)?.notes,
        interactionHistory: interactions.map(i => ({
          date: i.date,
          type: i.type,
          channel: i.channel,
          note: i.note,
          isMeaningful: i.isMeaningful,
        })),
      };
      
      // Generate new insights
      const insights = await generateContactInsights(contactContext);
      const modelInfo = getAIModelInfo();
      
      // Cache the result (expires in 24 hours)
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      // Delete old cache entries for this contact/type
      await db.delete(aiInsightsCache)
        .where(
          and(
            eq(aiInsightsCache.contactId, contactId),
            eq(aiInsightsCache.insightType, "insights")
          )
        );
      
      // Insert new cache entry
      await db.insert(aiInsightsCache).values({
        contactId,
        teamId,
        insightType: "insights",
        data: insights,
        modelUsed: modelInfo.model,
        expiresAt,
      });
      
      res.json({ ...insights, cached: false, model: modelInfo.model });
    } catch (error) {
      console.error("Error generating AI insights:", error);
      res.status(500).json({ error: "Failed to generate insights" });
    }
  });

  // Generate AI recommendations for a contact
  app.get("/api/ai/recommendations/:contactId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const teamId = await getCurrentTeamId(req);
      const contactId = req.params.contactId;
      const forceRefresh = req.query.refresh === "true";
      
      if (!teamId) {
        return res.status(400).json({ error: "No team found" });
      }
      
      // Verify contact belongs to user's team
      const contact = await storage.getContact(contactId);
      if (!contact || contact.teamId !== teamId) {
        return res.status(404).json({ error: "Contact not found" });
      }
      
      // Check cache first (valid for 12 hours for recommendations)
      if (!forceRefresh) {
        const now = new Date();
        const cached = await db.select()
          .from(aiInsightsCache)
          .where(
            and(
              eq(aiInsightsCache.contactId, contactId),
              eq(aiInsightsCache.insightType, "recommendations"),
              gt(aiInsightsCache.expiresAt, now)
            )
          )
          .limit(1);
        
        if (cached.length > 0) {
          const cachedData = cached[0].data as Record<string, unknown>;
          return res.json({ 
            ...cachedData, 
            cached: true, 
            cachedAt: cached[0].createdAt,
            model: cached[0].modelUsed
          });
        }
      }
      
      // Get interactions for context
      const interactions = await storage.getInteractions(contactId);
      
      // Build contact context
      const contactContext: ContactContext = {
        fullName: contact.fullName,
        company: contact.company,
        companyRole: contact.companyRole,
        tags: contact.tags || [],
        roleTags: contact.roleTags || [],
        heatStatus: contact.heatStatus,
        lastContactDate: contact.lastContactDate,
        desiredFrequencyDays: contact.desiredFrequencyDays,
        hobbies: contact.hobbies,
        preferences: contact.preferences,
        giftPreferences: contact.giftPreferences,
        interactionHistory: interactions.slice(0, 10).map(i => ({
          date: i.date,
          type: i.type,
          channel: i.channel,
          note: i.note,
          isMeaningful: i.isMeaningful,
        })),
      };
      
      // Generate recommendations
      const recommendations = await generateContactRecommendations(contactContext);
      const modelInfo = getAIModelInfo();
      
      // Cache the result (expires in 12 hours)
      const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000);
      
      // Delete old cache entries
      await db.delete(aiInsightsCache)
        .where(
          and(
            eq(aiInsightsCache.contactId, contactId),
            eq(aiInsightsCache.insightType, "recommendations")
          )
        );
      
      // Insert new cache entry
      await db.insert(aiInsightsCache).values({
        contactId,
        teamId,
        insightType: "recommendations",
        data: recommendations,
        modelUsed: modelInfo.model,
        expiresAt,
      });
      
      res.json({ ...recommendations, cached: false, model: modelInfo.model });
    } catch (error) {
      console.error("Error generating AI recommendations:", error);
      res.status(500).json({ error: "Failed to generate recommendations" });
    }
  });

  // Summarize interaction history
  app.get("/api/ai/summary/:contactId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const teamId = await getCurrentTeamId(req);
      const contactId = req.params.contactId;
      const forceRefresh = req.query.refresh === "true";
      
      if (!teamId) {
        return res.status(400).json({ error: "No team found" });
      }
      
      // Verify contact belongs to user's team
      const contact = await storage.getContact(contactId);
      if (!contact || contact.teamId !== teamId) {
        return res.status(404).json({ error: "Contact not found" });
      }
      
      // Check cache first (valid for 48 hours for summaries)
      if (!forceRefresh) {
        const now = new Date();
        const cached = await db.select()
          .from(aiInsightsCache)
          .where(
            and(
              eq(aiInsightsCache.contactId, contactId),
              eq(aiInsightsCache.insightType, "summary"),
              gt(aiInsightsCache.expiresAt, now)
            )
          )
          .limit(1);
        
        if (cached.length > 0) {
          return res.json({ 
            summary: (cached[0].data as any).summary, 
            cached: true, 
            cachedAt: cached[0].createdAt,
            model: cached[0].modelUsed
          });
        }
      }
      
      // Get interactions for summary
      const interactions = await storage.getInteractions(contactId);
      
      // Build contact context
      const contactContext: ContactContext = {
        fullName: contact.fullName,
        interactionHistory: interactions.map(i => ({
          date: i.date,
          type: i.type,
          channel: i.channel,
          note: i.note,
          isMeaningful: i.isMeaningful,
        })),
      };
      
      // Generate summary
      const summary = await summarizeInteractions(contactContext);
      const modelInfo = getAIModelInfo();
      
      // Cache the result (expires in 48 hours)
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
      
      // Delete old cache entries
      await db.delete(aiInsightsCache)
        .where(
          and(
            eq(aiInsightsCache.contactId, contactId),
            eq(aiInsightsCache.insightType, "summary")
          )
        );
      
      // Insert new cache entry
      await db.insert(aiInsightsCache).values({
        contactId,
        teamId,
        insightType: "summary",
        data: { summary },
        modelUsed: modelInfo.model,
        expiresAt,
      });
      
      res.json({ summary, cached: false, model: modelInfo.model });
    } catch (error) {
      console.error("Error generating AI summary:", error);
      res.status(500).json({ error: "Failed to generate summary" });
    }
  });

  // Invalidate AI cache for a contact (called when contact or interactions are updated)
  app.delete("/api/ai/cache/:contactId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const teamId = await getCurrentTeamId(req);
      const contactId = req.params.contactId;
      
      if (!teamId) {
        return res.status(400).json({ error: "No team found" });
      }
      
      // Verify contact belongs to user's team
      const contact = await storage.getContact(contactId);
      if (!contact || contact.teamId !== teamId) {
        return res.status(404).json({ error: "Contact not found" });
      }
      
      // Delete all cache entries for this contact
      await db.delete(aiInsightsCache)
        .where(eq(aiInsightsCache.contactId, contactId));
      
      res.status(204).send();
    } catch (error) {
      console.error("Error clearing AI cache:", error);
      res.status(500).json({ error: "Failed to clear cache" });
    }
  });

  // ============= TEAM-WIDE AI ENDPOINTS =============

  // Generate daily dashboard with AI priorities
  app.get("/api/ai/dashboard", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const teamId = await getCurrentTeamId(req);
      const forceRefresh = req.query.refresh === "true";
      
      if (!teamId) {
        return res.status(400).json({ error: "No team found" });
      }
      
      // Check cache first (valid for 4 hours)
      if (!forceRefresh) {
        const now = new Date();
        const cached = await db.select()
          .from(aiInsightsCache)
          .where(
            and(
              eq(aiInsightsCache.teamId, teamId),
              eq(aiInsightsCache.insightType, "dashboard"),
              gt(aiInsightsCache.expiresAt, now)
            )
          )
          .limit(1);
        
        if (cached.length > 0) {
          const cachedData = cached[0].data as Record<string, unknown>;
          return res.json({ 
            ...cachedData, 
            cached: true, 
            cachedAt: cached[0].createdAt,
            model: cached[0].modelUsed
          });
        }
      }
      
      // Get all contacts for the team
      const contacts = await storage.getContacts(teamId);
      
      // Build contact summaries
      const today = new Date();
      const contactSummaries = contacts.map(c => {
        const lastContact = c.lastContactDate ? new Date(c.lastContactDate) : null;
        const daysSince = lastContact 
          ? Math.floor((today.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24))
          : c.desiredFrequencyDays;
        
        return {
          fullName: c.fullName,
          company: c.company,
          heatStatus: c.heatStatus,
          heatIndex: c.heatIndex,
          importanceLevel: c.importanceLevel,
          valueCategory: c.valueCategory,
          lastContactDate: c.lastContactDate,
          desiredFrequencyDays: c.desiredFrequencyDays,
          daysOverdue: Math.max(0, daysSince - c.desiredFrequencyDays),
        };
      });
      
      // Generate dashboard
      const { generateDailyDashboard } = await import("./services/ai");
      const dashboard = await generateDailyDashboard(contactSummaries);
      const modelInfo = getAIModelInfo();
      
      // Cache the result (expires in 4 hours)
      const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000);
      
      // Delete old cache entries for this team's dashboard
      await db.delete(aiInsightsCache)
        .where(
          and(
            eq(aiInsightsCache.teamId, teamId),
            eq(aiInsightsCache.insightType, "dashboard")
          )
        );
      
      // Insert new cache entry
      await db.insert(aiInsightsCache).values({
        contactId: null,
        teamId,
        insightType: "dashboard",
        data: dashboard,
        modelUsed: modelInfo.model,
        expiresAt,
      });
      
      res.json({ ...dashboard, cached: false, model: modelInfo.model });
    } catch (error) {
      console.error("Error generating AI dashboard:", error);
      res.status(500).json({ error: "Failed to generate dashboard" });
    }
  });

  // Generate team analytics summary
  app.get("/api/ai/analytics", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const teamId = await getCurrentTeamId(req);
      const forceRefresh = req.query.refresh === "true";
      
      if (!teamId) {
        return res.status(400).json({ error: "No team found" });
      }
      
      // Check cache first (valid for 12 hours)
      if (!forceRefresh) {
        const now = new Date();
        const cached = await db.select()
          .from(aiInsightsCache)
          .where(
            and(
              eq(aiInsightsCache.teamId, teamId),
              eq(aiInsightsCache.insightType, "analytics"),
              gt(aiInsightsCache.expiresAt, now)
            )
          )
          .limit(1);
        
        if (cached.length > 0) {
          const cachedData = cached[0].data as Record<string, unknown>;
          return res.json({ 
            ...cachedData, 
            cached: true, 
            cachedAt: cached[0].createdAt,
            model: cached[0].modelUsed
          });
        }
      }
      
      // Get all contacts for the team
      const contacts = await storage.getContacts(teamId);
      
      // Build contact summaries
      const today = new Date();
      const contactSummaries = contacts.map(c => {
        const lastContact = c.lastContactDate ? new Date(c.lastContactDate) : null;
        const daysSince = lastContact 
          ? Math.floor((today.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24))
          : c.desiredFrequencyDays;
        
        return {
          fullName: c.fullName,
          company: c.company,
          heatStatus: c.heatStatus,
          heatIndex: c.heatIndex,
          importanceLevel: c.importanceLevel,
          valueCategory: c.valueCategory,
          lastContactDate: c.lastContactDate,
          desiredFrequencyDays: c.desiredFrequencyDays,
          daysOverdue: Math.max(0, daysSince - c.desiredFrequencyDays),
        };
      });
      
      // Generate analytics
      const { generateTeamAnalytics } = await import("./services/ai");
      const analytics = await generateTeamAnalytics(contactSummaries);
      const modelInfo = getAIModelInfo();
      
      // Cache the result (expires in 12 hours)
      const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000);
      
      // Delete old cache entries for this team's analytics
      await db.delete(aiInsightsCache)
        .where(
          and(
            eq(aiInsightsCache.teamId, teamId),
            eq(aiInsightsCache.insightType, "analytics")
          )
        );
      
      // Insert new cache entry
      await db.insert(aiInsightsCache).values({
        contactId: null,
        teamId,
        insightType: "analytics",
        data: analytics,
        modelUsed: modelInfo.model,
        expiresAt,
      });
      
      res.json({ ...analytics, cached: false, model: modelInfo.model });
    } catch (error) {
      console.error("Error generating AI analytics:", error);
      res.status(500).json({ error: "Failed to generate analytics" });
    }
  });

  // ============= END AI ENDPOINTS =============

  // ============= ATTACHMENT ENDPOINTS =============
  
  // Get signed download URL for an attachment
  app.get("/api/attachments/:id/url", isAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log("[SignedURL] Request for attachment:", req.params.id);
      
      const teamId = await getVerifiedTeamId(req);
      if (!teamId) {
        console.log("[SignedURL] No team membership");
        return res.status(403).json({ error: "Team membership required" });
      }

      const attachment = await storage.getAttachment(req.params.id);
      if (!attachment) {
        console.log("[SignedURL] Attachment not found:", req.params.id);
        return res.status(404).json({ error: "Attachment not found" });
      }

      // Verify team access
      if (attachment.teamId !== teamId) {
        console.log("[SignedURL] Team mismatch:", attachment.teamId, "!=", teamId);
        return res.status(403).json({ error: "Not authorized" });
      }

      // If it's an external URL, return it directly
      if (attachment.storagePath.startsWith("http://") || attachment.storagePath.startsWith("https://")) {
        console.log("[SignedURL] External URL, returning directly");
        return res.json({ url: attachment.storagePath, expires: null });
      }

      // Generate signed URL for object storage files
      console.log("[SignedURL] Generating signed URL for:", attachment.storagePath);
      const objectStorageService = new ObjectStorageService();
      const signedUrl = await objectStorageService.getSignedDownloadURL(attachment.storagePath, 3600);
      console.log("[SignedURL] Generated URL:", signedUrl?.substring(0, 100) + "...");
      
      res.json({ 
        url: signedUrl, 
        expires: new Date(Date.now() + 3600 * 1000).toISOString() 
      });
    } catch (error) {
      console.error("[SignedURL] Error getting signed URL:", error);
      res.status(500).json({ error: "Failed to get download URL" });
    }
  });

  // Get upload URL for file
  app.post("/api/objects/upload", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  // Serve uploaded objects with team-based access control
  app.get("/objects/:objectPath(*)", isAuthenticated, async (req: Request, res: Response) => {
    const userId = getUserId(req);
    // Use verified team ID with membership check
    const teamId = await getVerifiedTeamId(req);
    const objectStorageService = new ObjectStorageService();
    
    try {
      const storagePath = req.path;
      
      // Validate storage path format (security: prevent path traversal)
      if (!storagePath.startsWith("/objects/uploads/") || 
          !/^\/objects\/uploads\/[a-f0-9-]{36}$/i.test(storagePath)) {
        return res.sendStatus(404);
      }
      
      // Find the attachment by storage path
      const { attachments: attachmentsTable } = await import("@shared/schema");
      const [attachment] = await db.select().from(attachmentsTable)
        .where(eq(attachmentsTable.storagePath, storagePath));
      
      if (!attachment) {
        return res.sendStatus(404);
      }
      
      // Require valid teamId on both attachment and request
      if (!attachment.teamId || !teamId) {
        return res.sendStatus(403);
      }
      
      // Verify team membership - attachment must belong to user's team
      if (attachment.teamId !== teamId) {
        return res.sendStatus(403);
      }
      
      // Re-verify team membership by checking the contact still belongs to user's team
      const contact = await storage.getContact(attachment.contactId, teamId);
      if (!contact) {
        return res.sendStatus(403);
      }
      
      const objectFile = await objectStorageService.getObjectEntityFile(storagePath);
      
      // Check file-level ACL with team-based access
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        teamId: teamId,
        requestedPermission: ObjectPermission.READ,
      });
      
      // Deny access if ACL check fails
      if (!canAccess) {
        return res.sendStatus(403);
      }
      
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Get all attachments for a contact
  app.get("/api/contacts/:contactId/attachments", isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Use verified team ID with membership check
      const teamId = await getVerifiedTeamId(req);
      if (!teamId) {
        return res.status(403).json({ error: "Team membership required" });
      }
      
      const contact = await storage.getContact(req.params.contactId, teamId);
      if (!contact) {
        return res.status(404).json({ error: "Contact not found" });
      }
      
      const attachmentsList = await storage.getAttachments(req.params.contactId);
      res.json(attachmentsList);
    } catch (error) {
      console.error("Error fetching attachments:", error);
      res.status(500).json({ error: "Failed to fetch attachments" });
    }
  });

  // Get attachments by category
  app.get("/api/contacts/:contactId/attachments/:category", isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Use verified team ID with membership check
      const teamId = await getVerifiedTeamId(req);
      if (!teamId) {
        return res.status(403).json({ error: "Team membership required" });
      }
      
      const contact = await storage.getContact(req.params.contactId, teamId);
      if (!contact) {
        return res.status(404).json({ error: "Contact not found" });
      }
      
      const attachmentsList = await storage.getAttachmentsByCategory(req.params.contactId, req.params.category);
      res.json(attachmentsList);
    } catch (error) {
      console.error("Error fetching attachments:", error);
      res.status(500).json({ error: "Failed to fetch attachments" });
    }
  });

  // Create attachment record after upload
  app.post("/api/contacts/:contactId/attachments", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      // Use verified team ID with membership check
      const teamId = await getVerifiedTeamId(req);
      if (!teamId) {
        return res.status(403).json({ error: "Team membership required" });
      }
      
      const contact = await storage.getContact(req.params.contactId, teamId);
      if (!contact) {
        return res.status(404).json({ error: "Contact not found" });
      }

      let storagePath: string;
      
      // Check if this is an external URL (from Google Images, etc.)
      if (req.body.externalUrl) {
        const externalUrl = req.body.externalUrl;
        // Validate it's a proper URL
        if (!externalUrl.startsWith("http://") && !externalUrl.startsWith("https://")) {
          return res.status(400).json({ error: "Invalid external URL" });
        }
        
        // Download the image and upload to Object Storage to avoid hotlink blocking
        try {
          const imageResponse = await fetch(externalUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
              'Referer': new URL(externalUrl).origin,
            },
          });
          
          if (!imageResponse.ok) {
            return res.status(400).json({ error: "Не удалось загрузить изображение по ссылке" });
          }
          
          const contentType = imageResponse.headers.get('content-type') || '';
          
          // Verify that the response is actually an image
          if (!contentType.startsWith('image/')) {
            console.log(`External URL returned non-image content-type: ${contentType}`);
            return res.status(400).json({ 
              error: "Сайт заблокировал загрузку изображения. Попробуйте скопировать изображение напрямую или использовать другой источник." 
            });
          }
          
          const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
          
          // Additional check: verify minimum size (avoid empty or error pages)
          if (imageBuffer.length < 100) {
            return res.status(400).json({ error: "Получен пустой или поврежденный файл. Попробуйте другую ссылку." });
          }
          
          // Generate unique filename
          const uuid = crypto.randomUUID();
          const ext = contentType.includes('png') ? 'png' : 
                      contentType.includes('gif') ? 'gif' : 
                      contentType.includes('webp') ? 'webp' : 'jpg';
          const fileName = `external_${uuid}.${ext}`;
          
          // Upload to Object Storage
          const objectStorageService = new ObjectStorageService();
          const uploadPath = `.private/uploads/${fileName}`;
          await objectStorageService.uploadObject(uploadPath, imageBuffer, contentType);
          
          // Set ACL policy
          await objectStorageService.trySetObjectEntityAclPolicy(
            uploadPath,
            {
              owner: userId,
              teamId: teamId || undefined,
              visibility: "private",
            }
          );
          
          storagePath = uploadPath;
          
          // Update file size with actual size
          req.body.fileSize = imageBuffer.length;
          req.body.fileType = contentType;
        } catch (downloadError) {
          console.error("Error downloading external image:", downloadError);
          return res.status(400).json({ error: "Не удалось скачать изображение. Попробуйте другую ссылку." });
        }
      } else {
        // Regular file upload - validate and set ACL policy
        const objectStorageService = new ObjectStorageService();
        
        // Validate and set ACL policy for the uploaded file with team-based access
        const validatedPath = await objectStorageService.trySetObjectEntityAclPolicy(
          req.body.uploadURL,
          {
            owner: userId,
            teamId: teamId || undefined,
            visibility: "private",
          }
        );
        
        // Reject invalid storage paths (security: prevent path injection)
        if (!validatedPath) {
          return res.status(400).json({ error: "Invalid upload URL format" });
        }
        storagePath = validatedPath;
      }

      // Detect MIME type from filename if not provided correctly
      let fileType = req.body.fileType;
      const originalName = req.body.originalName || req.body.fileName || "";
      
      if (!fileType || fileType === "application/octet-stream") {
        const ext = originalName.toLowerCase().split('.').pop() || "";
        const mimeTypes: Record<string, string> = {
          // Images
          'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png',
          'gif': 'image/gif', 'webp': 'image/webp', 'bmp': 'image/bmp',
          'svg': 'image/svg+xml', 'ico': 'image/x-icon', 'heic': 'image/heic',
          'heif': 'image/heif', 'tiff': 'image/tiff', 'tif': 'image/tiff',
          // Videos
          'mp4': 'video/mp4', 'mov': 'video/quicktime', 'avi': 'video/x-msvideo',
          'mkv': 'video/x-matroska', 'webm': 'video/webm', 'm4v': 'video/x-m4v',
          // Audio
          'mp3': 'audio/mpeg', 'wav': 'audio/wav', 'ogg': 'audio/ogg',
          'm4a': 'audio/mp4', 'aac': 'audio/aac', 'flac': 'audio/flac',
          // Documents
          'pdf': 'application/pdf', 'doc': 'application/msword',
          'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'xls': 'application/vnd.ms-excel',
          'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'txt': 'text/plain', 'csv': 'text/csv',
        };
        fileType = mimeTypes[ext] || "application/octet-stream";
      }

      const data = insertAttachmentSchema.parse({
        contactId: req.params.contactId,
        teamId,
        uploadedBy: userId,
        category: req.body.category,
        subCategory: req.body.subCategory,
        fileName: req.body.fileName,
        originalName: originalName,
        fileType: fileType,
        fileSize: req.body.fileSize || 0,
        storagePath,
        description: req.body.description,
      });

      const attachment = await storage.createAttachment(data);
      res.status(201).json(attachment);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ error: validationError.message });
      }
      console.error("Error creating attachment:", error);
      res.status(500).json({ error: "Failed to create attachment" });
    }
  });

  // Delete attachment
  app.delete("/api/attachments/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Use verified team ID with membership check
      const teamId = await getVerifiedTeamId(req);
      if (!teamId) {
        return res.status(403).json({ error: "Team membership required" });
      }
      
      const attachment = await storage.getAttachment(req.params.id);
      if (!attachment) {
        return res.status(404).json({ error: "Attachment not found" });
      }
      
      // Verify team access - attachment must belong to user's team
      if (attachment.teamId !== teamId) {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      // Double-check by verifying contact belongs to team
      const contact = await storage.getContact(attachment.contactId, teamId);
      if (!contact) {
        return res.status(403).json({ error: "Not authorized" });
      }

      // Delete from object storage (skip for external URLs)
      if (!attachment.storagePath.startsWith("http://") && !attachment.storagePath.startsWith("https://")) {
        const objectStorageService = new ObjectStorageService();
        try {
          await objectStorageService.deleteObject(attachment.storagePath);
        } catch (err) {
          console.error("Error deleting from storage:", err);
        }
      }

      // Delete attachment record
      await storage.deleteAttachment(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting attachment:", error);
      res.status(500).json({ error: "Failed to delete attachment" });
    }
  });

  // ============= END ATTACHMENT ENDPOINTS =============

  // ============= CONNECTION ENDPOINTS (Relationship Graph) =============

  // Get all connections for team
  app.get("/api/connections", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const teamId = await getVerifiedTeamId(req);
      if (!teamId) {
        return res.status(403).json({ error: "Team membership required" });
      }
      
      const connections = await storage.getConnections(teamId);
      res.json(connections);
    } catch (error) {
      console.error("Error fetching connections:", error);
      res.status(500).json({ error: "Failed to fetch connections" });
    }
  });

  // Get connections for a specific contact
  app.get("/api/contacts/:contactId/connections", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const teamId = await getVerifiedTeamId(req);
      if (!teamId) {
        return res.status(403).json({ error: "Team membership required" });
      }
      
      const contact = await storage.getContact(req.params.contactId, teamId);
      if (!contact) {
        return res.status(404).json({ error: "Contact not found" });
      }
      
      const connections = await storage.getContactConnections(req.params.contactId, teamId);
      res.json(connections);
    } catch (error) {
      console.error("Error fetching contact connections:", error);
      res.status(500).json({ error: "Failed to fetch connections" });
    }
  });

  // Create a new connection
  app.post("/api/connections", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const teamId = await getVerifiedTeamId(req);
      if (!teamId) {
        return res.status(403).json({ error: "Team membership required" });
      }
      
      // Prevent self-connection (check before any DB calls to avoid leaks)
      if (req.body.fromContactId === req.body.toContactId) {
        return res.status(400).json({ error: "Invalid connection request" });
      }
      
      // Validate both contacts exist and belong to the team in parallel
      // Use generic error message to prevent contact ID enumeration
      const [fromContact, toContact] = await Promise.all([
        storage.getContact(req.body.fromContactId, teamId),
        storage.getContact(req.body.toContactId, teamId)
      ]);
      
      if (!fromContact || !toContact) {
        return res.status(400).json({ error: "Invalid connection request" });
      }
      
      // Check for duplicate connection (in either direction)
      // Only check after both contacts are validated to prevent cross-team probing
      const isDuplicate = await storage.checkDuplicateConnection(
        req.body.fromContactId, 
        req.body.toContactId, 
        teamId
      );
      
      if (isDuplicate) {
        return res.status(400).json({ error: "Connection between these contacts already exists" });
      }
      
      const data = insertContactConnectionSchema.parse({
        ...req.body,
        teamId,
        createdBy: userId,
      });
      
      const connection = await storage.createConnection(data);
      res.status(201).json(connection);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ error: validationError.message });
      }
      console.error("Error creating connection:", error);
      res.status(500).json({ error: "Failed to create connection" });
    }
  });

  // Update a connection
  app.patch("/api/connections/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const teamId = await getVerifiedTeamId(req);
      if (!teamId) {
        return res.status(403).json({ error: "Team membership required" });
      }
      
      const connection = await storage.getConnection(req.params.id, teamId);
      if (!connection) {
        return res.status(404).json({ error: "Connection not found" });
      }
      
      const { connectionType, strength, notes } = req.body;
      const updated = await storage.updateConnection(req.params.id, { connectionType, strength, notes }, teamId);
      res.json(updated);
    } catch (error) {
      console.error("Error updating connection:", error);
      res.status(500).json({ error: "Failed to update connection" });
    }
  });

  // Delete a connection
  app.delete("/api/connections/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const teamId = await getVerifiedTeamId(req);
      if (!teamId) {
        return res.status(403).json({ error: "Team membership required" });
      }
      
      const connection = await storage.getConnection(req.params.id, teamId);
      if (!connection) {
        return res.status(404).json({ error: "Connection not found" });
      }
      
      await storage.deleteConnection(req.params.id, teamId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting connection:", error);
      res.status(500).json({ error: "Failed to delete connection" });
    }
  });

  // ============= END CONNECTION ENDPOINTS =============

  // ============= GIFT ENDPOINTS =============
  
  // Get all gifts for current team
  app.get("/api/gifts", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const teamId = await getVerifiedTeamId(req);
      if (!teamId) {
        return res.status(403).json({ error: "Team membership required" });
      }
      const gifts = await storage.getGifts(teamId);
      res.json(gifts);
    } catch (error) {
      console.error("Error fetching gifts:", error);
      res.status(500).json({ error: "Failed to fetch gifts" });
    }
  });

  // Get gifts for a specific contact
  app.get("/api/contacts/:contactId/gifts", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const teamId = await getVerifiedTeamId(req);
      if (!teamId) {
        return res.status(403).json({ error: "Team membership required" });
      }
      
      const contact = await storage.getContact(req.params.contactId, teamId);
      if (!contact) {
        return res.status(404).json({ error: "Contact not found" });
      }
      
      const gifts = await storage.getContactGifts(req.params.contactId, teamId);
      res.json(gifts);
    } catch (error) {
      console.error("Error fetching contact gifts:", error);
      res.status(500).json({ error: "Failed to fetch contact gifts" });
    }
  });

  // Create a new gift
  app.post("/api/gifts", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const teamId = await getVerifiedTeamId(req);
      if (!teamId) {
        return res.status(403).json({ error: "Team membership required" });
      }
      
      const userId = getUserId(req);
      const giftData = insertGiftSchema.parse({
        ...req.body,
        teamId,
        createdBy: userId,
      });
      
      // Verify contact exists and belongs to team
      const contact = await storage.getContact(giftData.contactId, teamId);
      if (!contact) {
        return res.status(404).json({ error: "Contact not found" });
      }
      
      const gift = await storage.createGift(giftData);
      res.status(201).json(gift);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      console.error("Error creating gift:", error);
      res.status(500).json({ error: "Failed to create gift" });
    }
  });

  // Update a gift
  app.patch("/api/gifts/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const teamId = await getVerifiedTeamId(req);
      if (!teamId) {
        return res.status(403).json({ error: "Team membership required" });
      }
      
      const gift = await storage.getGift(req.params.id, teamId);
      if (!gift) {
        return res.status(404).json({ error: "Gift not found" });
      }
      
      const validatedData = updateGiftSchema.parse(req.body);
      const updated = await storage.updateGift(req.params.id, validatedData, teamId);
      res.json(updated);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      console.error("Error updating gift:", error);
      res.status(500).json({ error: "Failed to update gift" });
    }
  });

  // Delete a gift
  app.delete("/api/gifts/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const teamId = await getVerifiedTeamId(req);
      if (!teamId) {
        return res.status(403).json({ error: "Team membership required" });
      }
      
      const gift = await storage.getGift(req.params.id, teamId);
      if (!gift) {
        return res.status(404).json({ error: "Gift not found" });
      }
      
      await storage.deleteGift(req.params.id, teamId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting gift:", error);
      res.status(500).json({ error: "Failed to delete gift" });
    }
  });

  // ============= END GIFT ENDPOINTS =============

  // ============= PURCHASE ENDPOINTS =============
  
  // Get all purchases for current team
  app.get("/api/purchases", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const teamId = await getVerifiedTeamId(req);
      if (!teamId) {
        return res.status(403).json({ error: "Team membership required" });
      }
      const purchases = await storage.getPurchases(teamId);
      res.json(purchases);
    } catch (error) {
      console.error("Error fetching purchases:", error);
      res.status(500).json({ error: "Failed to fetch purchases" });
    }
  });

  // Get purchases for a specific contact
  app.get("/api/contacts/:contactId/purchases", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const teamId = await getVerifiedTeamId(req);
      if (!teamId) {
        return res.status(403).json({ error: "Team membership required" });
      }
      
      const contact = await storage.getContact(req.params.contactId, teamId);
      if (!contact) {
        return res.status(404).json({ error: "Contact not found" });
      }
      
      const purchases = await storage.getContactPurchases(req.params.contactId, teamId);
      res.json(purchases);
    } catch (error) {
      console.error("Error fetching contact purchases:", error);
      res.status(500).json({ error: "Failed to fetch contact purchases" });
    }
  });

  // Create a new purchase
  app.post("/api/purchases", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const teamId = await getVerifiedTeamId(req);
      if (!teamId) {
        return res.status(403).json({ error: "Team membership required" });
      }
      
      const userId = getUserId(req);
      const purchaseData = insertPurchaseSchema.parse({
        ...req.body,
        teamId,
        createdBy: userId,
      });
      
      // Verify contact exists and belongs to team
      const contact = await storage.getContact(purchaseData.contactId, teamId);
      if (!contact) {
        return res.status(404).json({ error: "Contact not found" });
      }
      
      const purchase = await storage.createPurchase(purchaseData);
      res.status(201).json(purchase);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      console.error("Error creating purchase:", error);
      res.status(500).json({ error: "Failed to create purchase" });
    }
  });

  // Update a purchase
  app.patch("/api/purchases/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const teamId = await getVerifiedTeamId(req);
      if (!teamId) {
        return res.status(403).json({ error: "Team membership required" });
      }
      
      const purchase = await storage.getPurchase(req.params.id, teamId);
      if (!purchase) {
        return res.status(404).json({ error: "Purchase not found" });
      }
      
      const validatedData = updatePurchaseSchema.parse(req.body);
      const updated = await storage.updatePurchase(req.params.id, validatedData, teamId);
      res.json(updated);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      console.error("Error updating purchase:", error);
      res.status(500).json({ error: "Failed to update purchase" });
    }
  });

  // Delete a purchase
  app.delete("/api/purchases/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const teamId = await getVerifiedTeamId(req);
      if (!teamId) {
        return res.status(403).json({ error: "Team membership required" });
      }
      
      const purchase = await storage.getPurchase(req.params.id, teamId);
      if (!purchase) {
        return res.status(404).json({ error: "Purchase not found" });
      }
      
      await storage.deletePurchase(req.params.id, teamId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting purchase:", error);
      res.status(500).json({ error: "Failed to delete purchase" });
    }
  });

  // ============= END PURCHASE ENDPOINTS =============

  // Endpoint for scheduled backup (can be called by cron/scheduled deployment)
  app.post("/api/backups/auto", async (req: Request, res: Response) => {
    try {
      const { secret } = req.body;
      
      // Simple secret key protection for scheduled task
      const expectedSecret = process.env.BACKUP_SECRET || "prima-auto-backup-secret";
      if (secret !== expectedSecret) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Get all teams and create backups for each
      const allTeams = await db.select().from(teams);
      const results: { teamId: string; success: boolean; contactsCount?: number }[] = [];
      
      for (const team of allTeams) {
        try {
          const backup = await storage.createBackup(team.id, team.ownerId, "Ежедневный автоматический бекап");
          await storage.deleteOldBackups(team.id, 30);
          results.push({ teamId: team.id, success: true, contactsCount: backup.contactsCount });
        } catch (err) {
          results.push({ teamId: team.id, success: false });
        }
      }
      
      res.json({ message: "Auto backup completed", results });
    } catch (error) {
      console.error("Error in auto backup:", error);
      res.status(500).json({ error: "Failed to run auto backup" });
    }
  });

  return httpServer;
}
