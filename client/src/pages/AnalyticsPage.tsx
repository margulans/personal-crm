import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { AnalyticsMatrix } from "@/components/crm/AnalyticsMatrix";
import { PriorityList } from "@/components/crm/PriorityList";
import { ContactDetail } from "@/components/crm/ContactDetail";
import { ContactForm } from "@/components/crm/ContactForm";
import { HeatStatusBadge } from "@/components/crm/HeatStatusBadge";
import { ImportanceBadge } from "@/components/crm/ImportanceBadge";
import {
  HeatStatusChart,
  ImportanceChart,
  AttentionDistributionChart,
} from "@/components/crm/AnalyticsCharts";
import { contactsApi, interactionsApi, invalidateContacts, invalidateInteractions } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Loader2, 
  Sparkles, 
  Brain, 
  RefreshCw,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertTriangle,
  Target,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Contact, Interaction, InsertContact, AIAnalytics } from "@/lib/types";

const STATUS_LABELS: Record<string, string> = {
  green: "Зелёный",
  yellow: "Жёлтый", 
  red: "Красный",
};

export default function AnalyticsPage() {
  const [, setLocation] = useLocation();
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [matrixFilter, setMatrixFilter] = useState<{ importance: string; status: string } | null>(null);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [editingTab, setEditingTab] = useState<"basic" | "priority" | "contribution" | "potential">("basic");
  const [showAIAnalytics, setShowAIAnalytics] = useState(false);
  const [analyticsRefreshKey, setAnalyticsRefreshKey] = useState(0);
  const { toast } = useToast();

  const { data: contacts = [], isLoading } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  // AI Analytics query with proper cache key segmentation
  const { data: aiAnalytics, isLoading: analyticsLoading } = useQuery<AIAnalytics>({
    queryKey: ["/api/ai/analytics", { refresh: analyticsRefreshKey }],
    queryFn: async () => {
      const url = analyticsRefreshKey > 0 ? "/api/ai/analytics?refresh=true" : "/api/ai/analytics";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch AI analytics");
      return res.json();
    },
    enabled: contacts.length > 0,
  });

  const handleRefreshAnalytics = () => {
    setAnalyticsRefreshKey(prev => prev + 1);
  };

  const { data: interactions = [] } = useQuery<Interaction[]>({
    queryKey: ["/api/contacts", selectedContactId, "interactions"],
    queryFn: () => interactionsApi.getByContact(selectedContactId!),
    enabled: !!selectedContactId,
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

  const selectedContact = contacts.find((c) => c.id === selectedContactId) || null;

  const allTags = Array.from(new Set(contacts.flatMap(c => c.tags || [])));
  const allRoles = Array.from(new Set(contacts.flatMap(c => c.roleTags || [])));

  const openEditForm = (contact: Contact, tab: "basic" | "priority" | "contribution" | "potential" = "basic") => {
    setEditingTab(tab);
    setEditingContact(contact);
  };

  const stats = {
    total: contacts.length,
    green: contacts.filter((c) => c.heatStatus === "green").length,
    yellow: contacts.filter((c) => c.heatStatus === "yellow").length,
    red: contacts.filter((c) => c.heatStatus === "red").length,
    aClass: contacts.filter((c) => c.importanceLevel === "A").length,
    avgHeatIndex: contacts.length > 0
      ? contacts.reduce((sum, c) => sum + c.heatIndex, 0) / contacts.length
      : 0,
  };

  const urgentContacts = contacts.filter(
    (c) =>
      c.heatStatus === "red" &&
      (c.valueCategory.startsWith("A") ||
        c.valueCategory === "BA" ||
        c.valueCategory === "AB")
  );

  const developContacts = contacts.filter(
    (c) =>
      c.heatStatus === "yellow" &&
      (c.valueCategory.startsWith("A") ||
        c.valueCategory === "BA" ||
        c.valueCategory === "AB")
  );

  const matrixFilteredContacts = matrixFilter
    ? contacts.filter(
        (c) => c.importanceLevel === matrixFilter.importance && c.heatStatus === matrixFilter.status
      )
    : [];

  const handleMatrixCellClick = (importance: string, status: string) => {
    const count = contacts.filter(
      (c) => c.importanceLevel === importance && c.heatStatus === status
    ).length;
    if (count > 0) {
      setMatrixFilter({ importance, status });
    }
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
          onEditTab={(tab) => openEditForm(selectedContact, tab as "basic" | "priority" | "contribution" | "potential")}
          onAddInteraction={(data) => {
            addInteractionMutation.mutate({ contactId: selectedContact.id, data });
          }}
        />
        {editDialog}
      </>
    );
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto" data-testid="analytics-page">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Аналитика</h1>
          <p className="text-muted-foreground">
            Обзор состояния вашей сети контактов
          </p>
        </div>

        {/* AI Analytics Panel */}
        {contacts.length > 0 && (
          <Collapsible open={showAIAnalytics} onOpenChange={setShowAIAnalytics}>
            <Card className="ai-gradient border-violet-200/50 dark:border-violet-700/50 shadow-sm overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 shadow-sm">
                      <Brain className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-semibold">AI Аналитика сети</span>
                    {aiAnalytics?.cached && (
                      <Badge variant="outline" className="text-xs font-normal">кэш</Badge>
                    )}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {showAIAnalytics && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleRefreshAnalytics}
                        disabled={analyticsLoading}
                        data-testid="button-refresh-analytics"
                      >
                        <RefreshCw className={cn("h-4 w-4", analyticsLoading && "animate-spin")} />
                      </Button>
                    )}
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" data-testid="button-toggle-analytics">
                        {showAIAnalytics ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                </div>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="pt-2">
                  {analyticsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
                      <span className="ml-2 text-sm text-muted-foreground">Анализирую сеть...</span>
                    </div>
                  ) : aiAnalytics ? (
                    <div className="space-y-6" data-testid="ai-analytics-content">
                      {/* Summary */}
                      <p className="text-base" data-testid="text-ai-summary">{aiAnalytics.summary}</p>

                      {/* Key Trends */}
                      {aiAnalytics.keyTrends && aiAnalytics.keyTrends.length > 0 && (
                        <div className="space-y-3" data-testid="ai-trends-section">
                          <h4 className="text-sm font-semibold flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-violet-500" />
                            Ключевые тенденции
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {aiAnalytics.keyTrends.map((trend, i) => (
                              <div 
                                key={i} 
                                data-testid={`card-trend-${i}`}
                                className={cn(
                                  "p-3 rounded-lg border flex items-start gap-3 transition-all duration-200 hover:shadow-sm",
                                  trend.direction === "positive" && "bg-emerald-50/80 border-emerald-200/70 dark:bg-emerald-900/30 dark:border-emerald-700/50",
                                  trend.direction === "negative" && "bg-red-50/80 border-red-200/70 dark:bg-red-900/30 dark:border-red-700/50",
                                  trend.direction === "neutral" && "bg-blue-50/80 border-blue-200/70 dark:bg-blue-900/30 dark:border-blue-700/50"
                                )}
                              >
                                <div className={cn(
                                  "p-1 rounded-md",
                                  trend.direction === "positive" && "bg-emerald-100 dark:bg-emerald-800/50",
                                  trend.direction === "negative" && "bg-red-100 dark:bg-red-800/50",
                                  trend.direction === "neutral" && "bg-blue-100 dark:bg-blue-800/50"
                                )}>
                                  {trend.direction === "positive" && <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
                                  {trend.direction === "negative" && <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />}
                                  {trend.direction === "neutral" && <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold" data-testid={`text-trend-observation-${i}`}>{trend.observation}</p>
                                  <p className="text-xs text-muted-foreground mt-1">{trend.implication}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <Separator />

                      {/* Strengths and Weaknesses */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Strengths */}
                        {aiAnalytics.strengths && aiAnalytics.strengths.length > 0 && (
                          <div className="space-y-2" data-testid="ai-strengths-section">
                            <h4 className="text-sm font-medium flex items-center gap-1">
                              <CheckCircle className="h-4 w-4 text-emerald-500" />
                              Сильные стороны
                            </h4>
                            <ul className="space-y-1">
                              {aiAnalytics.strengths.map((item, i) => (
                                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2" data-testid={`text-strength-${i}`}>
                                  <span className="text-emerald-500">•</span>
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Weaknesses */}
                        {aiAnalytics.weaknesses && aiAnalytics.weaknesses.length > 0 && (
                          <div className="space-y-2" data-testid="ai-weaknesses-section">
                            <h4 className="text-sm font-medium flex items-center gap-1">
                              <AlertTriangle className="h-4 w-4 text-amber-500" />
                              Зоны развития
                            </h4>
                            <ul className="space-y-1">
                              {aiAnalytics.weaknesses.map((item, i) => (
                                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2" data-testid={`text-weakness-${i}`}>
                                  <span className="text-amber-500">•</span>
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Strategic Recommendations */}
                      {aiAnalytics.strategicRecommendations && aiAnalytics.strategicRecommendations.length > 0 && (
                        <>
                          <Separator />
                          <div className="space-y-3" data-testid="ai-recommendations-section">
                            <h4 className="text-sm font-medium flex items-center gap-1">
                              <Target className="h-4 w-4 text-violet-500" />
                              Стратегические рекомендации
                            </h4>
                            <div className="space-y-2">
                              {aiAnalytics.strategicRecommendations.map((rec, i) => (
                                <div 
                                  key={i} 
                                  data-testid={`card-recommendation-${i}`}
                                  className={cn(
                                    "p-3 rounded-md border",
                                    rec.priority === "high" && "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800",
                                    rec.priority === "medium" && "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800",
                                    rec.priority === "low" && "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800"
                                  )}
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant={
                                      rec.priority === "high" ? "destructive" :
                                      rec.priority === "medium" ? "secondary" : "outline"
                                    }>
                                      {rec.priority === "high" ? "Высокий" :
                                       rec.priority === "medium" ? "Средний" : "Низкий"}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {rec.timeframe}
                                    </span>
                                  </div>
                                  <p className="text-sm font-medium">{rec.recommendation}</p>
                                  <p className="text-xs text-muted-foreground mt-1">{rec.expectedOutcome}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      {/* Focus Areas */}
                      {aiAnalytics.focusAreas && aiAnalytics.focusAreas.length > 0 && (
                        <>
                          <Separator />
                          <div className="flex items-start gap-2 p-3 bg-white/50 dark:bg-black/20 rounded-md" data-testid="ai-focus-areas">
                            <Lightbulb className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium mb-1">Фокус на этой неделе:</p>
                              <ul className="text-sm text-muted-foreground space-y-1">
                                {aiAnalytics.focusAreas.map((area, i) => (
                                  <li key={i} data-testid={`text-focus-${i}`}>• {area}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Не удалось загрузить AI аналитику
                    </p>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card
            className="cursor-pointer hover-elevate transition-all"
            onClick={() => setLocation("/?from=analytics")}
            data-testid="card-total-contacts"
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono">{stats.total}</div>
                  <div className="text-xs text-muted-foreground">Всего контактов</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover-elevate transition-all"
            onClick={() => setLocation("/?status=green")}
            data-testid="card-green-zone"
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {stats.green}
                  </div>
                  <div className="text-xs text-muted-foreground">В зелёной зоне</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover-elevate transition-all"
            onClick={() => setLocation("/?status=red")}
            data-testid="card-red-zone"
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <TrendingDown className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono text-red-600 dark:text-red-400">
                    {stats.red}
                  </div>
                  <div className="text-xs text-muted-foreground">В красной зоне</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover-elevate transition-all"
            onClick={() => setLocation("/?status=yellow")}
            data-testid="card-avg-heat"
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <Activity className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono">
                    {stats.avgHeatIndex.toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground">Средний HeatIndex</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {contacts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                Нет контактов для анализа. Добавьте контакты на странице "Контакты".
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <AnalyticsMatrix
                  contacts={contacts}
                  onCellClick={handleMatrixCellClick}
                />
              </div>

              <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                <PriorityList
                  title="Срочно связаться"
                  description="AA/AB/BA контакты в красной зоне"
                  contacts={urgentContacts}
                  variant="urgent"
                  onContactClick={(c) => setSelectedContactId(c.id)}
                />
                <PriorityList
                  title="Для развития"
                  description="AA/AB/BA контакты в жёлтой зоне"
                  contacts={developContacts}
                  variant="develop"
                  onContactClick={(c) => setSelectedContactId(c.id)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <HeatStatusChart contacts={contacts} />
              <ImportanceChart contacts={contacts} />
              <AttentionDistributionChart contacts={contacts} />
            </div>
          </>
        )}
      </div>

      <Dialog open={!!matrixFilter} onOpenChange={(open) => !open && setMatrixFilter(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {matrixFilter && (
                <>
                  <Badge variant="outline" className="font-mono">
                    {matrixFilter.importance}-класс
                  </Badge>
                  <Badge
                    className={cn(
                      matrixFilter.status === "green" && "bg-emerald-500",
                      matrixFilter.status === "yellow" && "bg-amber-500",
                      matrixFilter.status === "red" && "bg-red-500"
                    )}
                  >
                    {STATUS_LABELS[matrixFilter.status]}
                  </Badge>
                  <span className="text-muted-foreground font-normal">
                    ({matrixFilteredContacts.length})
                  </span>
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-2 pr-4">
              {matrixFilteredContacts.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => {
                    setMatrixFilter(null);
                    setSelectedContactId(contact.id);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all",
                    "hover-elevate cursor-pointer bg-muted/30"
                  )}
                  data-testid={`matrix-contact-${contact.id}`}
                >
                  <HeatStatusBadge status={contact.heatStatus} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{contact.fullName}</span>
                      <ImportanceBadge level={contact.importanceLevel} size="sm" />
                    </div>
                    {contact.roleTags && contact.roleTags.length > 0 && (
                      <div className="flex items-center gap-1 mt-0.5">
                        {contact.roleTags.slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right text-xs text-muted-foreground font-mono">
                    {contact.heatIndex.toFixed(2)}
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
