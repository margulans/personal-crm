import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertContactSchema, insertInteractionSchema, insertTeamSchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { setupAuth, isAuthenticated } from "./replitAuth";

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
      
      const data = insertContactSchema.parse({
        ...req.body,
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
      
      const partialSchema = insertContactSchema.partial();
      const data = partialSchema.parse({
        ...req.body,
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
      await storage.recalculateAllContactMetrics();
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
          financial?: number; network?: number; trust?: number 
        } | null;
        
        let contrib = { financial: 0, network: 0, trust: 0 };
        if (rawContrib) {
          contrib = { financial: rawContrib.financial || 0, network: rawContrib.network || 0, trust: rawContrib.trust || 0 };
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

  return httpServer;
}
