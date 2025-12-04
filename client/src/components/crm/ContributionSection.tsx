import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import * as React from "react";
import { Heart, Plus, Calendar, Trash2, Pencil, DollarSign, X, Lightbulb, Users, User, Shield, Brain, Sparkles, Search, ExternalLink, Check, ChevronsUpDown } from "lucide-react";
import type { Contribution, ContributionCriterionType, Contact, Purchase } from "@shared/schema";
import { cn } from "@/lib/utils";

interface ContributionOrPurchase {
  id: string;
  type: "contribution" | "purchase";
  criterionType: ContributionCriterionType;
  title: string;
  amount: number | null;
  currency: string | null;
  date: string;
  notes: string | null;
  introducedContactId?: string | null;
  originalData: Contribution | Purchase;
}

const CRITERION_TYPES: { value: ContributionCriterionType; label: string; icon: typeof Heart; color: string }[] = [
  { value: "financial", label: "Финансовый", icon: DollarSign, color: "text-emerald-600" },
  { value: "network", label: "Ресурсный", icon: Users, color: "text-blue-600" },
  { value: "trust", label: "Репутационный", icon: Shield, color: "text-purple-600" },
  { value: "emotional", label: "Эмоциональный", icon: Heart, color: "text-pink-600" },
  { value: "intellectual", label: "Интеллектуальный", icon: Brain, color: "text-amber-600" },
];

const CRITERION_LABELS: Record<ContributionCriterionType, string> = {
  financial: "Финансовый",
  network: "Ресурсный",
  trust: "Репутационный",
  emotional: "Эмоциональный",
  intellectual: "Интеллектуальный",
};

const CONTRIBUTION_EXAMPLES: Record<ContributionCriterionType, string[]> = {
  financial: [
    "Покупка продукта/услуги",
    "Инвестиция в проект",
    "Привёл платящего клиента",
    "Оплатил совместное мероприятие",
    "Финансовая поддержка",
    "Спонсорство события",
    "Другое",
  ],
  network: [
    "Познакомил с важным человеком",
    "Открыл доступ к ресурсам",
    "Рекомендовал партнёра",
    "Пригласил на закрытое мероприятие",
    "Предоставил контакты",
    "Помог с наймом сотрудника",
    "Другое",
  ],
  trust: [
    "Публичная рекомендация",
    "Отзыв о работе",
    "Защита репутации",
    "Поручительство",
    "Рекомендация в соцсетях",
    "Упоминание на конференции",
    "Другое",
  ],
  emotional: [
    "Поддержка в трудный момент",
    "Приятное общение",
    "Поздравление с праздником",
    "Неожиданный знак внимания",
    "Мотивирующий разговор",
    "Помощь с личной проблемой",
    "Другое",
  ],
  intellectual: [
    "Экспертная консультация",
    "Обучение навыку",
    "Ценный совет по бизнесу",
    "Менторская сессия",
    "Поделился полезными материалами",
    "Помог решить сложную задачу",
    "Другое",
  ],
};

export interface ContributionFormData {
  criterionType: ContributionCriterionType;
  title: string;
  amount: string;
  currency: string;
  contributedAt: string;
  notes: string;
  hasAmount: boolean;
  introducedContactId: string | null;
}

type ContactForSelect = {
  id: string;
  fullName: string;
  company?: string | null | undefined;
};

export interface ContributionFormProps {
  onSubmit: (data: ContributionFormData) => void;
  onCancel: () => void;
  initialData?: Partial<ContributionFormData>;
  isEditing?: boolean;
  defaultCriterion?: ContributionCriterionType;
  contacts?: ContactForSelect[];
  currentContactId?: string;
}

export function ContributionForm({ onSubmit, onCancel, initialData, isEditing, defaultCriterion, contacts = [], currentContactId }: ContributionFormProps) {
  const [formData, setFormData] = useState<ContributionFormData>({
    criterionType: initialData?.criterionType || defaultCriterion || "financial",
    title: initialData?.title || "",
    amount: initialData?.amount || "",
    currency: initialData?.currency || "USD",
    contributedAt: initialData?.contributedAt || new Date().toISOString().split("T")[0],
    notes: initialData?.notes || "",
    hasAmount: initialData?.hasAmount ?? (initialData?.amount ? true : false),
    introducedContactId: initialData?.introducedContactId || null,
  });
  const [contactSearchQuery, setContactSearchQuery] = useState("");
  const [contactSearchOpen, setContactSearchOpen] = useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  
  const availableContacts = contacts.filter(c => c.id !== currentContactId);
  
  const selectedContact = formData.introducedContactId 
    ? availableContacts.find(c => c.id === formData.introducedContactId) 
    : null;
    
  const filteredContacts = contactSearchQuery.trim() 
    ? availableContacts.filter(c => 
        c.fullName.toLowerCase().includes(contactSearchQuery.toLowerCase()) ||
        (c.company && c.company.toLowerCase().includes(contactSearchQuery.toLowerCase()))
      )
    : availableContacts;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;
    if (formData.hasAmount && !formData.amount) return;
    onSubmit(formData);
  };

  const getCriterionInfo = (type: ContributionCriterionType) => {
    return CRITERION_TYPES.find(c => c.value === type);
  };

  const criterionInfo = getCriterionInfo(formData.criterionType);
  const Icon = criterionInfo?.icon || Heart;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="criterionType">Тип вклада *</Label>
        <Select
          value={formData.criterionType}
          onValueChange={(v) => setFormData({ ...formData, criterionType: v as ContributionCriterionType })}
        >
          <SelectTrigger id="criterionType" data-testid="select-contribution-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CRITERION_TYPES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                <div className="flex items-center gap-2">
                  <c.icon className={`h-4 w-4 ${c.color}`} />
                  <span>{c.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Примеры вкладов</Label>
        <Select
          value=""
          onValueChange={(v) => setFormData({ ...formData, title: v })}
        >
          <SelectTrigger data-testid="select-contribution-example">
            <SelectValue placeholder="Выберите из примеров или введите свой" />
          </SelectTrigger>
          <SelectContent>
            {CONTRIBUTION_EXAMPLES[formData.criterionType].map((example) => (
              <SelectItem key={example} value={example}>
                {example}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Описание вклада *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Или введите своё описание"
          data-testid="input-contribution-title"
        />
      </div>

      {formData.criterionType === "network" && availableContacts.length > 0 && (
        <div className="space-y-2">
          <Label>С кем познакомил?</Label>
          <div className="relative">
            {selectedContact ? (
              <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                  <User className="h-3 w-3 mr-1" />
                  {selectedContact.fullName}
                  {selectedContact.company && (
                    <span className="ml-1 opacity-70">({selectedContact.company})</span>
                  )}
                </Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 ml-auto"
                  onClick={() => {
                    setFormData({ ...formData, introducedContactId: null });
                    setContactSearchQuery("");
                  }}
                  data-testid="button-clear-introduced-contact"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <Input
                  ref={inputRef}
                  value={contactSearchQuery}
                  onChange={(e) => {
                    setContactSearchQuery(e.target.value);
                    setContactSearchOpen(true);
                  }}
                  onFocus={() => setContactSearchOpen(true)}
                  onBlur={() => {
                    setTimeout(() => setContactSearchOpen(false), 200);
                  }}
                  placeholder="Начните вводить имя контакта..."
                  data-testid="input-introduced-contact-search"
                  className="pr-8"
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                
                {contactSearchOpen && filteredContacts.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {filteredContacts.slice(0, 10).map((contact) => (
                      <div
                        key={contact.id}
                        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover-elevate"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setFormData({ ...formData, introducedContactId: contact.id });
                          setContactSearchQuery("");
                          setContactSearchOpen(false);
                        }}
                        data-testid={`suggestion-contact-${contact.id}`}
                      >
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{contact.fullName}</span>
                        {contact.company && (
                          <span className="text-muted-foreground text-sm">({contact.company})</span>
                        )}
                      </div>
                    ))}
                    {filteredContacts.length > 10 && (
                      <div className="px-3 py-2 text-sm text-muted-foreground border-t">
                        Ещё {filteredContacts.length - 10} контактов...
                      </div>
                    )}
                  </div>
                )}
                
                {contactSearchOpen && contactSearchQuery.trim() && filteredContacts.length === 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg">
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      Контакт не найден
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Введите имя, чтобы найти контакт из вашего списка
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="contributedAt">Дата</Label>
        <div className="flex gap-1 items-center">
          <div className="relative flex-1">
            <Input
              id="contributedAt"
              type="date"
              value={formData.contributedAt}
              onChange={(e) => setFormData({ ...formData, contributedAt: e.target.value })}
              className="pl-9"
              data-testid="input-contribution-date"
            />
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
          {formData.contributedAt && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setFormData({ ...formData, contributedAt: "" })}
              data-testid="button-clear-contribution-date"
              title="Сбросить дату"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
        <Switch
          id="hasAmount"
          checked={formData.hasAmount}
          onCheckedChange={(checked) => setFormData({ ...formData, hasAmount: checked, amount: checked ? formData.amount : "" })}
          data-testid="switch-has-amount"
        />
        <Label htmlFor="hasAmount" className="cursor-pointer flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <span>Денежная оценка</span>
        </Label>
      </div>

      {formData.hasAmount && (
        <div className="space-y-2">
          <Label htmlFor="amount">Сумма</Label>
          <div className="flex gap-2">
            <Input
              id="amount"
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0"
              className="flex-1"
              data-testid="input-contribution-amount"
            />
            <Select
              value={formData.currency}
              onValueChange={(v) => setFormData({ ...formData, currency: v })}
            >
              <SelectTrigger className="w-20" data-testid="select-contribution-currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">$</SelectItem>
                <SelectItem value="EUR">€</SelectItem>
                <SelectItem value="RUB">₽</SelectItem>
                <SelectItem value="KZT">₸</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="notes">Заметки</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Дополнительные детали..."
          rows={2}
          data-testid="input-contribution-notes"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel-contribution">
          Отмена
        </Button>
        <Button 
          type="submit" 
          disabled={!formData.title || (formData.hasAmount && !formData.amount)} 
          data-testid="button-submit-contribution"
        >
          {isEditing ? "Сохранить" : "Добавить"}
        </Button>
      </div>
    </form>
  );
}

interface ContributionItemProps {
  contribution: Contribution;
  onEdit: (contribution: Contribution) => void;
  onDelete: (id: string) => void;
  contacts?: ContactForSelect[];
  onNavigateToContact?: (contactId: string) => void;
}

function ContributionItem({ contribution, onEdit, onDelete, contacts = [], onNavigateToContact }: ContributionItemProps) {
  const criterionInfo = CRITERION_TYPES.find(c => c.value === contribution.criterionType);
  const Icon = criterionInfo?.icon || Heart;

  const formatAmount = (amount: number | null, currency: string | null) => {
    if (!amount) return null;
    const symbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : currency === "KZT" ? "₸" : "₽";
    return `${amount.toLocaleString()} ${symbol}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const introducedContact = contribution.introducedContactId 
    ? contacts.find(c => c.id === contribution.introducedContactId)
    : null;

  return (
    <div 
      className="flex items-start gap-3 p-3 rounded-lg border bg-card hover-elevate transition-colors"
      data-testid={`contribution-item-${contribution.id}`}
    >
      <div className={`p-2 rounded-full bg-muted ${criterionInfo?.color || "text-muted-foreground"}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate" data-testid={`text-contribution-title-${contribution.id}`}>
              {contribution.title}
            </p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="secondary" className="text-xs">
                {CRITERION_LABELS[contribution.criterionType as ContributionCriterionType] || contribution.criterionType}
              </Badge>
              {introducedContact && (
                <Badge 
                  variant="outline" 
                  className="text-xs text-blue-600 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950 gap-1"
                  onClick={() => onNavigateToContact?.(introducedContact.id)}
                  data-testid={`link-introduced-contact-${contribution.id}`}
                >
                  <ExternalLink className="h-3 w-3" />
                  {introducedContact.fullName}
                </Badge>
              )}
              {contribution.amount && contribution.amount > 0 && (
                <Badge variant="outline" className="text-xs text-emerald-600">
                  {formatAmount(contribution.amount, contribution.currency)}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {formatDate(contribution.contributedAt)}
              </span>
            </div>
            {contribution.notes && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{contribution.notes}</p>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onEdit(contribution)}
              className="h-8 w-8"
              data-testid={`button-edit-contribution-${contribution.id}`}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onDelete(contribution.id)}
              className="h-8 w-8 text-destructive hover:text-destructive"
              data-testid={`button-delete-contribution-${contribution.id}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface PurchaseItemProps {
  item: ContributionOrPurchase;
}

function PurchaseItem({ item }: PurchaseItemProps) {
  const formatAmount = (amount: number | null, currency: string | null) => {
    if (!amount) return null;
    const symbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : currency === "KZT" ? "₸" : "₽";
    return `${amount.toLocaleString()} ${symbol}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div 
      className="flex items-start gap-3 p-3 rounded-lg border bg-card hover-elevate transition-colors"
      data-testid={`purchase-item-${item.id}`}
    >
      <div className="p-2 rounded-full bg-muted text-emerald-600">
        <DollarSign className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate" data-testid={`text-purchase-title-${item.id}`}>
              {item.title}
            </p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="secondary" className="text-xs">
                Финансовый (покупка)
              </Badge>
              {item.amount && item.amount > 0 && (
                <Badge variant="outline" className="text-xs text-emerald-600">
                  {formatAmount(item.amount, item.currency)}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {formatDate(item.date)}
              </span>
            </div>
            {item.notes && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.notes}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ContributionSectionProps {
  contactId: string;
  contributionTotals?: {
    [key: string]: {
      totalAmount: number;
      currency: string;
      count: number;
      lastDate: string | null;
    };
  } | null;
}

export function ContributionSection({ contactId, contributionTotals }: ContributionSectionProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingContribution, setEditingContribution] = useState<Contribution | null>(null);
  const [filterCriterion, setFilterCriterion] = useState<string>("all");

  const { data: contributions = [], isLoading: isLoadingContributions } = useQuery<Contribution[]>({
    queryKey: ["/api/contacts", contactId, "contributions"],
    queryFn: async () => {
      const response = await fetch(`/api/contacts/${contactId}/contributions`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch contributions");
      return response.json();
    },
  });

  const { data: purchases = [], isLoading: isLoadingPurchases } = useQuery<Purchase[]>({
    queryKey: ["/api/contacts", contactId, "purchases"],
    queryFn: async () => {
      const response = await fetch(`/api/contacts/${contactId}/purchases`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch purchases");
      return response.json();
    },
  });

  const { data: allContacts = [] } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const isLoading = isLoadingContributions || isLoadingPurchases;

  // Combine contributions and purchases into unified list
  const allItems: ContributionOrPurchase[] = [
    ...contributions.map((c): ContributionOrPurchase => ({
      id: c.id,
      type: "contribution",
      criterionType: c.criterionType as ContributionCriterionType,
      title: c.title,
      amount: c.amount,
      currency: c.currency,
      date: c.contributedAt,
      notes: c.notes,
      introducedContactId: c.introducedContactId,
      originalData: c,
    })),
    ...purchases.map((p): ContributionOrPurchase => ({
      id: p.id,
      type: "purchase",
      criterionType: "financial" as ContributionCriterionType,
      title: p.productName,
      amount: p.amount,
      currency: p.currency,
      date: p.purchasedAt,
      notes: p.notes,
      originalData: p,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleNavigateToContact = (targetContactId: string) => {
    navigate(`/?contact=${targetContactId}`);
  };

  const createMutation = useMutation({
    mutationFn: async (data: ContributionFormData) => {
      const res = await apiRequest("POST", "/api/contributions", {
        contactId,
        criterionType: data.criterionType,
        title: data.title,
        amount: data.hasAmount && data.amount ? parseFloat(data.amount) : null,
        currency: data.currency,
        contributedAt: data.contributedAt,
        notes: data.notes || null,
        introducedContactId: data.introducedContactId || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", contactId, "contributions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", contactId] });
      setIsAddOpen(false);
      toast({ title: "Вклад добавлен" });
    },
    onError: () => {
      toast({ title: "Ошибка при добавлении", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ContributionFormData }) => {
      const res = await apiRequest("PATCH", `/api/contributions/${id}`, {
        criterionType: data.criterionType,
        title: data.title,
        amount: data.hasAmount && data.amount ? parseFloat(data.amount) : null,
        currency: data.currency,
        contributedAt: data.contributedAt,
        notes: data.notes || null,
        introducedContactId: data.introducedContactId || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", contactId, "contributions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", contactId] });
      setEditingContribution(null);
      toast({ title: "Вклад обновлён" });
    },
    onError: () => {
      toast({ title: "Ошибка при обновлении", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/contributions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", contactId, "contributions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", contactId] });
      toast({ title: "Вклад удалён" });
    },
    onError: () => {
      toast({ title: "Ошибка при удалении", variant: "destructive" });
    },
  });

  const filteredItems = filterCriterion === "all" 
    ? allItems 
    : allItems.filter(c => c.criterionType === filterCriterion);

  const getTotalStats = () => {
    const totalCount = allItems.length;
    const totalAmount = allItems.reduce((sum, c) => sum + (c.amount || 0), 0);
    return { totalCount, totalAmount };
  };

  const stats = getTotalStats();

  return (
    <Card data-testid="contribution-section">
      <CardHeader className="flex-row items-center justify-between space-y-0 gap-2 pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          История вкладов
        </CardTitle>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-add-contribution">
              <Plus className="h-4 w-4 mr-1" />
              Добавить
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Добавить вклад</DialogTitle>
              <DialogDescription asChild>
                <div className="text-sm text-muted-foreground space-y-2 pt-2">
                  <p>Вклады влияют на расчёт Contribution Score (макс. 15 баллов):</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li><strong>Финансовый</strong> — 50% веса (до 7.5 б.). Расчёт по сумме: $0=0, до $1000=1, до $5000=2, $5000+=3 балла</li>
                    <li><strong>Ресурсный, Репутационный, Эмоциональный, Интеллектуальный</strong> — по 12.5% (до 1.875 б. каждый). Расчёт по кол-ву записей: 0=0, 1-2=1, 3-4=2, 5+=3 балла</li>
                  </ul>
                </div>
              </DialogDescription>
            </DialogHeader>
            <ContributionForm
              onSubmit={(data) => createMutation.mutate(data)}
              onCancel={() => setIsAddOpen(false)}
              contacts={allContacts}
              currentContactId={contactId}
            />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-1">
          <Button
            size="sm"
            variant={filterCriterion === "all" ? "default" : "outline"}
            onClick={() => setFilterCriterion("all")}
            className="text-xs h-7"
            data-testid="filter-all-contributions"
          >
            Все ({allItems.length})
          </Button>
          {CRITERION_TYPES.map((ct) => {
            const count = allItems.filter(c => c.criterionType === ct.value).length;
            return (
              <Button
                key={ct.value}
                size="sm"
                variant={filterCriterion === ct.value ? "default" : "outline"}
                onClick={() => setFilterCriterion(ct.value)}
                className={`text-xs h-7 gap-1 ${count === 0 ? "opacity-50" : ""}`}
                data-testid={`filter-${ct.value}-contributions`}
              >
                <ct.icon className={`h-3 w-3 ${ct.color}`} />
                {ct.label} ({count})
              </Button>
            );
          })}
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Загрузка...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>{allItems.length === 0 ? "Вклады не добавлены" : "Нет вкладов в этой категории"}</p>
            {allItems.length === 0 && (
              <p className="text-sm mt-1">Отмечайте вклады контакта: финансовые, ресурсные, репутационные и др.</p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredItems.map((item) => {
              if (item.type === "contribution") {
                return (
                  <ContributionItem
                    key={`contribution-${item.id}`}
                    contribution={item.originalData as Contribution}
                    onEdit={setEditingContribution}
                    onDelete={(id) => deleteMutation.mutate(id)}
                    contacts={allContacts}
                    onNavigateToContact={handleNavigateToContact}
                  />
                );
              } else {
                return (
                  <PurchaseItem
                    key={`purchase-${item.id}`}
                    item={item}
                  />
                );
              }
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={!!editingContribution} onOpenChange={(open) => !open && setEditingContribution(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать вклад</DialogTitle>
          </DialogHeader>
          {editingContribution && (
            <ContributionForm
              initialData={{
                criterionType: editingContribution.criterionType as ContributionCriterionType,
                title: editingContribution.title,
                amount: editingContribution.amount?.toString() || "",
                currency: editingContribution.currency || "USD",
                contributedAt: editingContribution.contributedAt,
                notes: editingContribution.notes || "",
                hasAmount: !!editingContribution.amount && editingContribution.amount > 0,
                introducedContactId: editingContribution.introducedContactId || null,
              }}
              onSubmit={(data) => updateMutation.mutate({ id: editingContribution.id, data })}
              onCancel={() => setEditingContribution(null)}
              isEditing
              contacts={allContacts}
              currentContactId={contactId}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
