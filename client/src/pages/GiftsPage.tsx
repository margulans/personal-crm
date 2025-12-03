import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Gift, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Plus, 
  Calendar, 
  Trash2, 
  Pencil,
  Search,
  Filter,
  User
} from "lucide-react";
import { useLocation } from "wouter";
import type { Gift as GiftType, Contact } from "@shared/schema";

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
  contactId: string;
}

interface GiftFormProps {
  onSubmit: (data: GiftFormData) => void;
  onCancel: () => void;
  contacts: Contact[];
  initialData?: Partial<GiftFormData>;
  isEditing?: boolean;
}

function GiftForm({ onSubmit, onCancel, contacts, initialData, isEditing }: GiftFormProps) {
  const [formData, setFormData] = useState<GiftFormData>({
    title: initialData?.title || "",
    description: initialData?.description || "",
    amount: initialData?.amount || "",
    currency: initialData?.currency || "RUB",
    direction: initialData?.direction || "given",
    occasion: initialData?.occasion || "no_occasion",
    date: initialData?.date || new Date().toISOString().split("T")[0],
    contactId: initialData?.contactId || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.contactId) return;
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="contact">Контакт *</Label>
        <Select
          value={formData.contactId}
          onValueChange={(v) => setFormData({ ...formData, contactId: v })}
        >
          <SelectTrigger id="contact" data-testid="select-gift-contact">
            <SelectValue placeholder="Выберите контакт" />
          </SelectTrigger>
          <SelectContent>
            {contacts.map((contact) => (
              <SelectItem key={contact.id} value={contact.id}>
                {contact.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
                <SelectItem value="RUB">₽</SelectItem>
                <SelectItem value="USD">$</SelectItem>
                <SelectItem value="EUR">€</SelectItem>
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
        <Button type="submit" disabled={!formData.title || !formData.contactId} data-testid="button-submit-gift">
          {isEditing ? "Сохранить" : "Добавить"}
        </Button>
      </div>
    </form>
  );
}

export default function GiftsPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showForm, setShowForm] = useState(false);
  const [editingGift, setEditingGift] = useState<GiftType | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDirection, setFilterDirection] = useState<"all" | "given" | "received">("all");
  const [filterOccasion, setFilterOccasion] = useState<string>("all");

  const { data: gifts = [], isLoading: giftsLoading } = useQuery<GiftType[]>({
    queryKey: ["/api/gifts"],
  });

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: GiftFormData) => {
      const res = await apiRequest("POST", "/api/gifts", {
        ...data,
        amount: data.amount ? parseFloat(data.amount) : null,
      });
      return res.json();
    },
    onSuccess: () => {
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

  const getContactName = (contactId: string) => {
    const contact = contacts.find((c) => c.id === contactId);
    return contact?.fullName || "Неизвестный контакт";
  };

  const filteredGifts = gifts.filter((gift) => {
    const matchesSearch = 
      gift.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getContactName(gift.contactId).toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDirection = filterDirection === "all" || gift.direction === filterDirection;
    const matchesOccasion = filterOccasion === "all" || gift.occasion === filterOccasion;
    return matchesSearch && matchesDirection && matchesOccasion;
  });

  const givenGifts = filteredGifts.filter((g) => g.direction === "given");
  const receivedGifts = filteredGifts.filter((g) => g.direction === "received");
  const givenTotal = givenGifts.reduce((sum, g) => sum + (g.amount || 0), 0);
  const receivedTotal = receivedGifts.reduce((sum, g) => sum + (g.amount || 0), 0);

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Подарки</h1>
            <p className="text-sm text-muted-foreground">
              История подарков со всеми контактами
            </p>
          </div>
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="button-add-gift-page">
                <Plus className="h-4 w-4" />
                Добавить подарок
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Добавить подарок</DialogTitle>
              </DialogHeader>
              <GiftForm 
                onSubmit={handleCreate} 
                onCancel={() => setShowForm(false)} 
                contacts={contacts}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Всего подарков</p>
                    <p className="text-2xl font-bold">{filteredGifts.length}</p>
                  </div>
                  <Gift className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Подарено</p>
                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {givenGifts.length}
                    </p>
                    {givenTotal > 0 && (
                      <p className="text-xs text-muted-foreground">
                        ~{givenTotal.toLocaleString()} ₽
                      </p>
                    )}
                  </div>
                  <ArrowUpRight className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Получено</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {receivedGifts.length}
                    </p>
                    {receivedTotal > 0 && (
                      <p className="text-xs text-muted-foreground">
                        ~{receivedTotal.toLocaleString()} ₽
                      </p>
                    )}
                  </div>
                  <ArrowDownLeft className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Поиск по названию или контакту..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                      data-testid="input-search-gifts"
                    />
                  </div>
                </div>
                <Select value={filterDirection} onValueChange={(v) => setFilterDirection(v as "all" | "given" | "received")}>
                  <SelectTrigger className="w-[160px]" data-testid="select-filter-direction">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все направления</SelectItem>
                    <SelectItem value="given">Подарено</SelectItem>
                    <SelectItem value="received">Получено</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterOccasion} onValueChange={setFilterOccasion}>
                  <SelectTrigger className="w-[160px]" data-testid="select-filter-occasion">
                    <SelectValue placeholder="Повод" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все поводы</SelectItem>
                    {OCCASIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Gifts List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Список подарков
                {filteredGifts.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {filteredGifts.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {giftsLoading ? (
                <p className="text-sm text-muted-foreground text-center py-8">Загрузка...</p>
              ) : filteredGifts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {gifts.length === 0 
                    ? "Нет записей о подарках. Добавьте первый подарок!"
                    : "Нет подарков, соответствующих фильтрам"
                  }
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredGifts.map((gift) => {
                    const occasionLabel = OCCASIONS.find((o) => o.value === gift.occasion)?.label || gift.occasion;
                    const formattedDate = new Date(gift.date).toLocaleDateString("ru-RU", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    });
                    const currencySymbol = gift.currency === "RUB" ? "₽" : gift.currency === "USD" ? "$" : gift.currency === "KZT" ? "₸" : "€";

                    return (
                      <div
                        key={gift.id}
                        className="flex gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
                        data-testid={`gift-row-${gift.id}`}
                      >
                        <div
                          className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                            gift.direction === "given"
                              ? "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
                              : "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                          }`}
                        >
                          {gift.direction === "given" ? (
                            <ArrowUpRight className="w-5 h-5" />
                          ) : (
                            <ArrowDownLeft className="w-5 h-5" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-medium">{gift.title}</span>
                            <Badge variant="secondary" className="text-xs px-1.5 py-0">
                              {occasionLabel}
                            </Badge>
                            {gift.amount && (
                              <span className="text-sm text-muted-foreground">
                                {gift.amount.toLocaleString()} {currencySymbol}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="h-3 w-3" />
                            <button
                              className="hover:underline hover:text-foreground"
                              onClick={() => setLocation(`/?contact=${gift.contactId}`)}
                              data-testid={`link-contact-${gift.id}`}
                            >
                              {getContactName(gift.contactId)}
                            </button>
                            {gift.description && (
                              <>
                                <span>•</span>
                                <span className="truncate">{gift.description}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground whitespace-nowrap">
                            {formattedDate}
                          </span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => setEditingGift(gift)}
                              data-testid={`button-edit-gift-${gift.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(gift.id)}
                              data-testid={`button-delete-gift-${gift.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={!!editingGift} onOpenChange={(open) => !open && setEditingGift(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать подарок</DialogTitle>
          </DialogHeader>
          {editingGift && (
            <GiftForm
              onSubmit={handleUpdate}
              onCancel={() => setEditingGift(null)}
              contacts={contacts}
              initialData={{
                title: editingGift.title,
                description: editingGift.description || "",
                amount: editingGift.amount?.toString() || "",
                currency: editingGift.currency || "RUB",
                direction: editingGift.direction as "given" | "received",
                occasion: editingGift.occasion || "no_occasion",
                date: editingGift.date,
                contactId: editingGift.contactId,
              }}
              isEditing
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
