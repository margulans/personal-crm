import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Contact } from "@/lib/types";

export type EditingSection = 
  | "identity" 
  | "contacts" 
  | "interests" 
  | "family" 
  | "team" 
  | "status" 
  | "contribution" 
  | "potential"
  | null;

interface UseContactEditOptions {
  contact: Contact;
  onSaveSuccess?: () => void;
}

export function useContactEdit({ contact, onSaveSuccess }: UseContactEditOptions) {
  const { toast } = useToast();
  const [editingSection, setEditingSection] = useState<EditingSection>(null);
  const [formData, setFormData] = useState<Partial<Contact>>({});

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Contact>) => {
      const res = await apiRequest("PATCH", `/api/contacts/${contact.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", contact.id] });
      toast({ title: "Изменения сохранены" });
      setEditingSection(null);
      setFormData({});
      onSaveSuccess?.();
    },
    onError: (error: Error) => {
      toast({ 
        title: "Ошибка сохранения", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const startEditing = useCallback((section: EditingSection) => {
    setEditingSection(section);
    setFormData({});
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingSection(null);
    setFormData({});
  }, []);

  const updateField = useCallback(<K extends keyof Contact>(field: K, value: Contact[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const saveSection = useCallback(async () => {
    if (Object.keys(formData).length === 0) {
      setEditingSection(null);
      return;
    }
    await updateMutation.mutateAsync(formData);
  }, [formData, updateMutation]);

  const getFieldValue = useCallback(<K extends keyof Contact>(field: K): Contact[K] => {
    return (formData[field] !== undefined ? formData[field] : contact[field]) as Contact[K];
  }, [formData, contact]);

  return {
    editingSection,
    isEditing: (section: EditingSection) => editingSection === section,
    startEditing,
    cancelEditing,
    saveSection,
    updateField,
    getFieldValue,
    formData,
    isSaving: updateMutation.isPending,
  };
}
