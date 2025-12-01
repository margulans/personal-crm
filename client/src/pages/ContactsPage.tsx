import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ContactCard } from "@/components/crm/ContactCard";
import { ContactFilters } from "@/components/crm/ContactFilters";
import { ContactDetail } from "@/components/crm/ContactDetail";
import { ContactForm } from "@/components/crm/ContactForm";
import { contactsApi, interactionsApi, invalidateContacts, invalidateInteractions } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Plus, LayoutGrid, List, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Contact, Interaction, InsertContact } from "@/lib/types";

export default function ContactsPage() {
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState("heatIndex");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [filters, setFilters] = useState({
    search: "",
    importance: "",
    valueCategory: "",
    heatStatus: "",
  });
  const { toast } = useToast();

  const { data: contacts = [], isLoading } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const { data: interactions = [] } = useQuery<Interaction[]>({
    queryKey: ["/api/contacts", selectedContactId, "interactions"],
    queryFn: () => interactionsApi.getByContact(selectedContactId!),
    enabled: !!selectedContactId,
  });

  const createContactMutation = useMutation({
    mutationFn: contactsApi.create,
    onSuccess: () => {
      invalidateContacts();
      setShowCreateForm(false);
      toast({ title: "Контакт создан" });
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const updateContactMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertContact> }) =>
      contactsApi.update(id, data),
    onSuccess: () => {
      invalidateContacts();
      setEditingContact(null);
      toast({ title: "Контакт обновлён" });
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const addInteractionMutation = useMutation({
    mutationFn: ({ contactId, data }: { contactId: string; data: { date: string; type: string; channel: string; note: string; isMeaningful: boolean } }) =>
      interactionsApi.create(contactId, data),
    onSuccess: () => {
      if (selectedContactId) {
        invalidateInteractions(selectedContactId);
        invalidateContacts();
      }
      toast({ title: "Взаимодействие добавлено" });
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const selectedContact = useMemo(() => {
    return contacts.find((c) => c.id === selectedContactId) || null;
  }, [contacts, selectedContactId]);

  const filteredContacts = useMemo(() => {
    let result = [...contacts];

    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(
        (c) =>
          c.fullName.toLowerCase().includes(search) ||
          c.shortName?.toLowerCase().includes(search) ||
          c.tags?.some((t) => t.toLowerCase().includes(search)) ||
          c.roleTags?.some((t) => t.toLowerCase().includes(search))
      );
    }

    if (filters.importance && filters.importance !== "all") {
      result = result.filter((c) => c.importanceLevel === filters.importance);
    }

    if (filters.valueCategory && filters.valueCategory !== "all") {
      result = result.filter((c) => c.valueCategory === filters.valueCategory);
    }

    if (filters.heatStatus && filters.heatStatus !== "all") {
      result = result.filter((c) => c.heatStatus === filters.heatStatus);
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case "heatIndex":
          return a.heatIndex - b.heatIndex;
        case "importance":
          return a.importanceLevel.localeCompare(b.importanceLevel);
        case "lastContact":
          const dateA = a.lastContactDate ? new Date(a.lastContactDate).getTime() : 0;
          const dateB = b.lastContactDate ? new Date(b.lastContactDate).getTime() : 0;
          return dateA - dateB;
        case "name":
          return a.fullName.localeCompare(b.fullName);
        default:
          return 0;
      }
    });

    return result;
  }, [contacts, filters, sortBy]);

  if (selectedContact) {
    return (
      <ContactDetail
        contact={selectedContact}
        interactions={interactions}
        onBack={() => setSelectedContactId(null)}
        onEdit={() => setEditingContact(selectedContact)}
        onAddInteraction={(data) => {
          addInteractionMutation.mutate({ contactId: selectedContact.id, data });
        }}
      />
    );
  }

  return (
    <div className="h-full flex flex-col" data-testid="contacts-page">
      <div className="p-4 border-b bg-background sticky top-0 z-10">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h1 className="text-2xl font-semibold">Контакты</h1>
          <Button className="gap-2" onClick={() => setShowCreateForm(true)} data-testid="button-add-contact">
            <Plus className="h-4 w-4" />
            Добавить контакт
          </Button>
        </div>

        <div className="flex items-end justify-between gap-4">
          <ContactFilters filters={filters} onFiltersChange={setFilters} />

          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]" data-testid="select-sort">
                <SelectValue placeholder="Сортировка" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="heatIndex">По статусу (тепло)</SelectItem>
                <SelectItem value="importance">По важности</SelectItem>
                <SelectItem value="lastContact">По дате контакта</SelectItem>
                <SelectItem value="name">По имени</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex border rounded-md">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setViewMode("grid")}
                data-testid="button-view-grid"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setViewMode("list")}
                data-testid="button-view-list"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-muted-foreground mb-2">
              {contacts.length === 0 ? "Нет контактов" : "Контакты не найдены"}
            </p>
            <p className="text-sm text-muted-foreground">
              {contacts.length === 0
                ? "Добавьте первый контакт, чтобы начать"
                : "Попробуйте изменить параметры фильтрации"}
            </p>
            {contacts.length === 0 && (
              <Button className="mt-4" onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Добавить контакт
              </Button>
            )}
          </div>
        ) : (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                : "flex flex-col gap-3"
            }
          >
            {filteredContacts.map((contact) => (
              <ContactCard
                key={contact.id}
                contact={contact}
                onClick={() => setSelectedContactId(contact.id)}
              />
            ))}
          </div>
        )}

        {filteredContacts.length > 0 && (
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Показано {filteredContacts.length} из {contacts.length} контактов
          </div>
        )}
      </div>

      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Новый контакт</DialogTitle>
          </DialogHeader>
          <ContactForm
            onSubmit={(data) => createContactMutation.mutate(data)}
            onCancel={() => setShowCreateForm(false)}
            isLoading={createContactMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingContact} onOpenChange={(open) => !open && setEditingContact(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Редактировать контакт</DialogTitle>
          </DialogHeader>
          {editingContact && (
            <ContactForm
              initialData={editingContact}
              onSubmit={(data) => updateContactMutation.mutate({ id: editingContact.id, data })}
              onCancel={() => setEditingContact(null)}
              isLoading={updateContactMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
