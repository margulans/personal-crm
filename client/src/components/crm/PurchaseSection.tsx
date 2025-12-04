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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ShoppingCart, Plus, Calendar, Trash2, Pencil, TrendingUp } from "lucide-react";
import type { Purchase } from "@shared/schema";

const CATEGORIES = [
  { value: "product", label: "Товар" },
  { value: "service", label: "Услуга" },
  { value: "subscription", label: "Подписка" },
  { value: "consultation", label: "Консультация" },
  { value: "training", label: "Обучение" },
  { value: "license", label: "Лицензия" },
  { value: "support", label: "Поддержка" },
  { value: "other", label: "Другое" },
];

export interface PurchaseFormData {
  productName: string;
  category: string;
  amount: string;
  currency: string;
  purchasedAt: string;
  notes: string;
}

export interface PurchaseFormProps {
  onSubmit: (data: PurchaseFormData) => void;
  onCancel: () => void;
  initialData?: Partial<PurchaseFormData>;
  isEditing?: boolean;
}

export function PurchaseForm({ onSubmit, onCancel, initialData, isEditing }: PurchaseFormProps) {
  const [formData, setFormData] = useState<PurchaseFormData>({
    productName: initialData?.productName || "",
    category: initialData?.category || "product",
    amount: initialData?.amount || "",
    currency: initialData?.currency || "USD",
    purchasedAt: initialData?.purchasedAt || new Date().toISOString().split("T")[0],
    notes: initialData?.notes || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.productName || !formData.amount) return;
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="productName">Название товара/услуги *</Label>
        <Input
          id="productName"
          value={formData.productName}
          onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
          placeholder="Например: Консалтинг, Лицензия ПО, Товар"
          data-testid="input-purchase-product-name"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category">Категория</Label>
          <Select
            value={formData.category}
            onValueChange={(v) => setFormData({ ...formData, category: v })}
          >
            <SelectTrigger id="category" data-testid="select-purchase-category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="purchasedAt">Дата покупки</Label>
          <div className="relative">
            <Input
              id="purchasedAt"
              type="date"
              value={formData.purchasedAt}
              onChange={(e) => setFormData({ ...formData, purchasedAt: e.target.value })}
              className="pl-9"
              data-testid="input-purchase-date"
            />
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Сумма покупки *</Label>
        <div className="flex gap-2">
          <Input
            id="amount"
            type="number"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            placeholder="0"
            className="flex-1"
            data-testid="input-purchase-amount"
          />
          <Select
            value={formData.currency}
            onValueChange={(v) => setFormData({ ...formData, currency: v })}
          >
            <SelectTrigger className="w-20" data-testid="select-purchase-currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="RUB">₽</SelectItem>
              <SelectItem value="USD">$</SelectItem>
              <SelectItem value="EUR">€</SelectItem>
              <SelectItem value="KZT">₸</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Заметки</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Дополнительные детали о покупке..."
          rows={2}
          data-testid="input-purchase-notes"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel-purchase">
          Отмена
        </Button>
        <Button type="submit" disabled={!formData.productName || !formData.amount} data-testid="button-submit-purchase">
          {isEditing ? "Сохранить" : "Добавить"}
        </Button>
      </div>
    </form>
  );
}

interface PurchaseItemProps {
  purchase: Purchase;
  onEdit: (purchase: Purchase) => void;
  onDelete: (id: string) => void;
}

function PurchaseItem({ purchase, onEdit, onDelete }: PurchaseItemProps) {
  const categoryLabel = CATEGORIES.find((c) => c.value === purchase.category)?.label || purchase.category || "Товар";
  
  const formattedDate = purchase.purchasedAt 
    ? new Date(purchase.purchasedAt).toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "short",
        year: purchase.purchasedAt.startsWith(new Date().getFullYear().toString()) ? undefined : "numeric",
      })
    : "";

  const currencySymbol = purchase.currency === "RUB" ? "₽" : purchase.currency === "USD" ? "$" : purchase.currency === "KZT" ? "₸" : "€";

  return (
    <div
      className="flex gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
      data-testid={`purchase-item-${purchase.id}`}
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
        <ShoppingCart className="w-4 h-4" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-sm font-medium">{purchase.productName}</span>
          <Badge variant="secondary" className="text-xs px-1.5 py-0">
            {categoryLabel}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
            {(purchase.amount || 0).toLocaleString()} {currencySymbol}
          </span>
          {purchase.notes && (
            <span className="text-xs text-muted-foreground truncate">{purchase.notes}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{formattedDate}</span>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => onEdit(purchase)}
            data-testid={`button-edit-purchase-${purchase.id}`}
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-destructive hover:text-destructive"
            onClick={() => onDelete(purchase.id)}
            data-testid={`button-delete-purchase-${purchase.id}`}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

interface PurchaseSectionProps {
  contactId: string;
  purchaseTotals?: {
    totalAmount: number;
    currency: string;
    count: number;
    lastPurchaseDate: string | null;
  } | null;
}

export function PurchaseSection({ contactId, purchaseTotals }: PurchaseSectionProps) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);

  const { data: purchases = [], isLoading } = useQuery<Purchase[]>({
    queryKey: ["/api/contacts", contactId, "purchases"],
    queryFn: async () => {
      const res = await fetch(`/api/contacts/${contactId}/purchases`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch purchases");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: PurchaseFormData) => {
      const res = await apiRequest("POST", "/api/purchases", {
        ...data,
        contactId,
        amount: data.amount ? parseFloat(data.amount) : null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", contactId, "purchases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", contactId] });
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      toast({ title: "Покупка добавлена" });
      setShowForm(false);
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PurchaseFormData }) => {
      const res = await apiRequest("PATCH", `/api/purchases/${id}`, {
        ...data,
        amount: data.amount ? parseFloat(data.amount) : null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", contactId, "purchases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", contactId] });
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      toast({ title: "Покупка обновлена" });
      setEditingPurchase(null);
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/purchases/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", contactId, "purchases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", contactId] });
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      toast({ title: "Покупка удалена" });
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const handleCreate = (data: PurchaseFormData) => {
    createMutation.mutate(data);
  };

  const handleUpdate = (data: PurchaseFormData) => {
    if (editingPurchase) {
      updateMutation.mutate({ id: editingPurchase.id, data });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Удалить эту покупку?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleEdit = (purchase: Purchase) => {
    setEditingPurchase(purchase);
  };

  const totalAmount = purchaseTotals?.totalAmount || purchases.reduce((sum, p) => sum + (p.amount || 0), 0);
  const currencySymbol = purchaseTotals?.currency === "USD" ? "$" : purchaseTotals?.currency === "EUR" ? "€" : purchaseTotals?.currency === "KZT" ? "₸" : "₽";

  const getFinancialScoreLabel = (amount: number) => {
    if (amount === 0) return { score: 0, label: "Нет покупок" };
    if (amount < 100000) return { score: 1, label: "До 100 тыс." };
    if (amount < 500000) return { score: 2, label: "100-500 тыс." };
    return { score: 3, label: "500+ тыс." };
  };

  const financialInfo = getFinancialScoreLabel(totalAmount);

  return (
    <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
      <CardHeader className="flex-row items-center justify-between space-y-0 gap-2 pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ShoppingCart className="h-4 w-4" />
          Покупки
          {purchases.length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {purchases.length}
            </Badge>
          )}
        </CardTitle>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1" data-testid="button-add-purchase">
              <Plus className="h-4 w-4" />
              Добавить
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Добавить покупку</DialogTitle>
            </DialogHeader>
            <PurchaseForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-3">
        {totalAmount > 0 && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-blue-100/50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium">Всего покупок:</span>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {totalAmount.toLocaleString()} {currencySymbol}
              </div>
              <div className="text-xs text-muted-foreground">
                Финансовый балл: {financialInfo.score}/3 ({financialInfo.label})
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Загрузка...</p>
        ) : purchases.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Нет записей о покупках
          </p>
        ) : (
          <>
            {purchases.map((purchase) => (
              <PurchaseItem
                key={purchase.id}
                purchase={purchase}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </>
        )}
      </CardContent>

      <Dialog open={!!editingPurchase} onOpenChange={(open) => !open && setEditingPurchase(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать покупку</DialogTitle>
          </DialogHeader>
          {editingPurchase && (
            <PurchaseForm
              onSubmit={handleUpdate}
              onCancel={() => setEditingPurchase(null)}
              initialData={{
                productName: editingPurchase.productName,
                category: editingPurchase.category || "product",
                amount: editingPurchase.amount?.toString() || "",
                currency: editingPurchase.currency || "RUB",
                purchasedAt: editingPurchase.purchasedAt || new Date().toISOString().split("T")[0],
                notes: editingPurchase.notes || "",
              }}
              isEditing
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
