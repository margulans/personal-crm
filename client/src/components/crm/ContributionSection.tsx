import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Heart, Plus, Calendar, Trash2, Pencil, DollarSign, X, Lightbulb, Users, Shield, Brain, Sparkles } from "lucide-react";
import type { Contribution, ContributionCriterionType } from "@shared/schema";

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

export interface ContributionFormData {
  criterionType: ContributionCriterionType;
  title: string;
  amount: string;
  currency: string;
  contributedAt: string;
  notes: string;
  hasAmount: boolean;
}

export interface ContributionFormProps {
  onSubmit: (data: ContributionFormData) => void;
  onCancel: () => void;
  initialData?: Partial<ContributionFormData>;
  isEditing?: boolean;
  defaultCriterion?: ContributionCriterionType;
}

export function ContributionForm({ onSubmit, onCancel, initialData, isEditing, defaultCriterion }: ContributionFormProps) {
  const [formData, setFormData] = useState<ContributionFormData>({
    criterionType: initialData?.criterionType || defaultCriterion || "financial",
    title: initialData?.title || "",
    amount: initialData?.amount || "",
    currency: initialData?.currency || "USD",
    contributedAt: initialData?.contributedAt || new Date().toISOString().split("T")[0],
    notes: initialData?.notes || "",
    hasAmount: initialData?.hasAmount ?? (initialData?.amount ? true : false),
  });

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
        <Label htmlFor="title">Описание вклада *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Например: Рекомендация клиента, Помощь с проектом, Консультация"
          data-testid="input-contribution-title"
        />
      </div>

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
                <SelectItem value="RUB">₽</SelectItem>
                <SelectItem value="EUR">€</SelectItem>
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
}

function ContributionItem({ contribution, onEdit, onDelete }: ContributionItemProps) {
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
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingContribution, setEditingContribution] = useState<Contribution | null>(null);
  const [filterCriterion, setFilterCriterion] = useState<string>("all");

  const { data: contributions = [], isLoading } = useQuery<Contribution[]>({
    queryKey: ["/api/contacts", contactId, "contributions"],
    queryFn: async () => {
      const response = await fetch(`/api/contacts/${contactId}/contributions`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch contributions");
      return response.json();
    },
  });

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

  const filteredContributions = filterCriterion === "all" 
    ? contributions 
    : contributions.filter(c => c.criterionType === filterCriterion);

  const getTotalStats = () => {
    const totalCount = contributions.length;
    const totalAmount = contributions.reduce((sum, c) => sum + (c.amount || 0), 0);
    return { totalCount, totalAmount };
  };

  const stats = getTotalStats();

  return (
    <Card data-testid="contribution-section">
      <CardHeader className="flex-row items-center justify-between space-y-0 gap-2 pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Вклады ({stats.totalCount})
          {stats.totalAmount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {stats.totalAmount.toLocaleString()} $
            </Badge>
          )}
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
            </DialogHeader>
            <ContributionForm
              onSubmit={(data) => createMutation.mutate(data)}
              onCancel={() => setIsAddOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-3">
        {contributions.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <Button
              size="sm"
              variant={filterCriterion === "all" ? "default" : "outline"}
              onClick={() => setFilterCriterion("all")}
              className="text-xs h-7"
              data-testid="filter-all-contributions"
            >
              Все
            </Button>
            {CRITERION_TYPES.map((ct) => {
              const count = contributions.filter(c => c.criterionType === ct.value).length;
              if (count === 0) return null;
              return (
                <Button
                  key={ct.value}
                  size="sm"
                  variant={filterCriterion === ct.value ? "default" : "outline"}
                  onClick={() => setFilterCriterion(ct.value)}
                  className="text-xs h-7 gap-1"
                  data-testid={`filter-${ct.value}-contributions`}
                >
                  <ct.icon className={`h-3 w-3 ${ct.color}`} />
                  {ct.label} ({count})
                </Button>
              );
            })}
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Загрузка...
          </div>
        ) : filteredContributions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>{contributions.length === 0 ? "Вклады не добавлены" : "Нет вкладов в этой категории"}</p>
            {contributions.length === 0 && (
              <p className="text-sm mt-1">Отмечайте вклады контакта: финансовые, ресурсные, репутационные и др.</p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredContributions.map((contribution) => (
              <ContributionItem
                key={contribution.id}
                contribution={contribution}
                onEdit={setEditingContribution}
                onDelete={(id) => deleteMutation.mutate(id)}
              />
            ))}
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
              }}
              onSubmit={(data) => updateMutation.mutate({ id: editingContribution.id, data })}
              onCancel={() => setEditingContribution(null)}
              isEditing
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
