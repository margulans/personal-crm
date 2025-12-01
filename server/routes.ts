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

  return httpServer;
}
