import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ContactCard } from "@/components/crm/ContactCard";
import { ContactFilters } from "@/components/crm/ContactFilters";
import { ContactDetail } from "@/components/crm/ContactDetail";
import { mockContacts, mockInteractions, type Contact } from "@/lib/mockData";
import { Plus, LayoutGrid, List } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ContactsPage() {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState("heatIndex");
  const [filters, setFilters] = useState({
    search: "",
    importance: "",
    valueCategory: "",
    heatStatus: "",
  });

  // todo: remove mock functionality - replace with real data from API
  const contacts = mockContacts;

  const filteredContacts = useMemo(() => {
    let result = [...contacts];

    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(
        (c) =>
          c.fullName.toLowerCase().includes(search) ||
          c.shortName?.toLowerCase().includes(search) ||
          c.tags.some((t) => t.toLowerCase().includes(search)) ||
          c.roleTags.some((t) => t.toLowerCase().includes(search))
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
          return (
            new Date(a.lastContactDate).getTime() -
            new Date(b.lastContactDate).getTime()
          );
        case "name":
          return a.fullName.localeCompare(b.fullName);
        default:
          return 0;
      }
    });

    return result;
  }, [contacts, filters, sortBy]);

  if (selectedContact) {
    const interactions = mockInteractions.filter(
      (i) => i.contactId === selectedContact.id
    );
    return (
      <ContactDetail
        contact={selectedContact}
        interactions={interactions}
        onBack={() => setSelectedContact(null)}
        onAddInteraction={(data) => {
          console.log("Add interaction:", data);
        }}
      />
    );
  }

  return (
    <div className="h-full flex flex-col" data-testid="contacts-page">
      <div className="p-4 border-b bg-background sticky top-0 z-10">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h1 className="text-2xl font-semibold">Контакты</h1>
          <Button className="gap-2" data-testid="button-add-contact">
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
        {filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-muted-foreground mb-2">Контакты не найдены</p>
            <p className="text-sm text-muted-foreground">
              Попробуйте изменить параметры фильтрации
            </p>
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
                onClick={() => setSelectedContact(contact)}
              />
            ))}
          </div>
        )}

        <div className="mt-4 text-center text-sm text-muted-foreground">
          Показано {filteredContacts.length} из {contacts.length} контактов
        </div>
      </div>
    </div>
  );
}
