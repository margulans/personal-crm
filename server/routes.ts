import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertContactSchema, insertInteractionSchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.get("/api/contacts", async (req, res) => {
    try {
      const contacts = await storage.getContacts();
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      res.status(500).json({ error: "Failed to fetch contacts" });
    }
  });

  app.get("/api/contacts/:id", async (req, res) => {
    try {
      const contact = await storage.getContact(req.params.id);
      if (!contact) {
        return res.status(404).json({ error: "Contact not found" });
      }
      res.json(contact);
    } catch (error) {
      console.error("Error fetching contact:", error);
      res.status(500).json({ error: "Failed to fetch contact" });
    }
  });

  app.post("/api/contacts", async (req, res) => {
    try {
      const data = insertContactSchema.parse(req.body);
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

  app.patch("/api/contacts/:id", async (req, res) => {
    try {
      const partialSchema = insertContactSchema.partial();
      const data = partialSchema.parse(req.body);
      const contact = await storage.updateContact(req.params.id, data);
      if (!contact) {
        return res.status(404).json({ error: "Contact not found" });
      }
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

  app.delete("/api/contacts/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteContact(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Contact not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting contact:", error);
      res.status(500).json({ error: "Failed to delete contact" });
    }
  });

  app.get("/api/contacts/:contactId/interactions", async (req, res) => {
    try {
      const interactions = await storage.getInteractions(req.params.contactId);
      res.json(interactions);
    } catch (error) {
      console.error("Error fetching interactions:", error);
      res.status(500).json({ error: "Failed to fetch interactions" });
    }
  });

  app.post("/api/contacts/:contactId/interactions", async (req, res) => {
    try {
      const data = insertInteractionSchema.parse({
        ...req.body,
        contactId: req.params.contactId,
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

  app.delete("/api/interactions/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteInteraction(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Interaction not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting interaction:", error);
      res.status(500).json({ error: "Failed to delete interaction" });
    }
  });

  app.post("/api/recalculate", async (req, res) => {
    try {
      await storage.recalculateAllContactMetrics();
      res.json({ message: "All contacts recalculated successfully" });
    } catch (error) {
      console.error("Error recalculating metrics:", error);
      res.status(500).json({ error: "Failed to recalculate metrics" });
    }
  });

  app.get("/api/export/json", async (req, res) => {
    try {
      const contacts = await storage.getContacts();
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

  app.get("/api/export/csv", async (req, res) => {
    try {
      const contacts = await storage.getContacts();
      
      const headers = [
        "fullName", "shortName", "phone", "email", "socialLinks", "tags", "roleTags",
        "importanceLevel", "attentionLevel", "desiredFrequencyDays", "lastContactDate",
        "responseQuality", "relationshipEnergy", "attentionTrend",
        "contribution_financial", "contribution_network", "contribution_tactical",
        "contribution_strategic", "contribution_loyalty",
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
        const contrib = contact.contributionDetails || { financial: 0, network: 0, tactical: 0, strategic: 0, loyalty: 0 };
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
          String(contrib.tactical),
          String(contrib.strategic),
          String(contrib.loyalty),
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

  app.post("/api/contacts/bulk-delete", async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "No contact IDs provided" });
      }
      
      let deleted = 0;
      for (const id of ids) {
        const result = await storage.deleteContact(id);
        if (result) deleted++;
      }
      
      res.json({ message: `Deleted ${deleted} contacts`, deleted });
    } catch (error) {
      console.error("Error bulk deleting contacts:", error);
      res.status(500).json({ error: "Failed to delete contacts" });
    }
  });

  app.post("/api/contacts/bulk-update", async (req, res) => {
    try {
      const { ids, updates } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "No contact IDs provided" });
      }
      
      const partialSchema = insertContactSchema.partial();
      const validUpdates = partialSchema.parse(updates);
      
      let updated = 0;
      for (const id of ids) {
        const result = await storage.updateContact(id, validUpdates);
        if (result) updated++;
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

  app.post("/api/import", async (req, res) => {
    try {
      const { contacts: importContacts, format } = req.body;
      
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
              tactical: Number(contactData.contribution_tactical) || 0,
              strategic: Number(contactData.contribution_strategic) || 0,
              loyalty: Number(contactData.contribution_loyalty) || 0,
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
