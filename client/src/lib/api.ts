import { apiRequest, queryClient } from "./queryClient";
import type { Contact, Interaction, InsertContact, InsertInteraction } from "./types";

export const contactsApi = {
  getAll: async (): Promise<Contact[]> => {
    const response = await fetch("/api/contacts");
    if (!response.ok) throw new Error("Failed to fetch contacts");
    return response.json();
  },

  getById: async (id: string): Promise<Contact> => {
    const response = await fetch(`/api/contacts/${id}`);
    if (!response.ok) throw new Error("Failed to fetch contact");
    return response.json();
  },

  create: async (data: InsertContact): Promise<Contact> => {
    const response = await apiRequest("POST", "/api/contacts", data);
    return response.json();
  },

  update: async (id: string, data: Partial<InsertContact>): Promise<Contact> => {
    const response = await apiRequest("PATCH", `/api/contacts/${id}`, data);
    return response.json();
  },

  delete: async (id: string): Promise<void> => {
    await apiRequest("DELETE", `/api/contacts/${id}`);
  },
};

export const interactionsApi = {
  getByContact: async (contactId: string): Promise<Interaction[]> => {
    const response = await fetch(`/api/contacts/${contactId}/interactions`);
    if (!response.ok) throw new Error("Failed to fetch interactions");
    return response.json();
  },

  create: async (contactId: string, data: InsertInteraction): Promise<Interaction> => {
    const response = await apiRequest("POST", `/api/contacts/${contactId}/interactions`, data);
    return response.json();
  },

  delete: async (id: string): Promise<void> => {
    await apiRequest("DELETE", `/api/interactions/${id}`);
  },
};

export const invalidateContacts = () => {
  queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
};

export const invalidateContact = (id: string) => {
  queryClient.invalidateQueries({ queryKey: ["/api/contacts", id] });
};

export const invalidateInteractions = (contactId: string) => {
  queryClient.invalidateQueries({ queryKey: ["/api/contacts", contactId, "interactions"] });
};
