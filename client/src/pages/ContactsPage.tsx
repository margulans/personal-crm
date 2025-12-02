import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ContactCard } from "@/components/crm/ContactCard";
import { ContactFilters } from "@/components/crm/ContactFilters";
import { ContactDetail } from "@/components/crm/ContactDetail";
import { ContactForm } from "@/components/crm/ContactForm";
import { BulkActionsBar } from "@/components/crm/BulkActionsBar";
import { contactsApi, interactionsApi, bulkApi, invalidateContacts, invalidateInteractions } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { 
  Plus, 
  LayoutGrid, 
  List, 
  Loader2, 
  CheckSquare, 
  ArrowLeft,
  Sparkles,
  Brain,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  AlertTriangle,
  Activity,
} from "lucide-react";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { Contact, Interaction, InsertContact, AIDashboard } from "@/lib/types";

export default function ContactsPage() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState("heatIndex");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [editingTab, setEditingTab] = useState<"basic" | "priority" | "contribution" | "potential">("basic");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteContactId, setDeleteContactId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    search: "",
    importance: "",
    valueCategory: "",
    heatStatus: "",
  });
  const [cameFromAnalytics, setCameFromAnalytics] = useState(false);
  const [showAIDashboard, setShowAIDashboard] = useState(true);
  const [dashboardRefreshKey, setDashboardRefreshKey] = useState(0);
  const { toast } = useToast();

  const { data: contacts = [], isLoading } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  // AI Dashboard query with proper cache key segmentation
  const { data: aiDashboard, isLoading: dashboardLoading, refetch: refetchDashboard } = useQuery<AIDashboard>({
    queryKey: ["/api/ai/dashboard", { refresh: dashboardRefreshKey }],
    queryFn: async () => {
      const url = dashboardRefreshKey > 0 ? "/api/ai/dashboard?refresh=true" : "/api/ai/dashboard";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch AI dashboard");
      return res.json();
    },
    enabled: contacts.length > 0,
  });

  const handleRefreshDashboard = () => {
    setDashboardRefreshKey(prev => prev + 1);
  };

  // Read URL params and apply filters
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const status = params.get("status");
    const fromAnalytics = params.get("from") === "analytics";
    const contactId = params.get("contact");
    const editMode = params.get("edit") === "true";
    
    if (contactId && contacts.length > 0) {
      const contact = contacts.find(c => c.id === contactId);
      if (contact) {
        if (editMode) {
          setEditingContact(contact);
        } else {
          setSelectedContactId(contactId);
        }
      }
      // Clear the URL params after applying
      setLocation("/", { replace: true });
    } else if (status && ["green", "yellow", "red"].includes(status)) {
      setFilters(prev => ({ ...prev, heatStatus: status }));
      setCameFromAnalytics(true);
      // Clear the URL param after applying
      setLocation("/", { replace: true });
    } else if (fromAnalytics) {
      setCameFromAnalytics(true);
      // Clear the URL param after applying
      setLocation("/", { replace: true });
    }
  }, [searchString, setLocation, contacts]);

  const handleBackToAnalytics = () => {
    setCameFromAnalytics(false);
    setFilters({ search: "", importance: "", valueCategory: "", heatStatus: "" });
    setLocation("/analytics");
  };

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
    onSuccess: async () => {
      await invalidateContacts();
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

  const deleteContactMutation = useMutation({
    mutationFn: (id: string) => contactsApi.delete(id),
    onSuccess: () => {
      invalidateContacts();
      setDeleteContactId(null);
      toast({ title: "Контакт удалён" });
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => bulkApi.deleteContacts(ids),
    onSuccess: ({ deleted }) => {
      invalidateContacts();
      setSelectedIds(new Set());
      setSelectionMode(false);
      toast({ title: `Удалено ${deleted} контактов` });
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: ({ ids, updates }: { ids: string[]; updates: Record<string, unknown> }) =>
      bulkApi.updateContacts(ids, updates),
    onSuccess: ({ updated }) => {
      invalidateContacts();
      setSelectedIds(new Set());
      setSelectionMode(false);
      toast({ title: `Обновлено ${updated} контактов` });
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const toggleSelection = (id: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleCancelSelection = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

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

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    contacts.forEach((contact) => {
      contact.tags?.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [contacts]);

  const allRoles = useMemo(() => {
    const roleSet = new Set<string>();
    contacts.forEach((contact) => {
      contact.roleTags?.forEach((role) => roleSet.add(role));
    });
    return Array.from(roleSet).sort();
  }, [contacts]);

  const openEditForm = (contact: Contact, tab: "basic" | "priority" | "contribution" | "potential" = "basic") => {
    setEditingTab(tab);
    setEditingContact(contact);
  };

  const editDialog = (
    <Dialog open={!!editingContact} onOpenChange={(open) => !open && setEditingContact(null)}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Редактировать контакт</DialogTitle>
          <DialogDescription>
            Внесите изменения в информацию о контакте
          </DialogDescription>
        </DialogHeader>
        {editingContact && (
          <ContactForm
            initialData={editingContact}
            onSubmit={(data) => updateContactMutation.mutate({ id: editingContact.id, data })}
            onCancel={() => setEditingContact(null)}
            isLoading={updateContactMutation.isPending}
            allTags={allTags}
            allRoles={allRoles}
            initialTab={editingTab}
          />
        )}
      </DialogContent>
    </Dialog>
  );

  if (selectedContact) {
    return (
      <>
        <ContactDetail
          contact={selectedContact}
          interactions={interactions}
          onBack={() => setSelectedContactId(null)}
          onEdit={() => openEditForm(selectedContact)}
          onEditTab={(tab) => openEditForm(selectedContact, tab)}
          onAddInteraction={(data) => {
            addInteractionMutation.mutate({ contactId: selectedContact.id, data });
          }}
        />
        {editDialog}
      </>
    );
  }

  return (
    <div className="h-full flex flex-col" data-testid="contacts-page">
      <div className="p-4 border-b bg-background sticky top-0 z-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 mb-4">
          <div className="flex items-center gap-2">
            {cameFromAnalytics && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBackToAnalytics}
                data-testid="button-back-to-analytics"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <h1 className="text-xl sm:text-2xl font-semibold">
              Контакты
              <span className="ml-2 text-base font-normal text-muted-foreground">
                ({contacts.length})
              </span>
            </h1>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant={selectionMode ? "secondary" : "outline"}
              size="sm"
              onClick={() => selectionMode ? handleCancelSelection() : setSelectionMode(true)}
              data-testid="button-selection-mode"
              className="flex-1 sm:flex-none"
            >
              <CheckSquare className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{selectionMode ? "Отмена" : "Выбрать"}</span>
            </Button>
            <Button className="gap-2 flex-1 sm:flex-none" onClick={() => setShowCreateForm(true)} data-testid="button-add-contact">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Добавить контакт</span>
              <span className="sm:hidden">Добавить</span>
            </Button>
          </div>
        </div>

        {selectionMode && selectedIds.size > 0 && (
          <div className="mb-4">
            <BulkActionsBar
              selectedCount={selectedIds.size}
              onDelete={() => bulkDeleteMutation.mutate(Array.from(selectedIds))}
              onUpdateImportance={(level) =>
                bulkUpdateMutation.mutate({
                  ids: Array.from(selectedIds),
                  updates: { importanceLevel: level },
                })
              }
              onCancel={handleCancelSelection}
              isDeleting={bulkDeleteMutation.isPending}
              isUpdating={bulkUpdateMutation.isPending}
            />
          </div>
        )}

        <div className="flex flex-col lg:flex-row lg:items-end gap-4">
          <div className="flex-1">
            <ContactFilters filters={filters} onFiltersChange={setFilters} />
          </div>

          <div className="flex items-center gap-2 justify-between sm:justify-end">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[140px] sm:w-[180px]" data-testid="select-sort">
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

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* AI Dashboard Widget */}
        {contacts.length > 0 && (
          <Collapsible open={showAIDashboard} onOpenChange={setShowAIDashboard}>
            <Card className="bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20 border-violet-200 dark:border-violet-700">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-violet-500" />
                    AI Ассистент
                    {aiDashboard?.cached && (
                      <Badge variant="outline" className="text-xs">кэш</Badge>
                    )}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {showAIDashboard && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleRefreshDashboard}
                        disabled={dashboardLoading}
                        data-testid="button-refresh-dashboard"
                      >
                        <RefreshCw className={cn("h-4 w-4", dashboardLoading && "animate-spin")} />
                      </Button>
                    )}
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" data-testid="button-toggle-dashboard">
                        {showAIDashboard ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                </div>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="pt-2">
                  {dashboardLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
                      <span className="ml-2 text-sm text-muted-foreground">Анализирую...</span>
                    </div>
                  ) : aiDashboard ? (
                    <div className="space-y-4" data-testid="ai-dashboard-content">
                      {/* Greeting and Health */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <p className="text-lg font-medium" data-testid="text-ai-greeting">{aiDashboard.greeting}</p>
                        <div className="flex items-center gap-2" data-testid="ai-network-health">
                          <Activity className={cn(
                            "h-4 w-4",
                            aiDashboard.networkHealth.score >= 70 ? "text-emerald-500" :
                            aiDashboard.networkHealth.score >= 40 ? "text-amber-500" : "text-red-500"
                          )} />
                          <span className="text-sm font-mono" data-testid="text-health-score">{aiDashboard.networkHealth.score}%</span>
                          <Badge variant={
                            aiDashboard.networkHealth.score >= 70 ? "default" :
                            aiDashboard.networkHealth.score >= 40 ? "secondary" : "destructive"
                          } data-testid="badge-health-status">
                            {aiDashboard.networkHealth.status}
                          </Badge>
                          {aiDashboard.networkHealth.trend === "up" && <TrendingUp className="h-4 w-4 text-emerald-500" data-testid="icon-trend-up" />}
                          {aiDashboard.networkHealth.trend === "down" && <TrendingDown className="h-4 w-4 text-red-500" data-testid="icon-trend-down" />}
                          {aiDashboard.networkHealth.trend === "stable" && <Minus className="h-4 w-4 text-muted-foreground" data-testid="icon-trend-stable" />}
                        </div>
                      </div>

                      {/* Top Priorities */}
                      {aiDashboard.topPriorities && aiDashboard.topPriorities.length > 0 && (
                        <div className="space-y-2" data-testid="ai-priorities-section">
                          <h4 className="text-sm font-medium flex items-center gap-1">
                            <Brain className="h-4 w-4 text-violet-500" />
                            Приоритеты на сегодня
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {aiDashboard.topPriorities.map((priority, i) => (
                              <div 
                                key={i} 
                                data-testid={`card-priority-${i}`}
                                className={cn(
                                  "p-2 rounded-md border",
                                  priority.urgency === "critical" && "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800",
                                  priority.urgency === "high" && "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800",
                                  priority.urgency === "medium" && "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800"
                                )}
                              >
                                <div className="flex items-start gap-2">
                                  {priority.urgency === "critical" && <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />}
                                  {priority.urgency === "high" && <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />}
                                  {priority.urgency === "medium" && <Activity className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />}
                                  <div>
                                    <p className="text-sm font-medium" data-testid={`text-priority-name-${i}`}>{priority.contactName}</p>
                                    <p className="text-xs text-muted-foreground" data-testid={`text-priority-action-${i}`}>{priority.action}</p>
                                    <p className="text-xs text-muted-foreground/70">{priority.reason}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Daily Tip */}
                      {aiDashboard.dailyTip && (
                        <div className="flex items-start gap-2 p-2 bg-white/50 dark:bg-black/20 rounded-md" data-testid="ai-daily-tip">
                          <Lightbulb className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                          <p className="text-sm" data-testid="text-daily-tip">{aiDashboard.dailyTip}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Не удалось загрузить рекомендации
                    </p>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

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
                onDelete={() => setDeleteContactId(contact.id)}
                selectionMode={selectionMode}
                isSelected={selectedIds.has(contact.id)}
                onSelect={(selected) => toggleSelection(contact.id, selected)}
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
            <DialogDescription>
              Заполните информацию о новом контакте
            </DialogDescription>
          </DialogHeader>
          <ContactForm
            onSubmit={(data) => createContactMutation.mutate(data)}
            onCancel={() => setShowCreateForm(false)}
            isLoading={createContactMutation.isPending}
            allTags={allTags}
            allRoles={allRoles}
          />
        </DialogContent>
      </Dialog>

      {editDialog}

      <AlertDialog open={!!deleteContactId} onOpenChange={(open) => !open && setDeleteContactId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить контакт?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <span className="font-medium">{deleteContactId && contacts.find(c => c.id === deleteContactId)?.fullName}</span>
                <span className="block mt-1">Это действие нельзя отменить. Контакт и все связанные данные будут удалены.</span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Отмена</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteContactId && deleteContactMutation.mutate(deleteContactId)}
              data-testid="button-confirm-delete"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
