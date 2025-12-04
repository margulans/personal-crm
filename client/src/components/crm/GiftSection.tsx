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
import { Gift, ArrowUpRight, ArrowDownLeft, Plus, Calendar, Trash2, Pencil } from "lucide-react";
import type { Gift as GiftType } from "@shared/schema";

const OCCASIONS = [
  { value: "birthday", label: "День рождения" },
  { value: "new_year", label: "Новый год" },
  { value: "anniversary", label: "Годовщина" },
  { value: "holiday", label: "Праздник" },
  { value: "business", label: "Деловой повод" },
  { value: "thank_you", label: "Благодарность" },
  { value: "apology", label: "Извинение" },
  { value: "no_occasion", label: "Без повода" },
  { value: "other", label: "Другое" },
];

interface GiftFormData {
  title: string;
  description: string;
  amount: string;
  currency: string;
  direction: "given" | "received";
  occasion: string;
  date: string;
}

interface GiftFormProps {
  onSubmit: (data: GiftFormData) => void;
  onCancel: () => void;
  initialData?: Partial<GiftFormData>;
  isEditing?: boolean;
}

function GiftForm({ onSubmit, onCancel, initialData, isEditing }: GiftFormProps) {
  const [formData, setFormData] = useState<GiftFormData>({
    title: initialData?.title || "",
    description: initialData?.description || "",
    amount: initialData?.amount || "",
    currency: initialData?.currency || "USD",
    direction: initialData?.direction || "given",
    occasion: initialData?.occasion || "no_occasion",
    date: initialData?.date || new Date().toISOString().split("T")[0],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Название подарка *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Например: Книга, Часы, Букет"
          data-testid="input-gift-title"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="direction">Направление</Label>
          <Select
            value={formData.direction}
            onValueChange={(v) => setFormData({ ...formData, direction: v as "given" | "received" })}
          >
            <SelectTrigger id="direction" data-testid="select-gift-direction">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="given">Подарен контакту</SelectItem>
              <SelectItem value="received">Получен от контакта</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="date">Дата</Label>
          <div className="relative">
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="pl-9"
              data-testid="input-gift-date"
            />
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="amount">Примерная стоимость</Label>
          <div className="flex gap-2">
            <Input
              id="amount"
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0"
              className="flex-1"
              data-testid="input-gift-amount"
            />
            <Select
              value={formData.currency}
              onValueChange={(v) => setFormData({ ...formData, currency: v })}
            >
              <SelectTrigger className="w-20" data-testid="select-gift-currency">
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

        <div className="space-y-2">
          <Label htmlFor="occasion">Повод</Label>
          <Select
            value={formData.occasion}
            onValueChange={(v) => setFormData({ ...formData, occasion: v })}
          >
            <SelectTrigger id="occasion" data-testid="select-gift-occasion">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OCCASIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Описание</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Дополнительные детали о подарке..."
          rows={2}
          data-testid="input-gift-description"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel-gift">
          Отмена
        </Button>
        <Button type="submit" disabled={!formData.title} data-testid="button-submit-gift">
          {isEditing ? "Сохранить" : "Добавить"}
        </Button>
      </div>
    </form>
  );
}

interface GiftItemProps {
  gift: GiftType;
  onEdit: (gift: GiftType) => void;
  onDelete: (id: string) => void;
}

function GiftItem({ gift, onEdit, onDelete }: GiftItemProps) {
  const occasionLabel = OCCASIONS.find((o) => o.value === gift.occasion)?.label || gift.occasion;
  
  const formattedDate = new Date(gift.date).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: gift.date.startsWith(new Date().getFullYear().toString()) ? undefined : "numeric",
  });

  const currencySymbol = gift.currency === "USD" ? "$" : gift.currency === "EUR" ? "€" : gift.currency === "KZT" ? "₸" : "₽";

  return (
    <div
      className="flex gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
      data-testid={`gift-item-${gift.id}`}
    >
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          gift.direction === "given"
            ? "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
            : "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
        }`}
      >
        {gift.direction === "given" ? (
          <ArrowUpRight className="w-4 h-4" />
        ) : (
          <ArrowDownLeft className="w-4 h-4" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-sm font-medium">{gift.title}</span>
          <Badge variant="secondary" className="text-xs px-1.5 py-0">
            {occasionLabel}
          </Badge>
          {gift.amount && (
            <span className="text-xs text-muted-foreground">
              {gift.amount.toLocaleString()} {currencySymbol}
            </span>
          )}
        </div>
        {gift.description && (
          <p className="text-sm text-muted-foreground line-clamp-1">{gift.description}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{formattedDate}</span>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => onEdit(gift)}
            data-testid={`button-edit-gift-${gift.id}`}
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-destructive hover:text-destructive"
            onClick={() => onDelete(gift.id)}
            data-testid={`button-delete-gift-${gift.id}`}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

interface GiftSectionProps {
  contactId: string;
}

export function GiftSection({ contactId }: GiftSectionProps) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingGift, setEditingGift] = useState<GiftType | null>(null);

  const { data: gifts = [], isLoading } = useQuery<GiftType[]>({
    queryKey: ["/api/contacts", contactId, "gifts"],
    queryFn: async () => {
      const res = await fetch(`/api/contacts/${contactId}/gifts`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch gifts");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: GiftFormData) => {
      const res = await apiRequest("POST", "/api/gifts", {
        ...data,
        contactId,
        amount: data.amount ? parseFloat(data.amount) : null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", contactId, "gifts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gifts"] });
      toast({ title: "Подарок добавлен" });
      setShowForm(false);
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: GiftFormData }) => {
      const res = await apiRequest("PATCH", `/api/gifts/${id}`, {
        ...data,
        amount: data.amount ? parseFloat(data.amount) : null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", contactId, "gifts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gifts"] });
      toast({ title: "Подарок обновлён" });
      setEditingGift(null);
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/gifts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", contactId, "gifts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gifts"] });
      toast({ title: "Подарок удалён" });
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const handleCreate = (data: GiftFormData) => {
    createMutation.mutate(data);
  };

  const handleUpdate = (data: GiftFormData) => {
    if (editingGift) {
      updateMutation.mutate({ id: editingGift.id, data });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Удалить этот подарок?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleEdit = (gift: GiftType) => {
    setEditingGift(gift);
  };

  const givenGifts = gifts.filter((g) => g.direction === "given");
  const receivedGifts = gifts.filter((g) => g.direction === "received");
  
  const givenTotal = givenGifts.reduce((sum, g) => sum + (g.amount || 0), 0);
  const receivedTotal = receivedGifts.reduce((sum, g) => sum + (g.amount || 0), 0);

  return (
    <Card className="bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-slate-600">
      <CardHeader className="flex-row items-center justify-between space-y-0 gap-2 pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Gift className="h-4 w-4" />
          Подарки
          {gifts.length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {gifts.length}
            </Badge>
          )}
        </CardTitle>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1" data-testid="button-add-gift">
              <Plus className="h-4 w-4" />
              Добавить
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Добавить подарок</DialogTitle>
            </DialogHeader>
            <GiftForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Загрузка...</p>
        ) : gifts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Нет записей о подарках
          </p>
        ) : (
          <>
            {gifts.length > 0 && (
              <div className="flex gap-4 text-xs text-muted-foreground mb-2 pb-2 border-b">
                <span>
                  Подарено: <span className="font-medium text-orange-600 dark:text-orange-400">{givenGifts.length}</span>
                  {givenTotal > 0 && ` (~$${givenTotal.toLocaleString()})`}
                </span>
                <span>
                  Получено: <span className="font-medium text-green-600 dark:text-green-400">{receivedGifts.length}</span>
                  {receivedTotal > 0 && ` (~$${receivedTotal.toLocaleString()})`}
                </span>
              </div>
            )}
            {gifts.map((gift) => (
              <GiftItem
                key={gift.id}
                gift={gift}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </>
        )}
      </CardContent>

      <Dialog open={!!editingGift} onOpenChange={(open) => !open && setEditingGift(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать подарок</DialogTitle>
          </DialogHeader>
          {editingGift && (
            <GiftForm
              onSubmit={handleUpdate}
              onCancel={() => setEditingGift(null)}
              initialData={{
                title: editingGift.title,
                description: editingGift.description || "",
                amount: editingGift.amount?.toString() || "",
                currency: editingGift.currency || "USD",
                direction: editingGift.direction as "given" | "received",
                occasion: editingGift.occasion || "no_occasion",
                date: editingGift.date,
              }}
              isEditing
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
