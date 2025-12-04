import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { HeatStatusBadge } from "./HeatStatusBadge";
import { ImportanceBadge } from "./ImportanceBadge";
import { AttentionGapIndicator } from "./AttentionGapIndicator";
import { ScorePanel } from "./ScorePanel";
import { InteractionItem } from "./InteractionItem";
import { InteractionForm } from "./InteractionForm";
import { ATTENTION_LEVELS, CONTRIBUTION_CRITERIA, formatDaysAgo, calculateContributionScore, calculatePotentialScore, getClassFromScore } from "@/lib/constants";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Phone,
  Mail,
  Link as LinkIcon,
  Link2,
  Plus,
  Edit,
  Check,
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  Lightbulb,
  Info,
  Building2,
  MessageCircle,
  Users,
  Calendar,
  Heart,
  Sparkles,
  Brain,
  RefreshCw,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Target,
  MessageSquare,
  Gift,
  Paperclip,
  FileArchive,
  User,
  Briefcase,
  Star,
  Trash2,
  Camera,
  Upload,
} from "lucide-react";
import { useLocation } from "wouter";

import type { Contact, Interaction, PhoneEntry, MessengerEntry, SocialAccountEntry, EmailEntry, FamilyStatus, FamilyMember, StaffMember, StaffPhone, StaffMessenger, AIInsight, AIRecommendation } from "@/lib/types";
import type { Contribution, ContributionCriterionType } from "@shared/schema";
import { SectionAttachments } from "./SectionAttachments";
import { GiftSection } from "./GiftSection";
import { PurchaseSection, PurchaseForm, type PurchaseFormData } from "./PurchaseSection";
import { ContributionSection, ContributionForm, type ContributionFormData, type ContributionFormProps } from "./ContributionSection";

const BLOCK_DESCRIPTIONS = {
  identity: {
    title: "ФИО и данные",
    description: "Основная информация о контакте: имя, компания, должность и роли."
  },
  contact: {
    title: "Контактная информация",
    description: "Способы связи с контактом: телефон, email, мессенджеры и социальные сети."
  },
  interests: {
    title: "Интересы и предпочтения",
    description: "Хобби, предпочтения и идеи подарков для персонализации общения."
  },
  family: {
    title: "Семья",
    description: "Информация о семейном положении, членах семьи и важных датах."
  },
  team: {
    title: "Команда",
    description: "Персонал контакта: водители, помощники, секретари."
  },
  status: {
    title: "Статус отношений",
    description: "Уровень приоритета, частота контакта и тепловой статус отношений."
  },
  contribution: {
    title: "Вклад (0-15 баллов)",
    description: "Что этот человек уже даёт: финансовый, ресурсный, репутационный, интеллектуальный и эмоциональный вклад."
  },
  potential: {
    title: "Потенциал (0-15 баллов)",
    description: "Будущий потенциал: личностный рост, ресурсы, доступ к сети, синергия."
  },
  interactions: {
    title: "Взаимодействия",
    description: "История всех контактов с этим человеком."
  },
  ai: {
    title: "AI Ассистент",
    description: "Искусственный интеллект анализирует контакт. Использует модель GPT-5.1."
  }
};

function InfoPopover({ blockKey }: { blockKey: keyof typeof BLOCK_DESCRIPTIONS }) {
  const info = BLOCK_DESCRIPTIONS[blockKey];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6 ml-1">
          <Info className="h-4 w-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-2">
          <h4 className="font-medium">{info.title}</h4>
          <p className="text-sm text-muted-foreground">{info.description}</p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

const CRITERION_LABELS: Record<string, string> = {
  financial: "Финансовый",
  network: "Ресурсный",
  trust: "Репутационный",
  emotional: "Эмоциональный",
  intellectual: "Интеллектуальный",
};

interface ViewContributionsByCriterionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  criterionType: string | null;
  contributions: Contribution[];
  onEdit: (id: string, data: ContributionFormData) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

function ViewContributionsByCriterionDialog({ 
  isOpen, 
  onClose, 
  criterionType, 
  contributions,
  onEdit,
  onDelete,
  onAdd
}: ViewContributionsByCriterionDialogProps) {
  const [editingContribution, setEditingContribution] = useState<Contribution | null>(null);

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

  const handleEdit = (data: ContributionFormData) => {
    if (editingContribution) {
      onEdit(editingContribution.id, data);
      setEditingContribution(null);
    }
  };

  const criterionLabel = criterionType ? CRITERION_LABELS[criterionType] || criterionType : "";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Вклады: {criterionLabel}</span>
            <Button size="sm" onClick={onAdd} data-testid="button-add-contribution-in-dialog">
              <Plus className="h-4 w-4 mr-1" />
              Добавить
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        {editingContribution ? (
          <div className="space-y-4">
            <h4 className="font-medium">Редактирование вклада</h4>
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
              onSubmit={handleEdit}
              onCancel={() => setEditingContribution(null)}
              isEditing
              defaultCriterion={criterionType as ContributionCriterionType}
            />
          </div>
        ) : (
          <div className="space-y-3">
            {contributions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Нет вкладов в этой категории</p>
                <p className="text-sm mt-1">Нажмите "Добавить" чтобы добавить первый вклад</p>
              </div>
            ) : (
              contributions.map((contribution) => (
                <div 
                  key={contribution.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card hover-elevate transition-colors"
                  data-testid={`view-contribution-item-${contribution.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium" data-testid={`text-view-contribution-title-${contribution.id}`}>
                      {contribution.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
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
                      onClick={() => setEditingContribution(contribution)}
                      className="h-8 w-8"
                      data-testid={`button-edit-view-contribution-${contribution.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onDelete(contribution.id)}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      data-testid={`button-delete-view-contribution-${contribution.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

type EditingSection = "identity" | "contacts" | "interests" | "family" | "team" | "status" | "potential" | null;

interface ContactDetailProps {
  contact: Contact;
  interactions: Interaction[];
  onBack: () => void;
  onAddInteraction?: (data: {
    date: string;
    type: string;
    channel: string;
    note: string;
    isMeaningful: boolean;
  }) => void;
  onEdit?: () => void;
  onEditTab?: (tab: string) => void;
}

export function ContactDetail({
  contact,
  interactions,
  onBack,
  onAddInteraction,
}: ContactDetailProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showInteractionForm, setShowInteractionForm] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [forceRefreshAI, setForceRefreshAI] = useState(0);
  const [editingSection, setEditingSection] = useState<EditingSection>(null);
  const [formData, setFormData] = useState<Partial<Contact>>({});
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarSignedUrl, setAvatarSignedUrl] = useState<string | null>(null);
  const [showPurchaseFromContribution, setShowPurchaseFromContribution] = useState(false);
  const [showEditPurchaseTotal, setShowEditPurchaseTotal] = useState(false);
  const [editPurchaseTotalAmount, setEditPurchaseTotalAmount] = useState("");
  const [showContributionForm, setShowContributionForm] = useState(false);
  const [defaultContributionCriterion, setDefaultContributionCriterion] = useState<string | undefined>(undefined);
  const [viewContributionsCriterion, setViewContributionsCriterion] = useState<string | null>(null);

  const { data: connections = [] } = useQuery<Array<{ fromContactId: string; toContactId: string }>>({
    queryKey: ["/api/connections"],
  });
  
  const hasConnections = connections.some(
    conn => conn.fromContactId === contact.id || conn.toContactId === contact.id
  );

  // Fetch signed URL for avatar when contact has avatarUrl
  useEffect(() => {
    if (contact.avatarUrl) {
      fetch(`/api/contacts/${contact.id}/avatar`, { credentials: 'include' })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.url) {
            setAvatarSignedUrl(data.url);
          }
        })
        .catch(() => setAvatarSignedUrl(null));
    } else {
      setAvatarSignedUrl(null);
    }
  }, [contact.id, contact.avatarUrl]);

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
    },
    onError: (error: Error) => {
      toast({ 
        title: "Ошибка сохранения", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const createPurchaseMutation = useMutation({
    mutationFn: async (data: PurchaseFormData) => {
      const res = await apiRequest("POST", "/api/purchases", {
        ...data,
        contactId: contact.id,
        amount: data.amount ? parseFloat(data.amount) : null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", contact.id, "purchases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", contact.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
      toast({ title: "Покупка добавлена" });
      setShowPurchaseFromContribution(false);
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const createContributionMutation = useMutation({
    mutationFn: async (data: ContributionFormData) => {
      const res = await apiRequest("POST", "/api/contributions", {
        contactId: contact.id,
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
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", contact.id, "contributions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", contact.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({ title: "Вклад добавлен" });
      setShowContributionForm(false);
      setDefaultContributionCriterion(undefined);
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const { data: allContributions = [] } = useQuery<Contribution[]>({
    queryKey: ["/api/contacts", contact.id, "contributions"],
    queryFn: async () => {
      const response = await fetch(`/api/contacts/${contact.id}/contributions`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch contributions");
      return response.json();
    },
  });

  const updateContributionMutation = useMutation({
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
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", contact.id, "contributions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", contact.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({ title: "Вклад обновлён" });
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const deleteContributionMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/contributions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", contact.id, "contributions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", contact.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({ title: "Вклад удалён" });
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const handleAddContribution = (criterionType: string) => {
    setDefaultContributionCriterion(criterionType);
    setShowContributionForm(true);
  };

  const handleViewContributions = (criterionType: string) => {
    setViewContributionsCriterion(criterionType);
  };

  const updatePurchaseTotalMutation = useMutation({
    mutationFn: async (totalAmount: number) => {
      const currentTotals = contact.purchaseTotals as { totalAmount: number; currency: string; count: number; lastPurchaseDate: string | null } | null;
      const newTotals = {
        totalAmount,
        currency: currentTotals?.currency || "USD",
        count: currentTotals?.count || 0,
        lastPurchaseDate: currentTotals?.lastPurchaseDate || null,
      };
      const res = await apiRequest("PATCH", `/api/contacts/${contact.id}`, { 
        purchaseTotals: newTotals 
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", contact.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({ title: "Сумма покупок обновлена" });
      setShowEditPurchaseTotal(false);
      setEditPurchaseTotalAmount("");
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const recalculateContributionsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/contacts/${contact.id}/recalculate-contributions`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", contact.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({ title: "Баллы пересчитаны" });
    },
    onError: (error: Error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const handleEditPurchaseTotal = () => {
    const currentTotal = (contact.purchaseTotals as { totalAmount: number } | null)?.totalAmount || 0;
    setEditPurchaseTotalAmount(currentTotal.toString());
    setShowEditPurchaseTotal(true);
  };

  const handleSavePurchaseTotal = () => {
    const amount = parseFloat(editPurchaseTotalAmount);
    if (isNaN(amount) || amount < 0) {
      toast({ title: "Ошибка", description: "Введите корректную сумму", variant: "destructive" });
      return;
    }
    updatePurchaseTotalMutation.mutate(amount);
  };

  const handleAvatarUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: "Ошибка", description: "Можно загружать только изображения", variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Ошибка", description: "Файл слишком большой (макс. 5MB)", variant: "destructive" });
      return;
    }

    setUploadingAvatar(true);
    try {
      // Step 1: Get upload URL from server
      const urlResponse = await fetch('/api/objects/upload', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!urlResponse.ok) {
        throw new Error('Не удалось получить URL для загрузки');
      }

      const { uploadURL } = await urlResponse.json();

      // Step 2: Upload file directly to GCS
      const uploadResponse = await fetch(uploadURL, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Ошибка загрузки файла');
      }

      // Step 3: Extract the public URL (remove query params from signed URL)
      const avatarUrl = uploadURL.split('?')[0];
      
      // Step 4: Save avatar URL to contact
      await apiRequest("PATCH", `/api/contacts/${contact.id}`, { avatarUrl });
      
      // Step 5: Fetch the signed URL for display
      const avatarResponse = await fetch(`/api/contacts/${contact.id}/avatar`, { credentials: 'include' });
      if (avatarResponse.ok) {
        const avatarData = await avatarResponse.json();
        if (avatarData?.url) {
          setAvatarSignedUrl(avatarData.url);
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", contact.id] });
      toast({ title: "Аватар обновлён" });
    } catch (error) {
      toast({ 
        title: "Ошибка загрузки", 
        description: error instanceof Error ? error.message : "Не удалось загрузить аватар",
        variant: "destructive" 
      });
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  }, [contact.id, toast]);

  const startEditing = useCallback((section: EditingSection) => {
    setEditingSection(section);
    if (section === "contacts") {
      setFormData({
        emails: ((contact.emails as EmailEntry[]) || []).map(e => ({ ...e })),
        phones: ((contact.phones as PhoneEntry[]) || []).map(p => ({ ...p })),
        messengers: ((contact.messengers as MessengerEntry[]) || []).map(m => ({ ...m })),
        socialAccounts: ((contact.socialAccounts as SocialAccountEntry[]) || []).map(s => ({ ...s })),
      });
    } else if (section === "family") {
      const currentFamily = contact.familyStatus as FamilyStatus || { members: [], events: [] };
      setFormData({
        familyStatus: {
          maritalStatus: currentFamily.maritalStatus,
          members: (currentFamily.members || []).map(m => ({ ...m })),
          events: (currentFamily.events || []).map(e => ({ ...e })),
          notes: currentFamily.notes || "",
        },
      });
    } else if (section === "potential") {
      setFormData({
        potentialDetails: { ...(contact.potentialDetails as { personal: number; resources: number; network: number; synergy: number; systemRole: number } || { personal: 0, resources: 0, network: 0, synergy: 0, systemRole: 0 }) },
      });
    } else if (section === "identity") {
      // Initialize with current name fields to enable fullName recalculation on save
      setFormData({
        firstName: contact.firstName || "",
        lastName: contact.lastName || "",
        patronymic: contact.patronymic || "",
        shortName: contact.shortName || "",
        company: contact.company || "",
        companyRole: contact.companyRole || "",
      });
    } else {
      setFormData({});
    }
  }, [contact]);

  const cancelEditing = useCallback(() => {
    setEditingSection(null);
    setFormData({});
  }, []);

  const saveSection = useCallback(async () => {
    if (Object.keys(formData).length === 0) {
      setEditingSection(null);
      return;
    }
    
    const dataToSave = { ...formData };
    
    // Recalculate fullName when saving identity section (order: firstName patronymic lastName)
    if (editingSection === "identity" && (dataToSave.firstName !== undefined || dataToSave.lastName !== undefined || dataToSave.patronymic !== undefined)) {
      const firstName = (dataToSave.firstName as string) ?? contact.firstName ?? "";
      const lastName = (dataToSave.lastName as string) ?? contact.lastName ?? "";
      const patronymic = (dataToSave.patronymic as string) ?? contact.patronymic ?? "";
      dataToSave.fullName = [firstName, patronymic, lastName].filter(Boolean).join(" ") || contact.fullName;
    }
    
    if (dataToSave.contributionDetails) {
      const details = dataToSave.contributionDetails as { financial: number; network: number; trust: number; emotional: number; intellectual: number };
      // Use weighted calculation: financial 50%, others 12.5% each
      const score = calculateContributionScore(details);
      dataToSave.contributionScore = score;
      dataToSave.contributionClass = getClassFromScore(score, 15);
    }
    
    if (dataToSave.potentialDetails) {
      const details = dataToSave.potentialDetails as { personal: number; resources: number; network: number; synergy: number; systemRole: number };
      const score = calculatePotentialScore(details);
      dataToSave.potentialScore = score;
      dataToSave.potentialClass = getClassFromScore(score, 15);
    }
    
    await updateMutation.mutateAsync(dataToSave);
  }, [formData, updateMutation, editingSection, contact]);

  const updateField = useCallback(<K extends keyof Contact>(field: K, value: Contact[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const getFieldValue = useCallback(<K extends keyof Contact>(field: K): Contact[K] => {
    return (formData[field] !== undefined ? formData[field] : contact[field]) as Contact[K];
  }, [formData, contact]);

  const { data: aiInsights, isLoading: insightsLoading } = useQuery<AIInsight>({
    queryKey: [`/api/ai/insights/${contact.id}${forceRefreshAI > 0 ? '?refresh=true' : ''}`],
    enabled: showAIPanel,
  });

  const { data: aiRecommendations, isLoading: recommendationsLoading } = useQuery<AIRecommendation>({
    queryKey: [`/api/ai/recommendations/${contact.id}${forceRefreshAI > 0 ? '?refresh=true' : ''}`],
    enabled: showAIPanel,
  });

  const handleRefreshAI = () => {
    setForceRefreshAI(prev => prev + 1);
  };

  const today = new Date();
  const lastContact = contact.lastContactDate ? new Date(contact.lastContactDate) : null;
  const daysSince = lastContact
    ? Math.floor((today.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24))
    : contact.desiredFrequencyDays;

  const initials = contact.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const attentionInfo = ATTENTION_LEVELS.find((l) => l.id === contact.attentionLevel);

  const trendIcon: Record<string, JSX.Element> = {
    "-1": <TrendingDown className="w-4 h-4 text-red-500" />,
    "0": <Minus className="w-4 h-4 text-muted-foreground" />,
    "1": <TrendingUp className="w-4 h-4 text-emerald-500" />,
  };

  const responseLabels = ["Не отвечает", "Редко отвечает", "Нормально", "Быстро отвечает"];

  const getRecommendation = () => {
    const recommendations: string[] = [];
    
    if (daysSince > contact.desiredFrequencyDays) {
      const daysOverdue = daysSince - contact.desiredFrequencyDays;
      recommendations.push(
        `Связаться как можно скорее (просрочено на ${daysOverdue} дн.)`
      );
    }
    
    const attentionGap = contact.recommendedAttentionLevel - contact.attentionLevel;
    if (attentionGap > 0) {
      const recommendedLevel = ATTENTION_LEVELS.find(l => l.id === contact.recommendedAttentionLevel);
      const currentLevel = ATTENTION_LEVELS.find(l => l.id === contact.attentionLevel);
      
      if (recommendedLevel && currentLevel) {
        recommendations.push(
          `Поднимите статус отношений с ${contact.attentionLevel} («${currentLevel.name}») до ${contact.recommendedAttentionLevel} («${recommendedLevel.name}»)`
        );
      }
    }
    
    if (contact.relationshipEnergy < 4) {
      recommendations.push(`Укрепите энергию связи через более глубокое взаимодействие`);
    }

    if (recommendations.length === 0) {
      return "Отношения в хорошем состоянии. Продолжайте поддерживать контакт.";
    }

    return recommendations.join(". ");
  };

  const handleInteractionSubmit = (data: {
    date: string;
    type: string;
    channel: string;
    note: string;
    isMeaningful: boolean;
  }) => {
    onAddInteraction?.(data);
    setShowInteractionForm(false);
  };

  const contributionDetails = (() => {
    const details = contact.contributionDetails as { 
      financial?: number; network?: number; trust?: number;
      emotional?: number; intellectual?: number;
    } | null;
    if (!details) return { financial: 0, network: 0, trust: 0, emotional: 0, intellectual: 0 };
    return { 
      financial: details.financial || 0, 
      network: details.network || 0, 
      trust: details.trust || 0,
      emotional: details.emotional || 0,
      intellectual: details.intellectual || 0,
    };
  })();

  const potentialDetails = contact.potentialDetails || { personal: 0, resources: 0, network: 0, synergy: 0, systemRole: 0 };

  const EditButton = ({ section }: { section: EditingSection }) => (
    <Button 
      variant="ghost" 
      size="sm" 
      className="h-8 px-2 text-muted-foreground hover:text-foreground"
      onClick={() => startEditing(section)}
      data-testid={`button-edit-${section}`}
    >
      <Edit className="h-4 w-4" />
    </Button>
  );

  const SaveCancelButtons = () => (
    <div className="flex items-center gap-1">
      <Button 
        variant="ghost" 
        size="sm" 
        className="h-8 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
        onClick={saveSection}
        disabled={updateMutation.isPending}
        data-testid="button-save-section"
      >
        {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
      </Button>
      <Button 
        variant="ghost" 
        size="sm" 
        className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
        onClick={cancelEditing}
        disabled={updateMutation.isPending}
        data-testid="button-cancel-section"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <div className="h-full flex flex-col" data-testid="contact-detail">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b bg-background sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3 flex-1">
          <label className="relative cursor-pointer group" data-testid="avatar-upload-label">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
              disabled={uploadingAvatar}
              data-testid="input-avatar-upload"
            />
            <Avatar className="h-12 w-12 ring-2 ring-transparent group-hover:ring-primary/50 transition-all">
              {avatarSignedUrl ? (
                <AvatarImage src={avatarSignedUrl} alt={contact.fullName} />
              ) : null}
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              {uploadingAvatar ? (
                <Loader2 className="h-5 w-5 text-white animate-spin" />
              ) : (
                <Camera className="h-5 w-5 text-white" />
              )}
            </div>
          </label>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">{contact.fullName}</h1>
              <HeatStatusBadge
                status={contact.heatStatus}
                heatIndex={contact.heatIndex}
                size="lg"
                showIndex
              />
              {hasConnections && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setLocation(`/network?contact=${contact.id}`)}
                  title="Граф связей"
                  data-testid="button-contact-network"
                >
                  <Link2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              {contact.roleTags?.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Column */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* 1. ФИО и данные */}
              <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0 gap-2 pb-3">
                  <CardTitle className="text-base flex items-center">
                    <User className="h-4 w-4 mr-2 text-blue-500" />
                    ФИО и данные
                    <InfoPopover blockKey="identity" />
                  </CardTitle>
                  {editingSection === "identity" ? <SaveCancelButtons /> : <EditButton section="identity" />}
                </CardHeader>
                <CardContent className="space-y-4">
                  {editingSection === "identity" ? (
                    <div className="space-y-4">
                      <div className="space-y-4">
                        <div className="grid gap-2">
                          <Label className="text-base font-medium">Имя</Label>
                          <Input 
                            className="h-12 text-lg"
                            value={getFieldValue("firstName") || ""} 
                            onChange={e => {
                              updateField("firstName", e.target.value);
                              const lastName = getFieldValue("lastName") || "";
                              const patronymic = getFieldValue("patronymic") || "";
                              const fullName = [e.target.value, patronymic, lastName].filter(Boolean).join(" ");
                              updateField("fullName", fullName || "Без имени");
                            }}
                            placeholder="Иван"
                            data-testid="input-firstname"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label className="text-base font-medium">Отчество</Label>
                          <Input 
                            className="h-12 text-lg"
                            value={getFieldValue("patronymic") || ""} 
                            onChange={e => {
                              updateField("patronymic", e.target.value);
                              const firstName = getFieldValue("firstName") || "";
                              const lastName = getFieldValue("lastName") || "";
                              const fullName = [firstName, e.target.value, lastName].filter(Boolean).join(" ");
                              updateField("fullName", fullName || "Без имени");
                            }}
                            placeholder="Иванович"
                            data-testid="input-patronymic"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label className="text-base font-medium">Фамилия</Label>
                          <Input 
                            className="h-12 text-lg"
                            value={getFieldValue("lastName") || ""} 
                            onChange={e => {
                              updateField("lastName", e.target.value);
                              const firstName = getFieldValue("firstName") || "";
                              const patronymic = getFieldValue("patronymic") || "";
                              const fullName = [firstName, patronymic, e.target.value].filter(Boolean).join(" ");
                              updateField("fullName", fullName || "Без имени");
                            }}
                            placeholder="Иванов"
                            data-testid="input-lastname"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label>Компания</Label>
                          <Input 
                            value={getFieldValue("company") || ""} 
                            onChange={e => updateField("company", e.target.value)}
                            data-testid="input-company"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>Должность</Label>
                          <Input 
                            value={getFieldValue("companyRole") || ""} 
                            onChange={e => updateField("companyRole", e.target.value)}
                            data-testid="input-role"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="text-lg font-semibold">{contact.fullName}</div>
                      {(contact.company || contact.companyRole) && (
                        <div className="flex items-center gap-2 text-sm">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {contact.companyRole && <span className="font-medium">{contact.companyRole}</span>}
                            {contact.companyRole && contact.company && " в "}
                            {contact.company && <span>{contact.company}</span>}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              {/* 2. Контакты */}
              <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0 gap-2 pb-3">
                  <CardTitle className="text-base flex items-center">
                    <Phone className="h-4 w-4 mr-2 text-green-500" />
                    Контакты
                    <InfoPopover blockKey="contact" />
                  </CardTitle>
                  {editingSection === "contacts" ? <SaveCancelButtons /> : <EditButton section="contacts" />}
                </CardHeader>
                <CardContent className="space-y-4">
                  {editingSection === "contacts" ? (
                    <div className="space-y-6">
                      {/* Email адреса */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label>Email адреса</Label>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const currentEmails = (getFieldValue("emails") as EmailEntry[]) || [];
                              updateField("emails", [...currentEmails, { email: "", type: "personal" }]);
                            }}
                            data-testid="button-add-email"
                          >
                            <Plus className="h-3 w-3 mr-1" /> Добавить
                          </Button>
                        </div>
                        {((getFieldValue("emails") as EmailEntry[]) || []).map((emailEntry, idx) => (
                          <div key={idx} className="flex gap-2 items-start">
                            <Input 
                              type="email"
                              value={emailEntry.email}
                              onChange={e => {
                                const emails = [...((getFieldValue("emails") as EmailEntry[]) || [])];
                                emails[idx] = { ...emails[idx], email: e.target.value };
                                updateField("emails", emails);
                              }}
                              placeholder="email@example.com"
                              className="flex-1"
                              data-testid={`input-email-${idx}`}
                            />
                            <Select 
                              value={emailEntry.type}
                              onValueChange={v => {
                                const emails = [...((getFieldValue("emails") as EmailEntry[]) || [])];
                                emails[idx] = { ...emails[idx], type: v as EmailEntry["type"] };
                                updateField("emails", emails);
                              }}
                            >
                              <SelectTrigger className="w-28" data-testid={`select-email-type-${idx}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="personal">Личный</SelectItem>
                                <SelectItem value="work">Рабочий</SelectItem>
                                <SelectItem value="other">Другой</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                const emails = ((getFieldValue("emails") as EmailEntry[]) || []).filter((_, i) => i !== idx);
                                updateField("emails", emails);
                              }}
                              data-testid={`button-remove-email-${idx}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        {((getFieldValue("emails") as EmailEntry[]) || []).length === 0 && (
                          <p className="text-sm text-muted-foreground">Нет email адресов</p>
                        )}
                      </div>
                      
                      {/* Телефоны */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label>Телефоны</Label>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const currentPhones = (getFieldValue("phones") as PhoneEntry[]) || [];
                              updateField("phones", [...currentPhones, { number: "", type: "mobile" }]);
                            }}
                            data-testid="button-add-phone"
                          >
                            <Plus className="h-3 w-3 mr-1" /> Добавить
                          </Button>
                        </div>
                        {((getFieldValue("phones") as PhoneEntry[]) || []).map((phone, idx) => (
                          <div key={idx} className="flex gap-2 items-start">
                            <Input 
                              value={phone.number}
                              onChange={e => {
                                const phones = [...((getFieldValue("phones") as PhoneEntry[]) || [])];
                                phones[idx] = { ...phones[idx], number: e.target.value };
                                updateField("phones", phones);
                              }}
                              placeholder="+7 999 123-45-67"
                              className="flex-1"
                              data-testid={`input-phone-${idx}`}
                            />
                            <Select 
                              value={phone.type}
                              onValueChange={v => {
                                const phones = [...((getFieldValue("phones") as PhoneEntry[]) || [])];
                                phones[idx] = { ...phones[idx], type: v as PhoneEntry["type"] };
                                updateField("phones", phones);
                              }}
                            >
                              <SelectTrigger className="w-28" data-testid={`select-phone-type-${idx}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="mobile">Мобильный</SelectItem>
                                <SelectItem value="work">Рабочий</SelectItem>
                                <SelectItem value="home">Домашний</SelectItem>
                                <SelectItem value="other">Другой</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                const phones = ((getFieldValue("phones") as PhoneEntry[]) || []).filter((_, i) => i !== idx);
                                updateField("phones", phones);
                              }}
                              data-testid={`button-remove-phone-${idx}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        {((getFieldValue("phones") as PhoneEntry[]) || []).length === 0 && (
                          <p className="text-sm text-muted-foreground">Нет телефонов</p>
                        )}
                      </div>
                      
                      {/* Мессенджеры */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label>Мессенджеры</Label>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const currentMessengers = (getFieldValue("messengers") as MessengerEntry[]) || [];
                              updateField("messengers", [...currentMessengers, { platform: "telegram", username: "" }]);
                            }}
                            data-testid="button-add-messenger"
                          >
                            <Plus className="h-3 w-3 mr-1" /> Добавить
                          </Button>
                        </div>
                        {((getFieldValue("messengers") as MessengerEntry[]) || []).map((msg, idx) => (
                          <div key={idx} className="flex gap-2 items-start">
                            <Select 
                              value={msg.platform}
                              onValueChange={v => {
                                const messengers = [...((getFieldValue("messengers") as MessengerEntry[]) || [])];
                                messengers[idx] = { ...messengers[idx], platform: v as MessengerEntry["platform"] };
                                updateField("messengers", messengers);
                              }}
                            >
                              <SelectTrigger className="w-32" data-testid={`select-messenger-platform-${idx}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="telegram">Telegram</SelectItem>
                                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                                <SelectItem value="viber">Viber</SelectItem>
                                <SelectItem value="signal">Signal</SelectItem>
                                <SelectItem value="other">Другой</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input 
                              value={msg.username}
                              onChange={e => {
                                const messengers = [...((getFieldValue("messengers") as MessengerEntry[]) || [])];
                                messengers[idx] = { ...messengers[idx], username: e.target.value };
                                updateField("messengers", messengers);
                              }}
                              placeholder="@username или номер"
                              className="flex-1"
                              data-testid={`input-messenger-username-${idx}`}
                            />
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                const messengers = ((getFieldValue("messengers") as MessengerEntry[]) || []).filter((_, i) => i !== idx);
                                updateField("messengers", messengers);
                              }}
                              data-testid={`button-remove-messenger-${idx}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        {((getFieldValue("messengers") as MessengerEntry[]) || []).length === 0 && (
                          <p className="text-sm text-muted-foreground">Нет мессенджеров</p>
                        )}
                      </div>
                      
                      {/* Соц. сети */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label>Социальные сети</Label>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const currentSocial = (getFieldValue("socialAccounts") as SocialAccountEntry[]) || [];
                              updateField("socialAccounts", [...currentSocial, { platform: "instagram", url: "" }]);
                            }}
                            data-testid="button-add-social"
                          >
                            <Plus className="h-3 w-3 mr-1" /> Добавить
                          </Button>
                        </div>
                        {((getFieldValue("socialAccounts") as SocialAccountEntry[]) || []).map((acc, idx) => (
                          <div key={idx} className="flex gap-2 items-start">
                            <Select 
                              value={acc.platform}
                              onValueChange={v => {
                                const accounts = [...((getFieldValue("socialAccounts") as SocialAccountEntry[]) || [])];
                                accounts[idx] = { ...accounts[idx], platform: v as SocialAccountEntry["platform"] };
                                updateField("socialAccounts", accounts);
                              }}
                            >
                              <SelectTrigger className="w-32" data-testid={`select-social-platform-${idx}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="instagram">Instagram</SelectItem>
                                <SelectItem value="facebook">Facebook</SelectItem>
                                <SelectItem value="linkedin">LinkedIn</SelectItem>
                                <SelectItem value="twitter">X/Twitter</SelectItem>
                                <SelectItem value="vk">ВКонтакте</SelectItem>
                                <SelectItem value="other">Другой</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input 
                              value={acc.url}
                              onChange={e => {
                                const accounts = [...((getFieldValue("socialAccounts") as SocialAccountEntry[]) || [])];
                                accounts[idx] = { ...accounts[idx], url: e.target.value };
                                updateField("socialAccounts", accounts);
                              }}
                              placeholder="URL профиля"
                              className="flex-1"
                              data-testid={`input-social-url-${idx}`}
                            />
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                const accounts = ((getFieldValue("socialAccounts") as SocialAccountEntry[]) || []).filter((_, i) => i !== idx);
                                updateField("socialAccounts", accounts);
                              }}
                              data-testid={`button-remove-social-${idx}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        {((getFieldValue("socialAccounts") as SocialAccountEntry[]) || []).length === 0 && (
                          <p className="text-sm text-muted-foreground">Нет соц. сетей</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {((contact.emails as EmailEntry[]) || []).map((emailEntry, i) => (
                          <div key={`email-${i}`} className="flex items-center gap-2 text-sm">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <a href={`mailto:${emailEntry.email}`} className="hover:underline">
                              {emailEntry.email}
                            </a>
                            <Badge variant="outline" className="text-xs">
                              {emailEntry.type === "personal" ? "Личн" : emailEntry.type === "work" ? "Раб" : "Др"}
                            </Badge>
                          </div>
                        ))}
                        
                        {contact.email && (!contact.emails || (contact.emails as EmailEntry[]).length === 0) && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <a href={`mailto:${contact.email}`} className="hover:underline">
                              {contact.email}
                            </a>
                          </div>
                        )}
                        
                        {((contact.phones as PhoneEntry[]) || []).map((phone, i) => {
                          const cleanNumber = phone.number.replace(/\D/g, '');
                          return (
                            <Popover key={`phone-${i}`}>
                              <PopoverTrigger asChild>
                                <div className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-1 -mx-1" data-testid={`phone-trigger-${i}`}>
                                  <Phone className="h-4 w-4 text-muted-foreground" />
                                  <span className="hover:underline">{phone.number}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {phone.type === "mobile" ? "Моб" : phone.type === "work" ? "Раб" : phone.type === "home" ? "Дом" : "Др"}
                                  </Badge>
                                </div>
                              </PopoverTrigger>
                              <PopoverContent className="w-48 p-2" align="start">
                                <div className="flex flex-col gap-1">
                                  <a 
                                    href={`tel:${phone.number}`}
                                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted text-sm"
                                    data-testid={`link-call-${i}`}
                                  >
                                    <Phone className="h-4 w-4 text-green-500" />
                                    Позвонить
                                  </a>
                                  <a 
                                    href={`https://wa.me/${cleanNumber}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted text-sm"
                                    data-testid={`link-whatsapp-${i}`}
                                  >
                                    <MessageCircle className="h-4 w-4 text-green-600" />
                                    Написать в WhatsApp
                                  </a>
                                </div>
                              </PopoverContent>
                            </Popover>
                          );
                        })}
                        
                        {contact.phone && (!contact.phones || (contact.phones as PhoneEntry[]).length === 0) && (() => {
                          const cleanNumber = contact.phone!.replace(/\D/g, '');
                          return (
                            <Popover>
                              <PopoverTrigger asChild>
                                <div className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-1 -mx-1" data-testid="phone-legacy-trigger">
                                  <Phone className="h-4 w-4 text-muted-foreground" />
                                  <span className="hover:underline">{contact.phone}</span>
                                </div>
                              </PopoverTrigger>
                              <PopoverContent className="w-48 p-2" align="start">
                                <div className="flex flex-col gap-1">
                                  <a 
                                    href={`tel:${contact.phone}`}
                                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted text-sm"
                                    data-testid="link-call-legacy"
                                  >
                                    <Phone className="h-4 w-4 text-green-500" />
                                    Позвонить
                                  </a>
                                  <a 
                                    href={`https://wa.me/${cleanNumber}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted text-sm"
                                    data-testid="link-whatsapp-legacy"
                                  >
                                    <MessageCircle className="h-4 w-4 text-green-600" />
                                    Написать в WhatsApp
                                  </a>
                                </div>
                              </PopoverContent>
                            </Popover>
                          );
                        })()}
                      </div>
                      
                      {((contact.messengers as MessengerEntry[]) || []).length > 0 && (
                        <div className="space-y-2">
                          <div className="text-xs text-muted-foreground uppercase tracking-wide">Мессенджеры</div>
                          <div className="flex flex-wrap gap-2">
                            {((contact.messengers as MessengerEntry[]) || []).map((msg, i) => {
                              const username = msg.username.replace(/^@/, '');
                              if (msg.platform === "telegram") {
                                return (
                                  <a
                                    key={`msg-${i}`}
                                    href={`https://t.me/${username}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    data-testid={`link-telegram-${i}`}
                                  >
                                    <Badge variant="secondary" className="gap-1 cursor-pointer hover:bg-accent">
                                      <MessageCircle className="h-3 w-3" />
                                      TG: {msg.username}
                                    </Badge>
                                  </a>
                                );
                              }
                              if (msg.platform === "whatsapp") {
                                const cleanNumber = msg.username.replace(/\D/g, '');
                                return (
                                  <a
                                    key={`msg-${i}`}
                                    href={`https://wa.me/${cleanNumber}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    data-testid={`link-whatsapp-msg-${i}`}
                                  >
                                    <Badge variant="secondary" className="gap-1 cursor-pointer hover:bg-accent">
                                      <MessageCircle className="h-3 w-3" />
                                      WA: {msg.username}
                                    </Badge>
                                  </a>
                                );
                              }
                              return (
                                <Badge key={`msg-${i}`} variant="secondary" className="gap-1">
                                  <MessageCircle className="h-3 w-3" />
                                  {msg.platform === "viber" ? "Vb" : msg.platform}: {msg.username}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                      {((contact.socialAccounts as SocialAccountEntry[]) || []).length > 0 && (
                        <div className="space-y-2">
                          <div className="text-xs text-muted-foreground uppercase tracking-wide">Соц. сети</div>
                          <div className="flex flex-wrap gap-2">
                            {((contact.socialAccounts as SocialAccountEntry[]) || []).map((acc, i) => (
                              <a 
                                key={`social-${i}`}
                                href={acc.url.startsWith("http") ? acc.url : `https://${acc.url}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Badge variant="outline" className="gap-1 hover:bg-accent cursor-pointer">
                                  <LinkIcon className="h-3 w-3" />
                                  {acc.platform === "instagram" ? "IG" :
                                   acc.platform === "facebook" ? "FB" :
                                   acc.platform === "linkedin" ? "LI" :
                                   acc.platform === "twitter" ? "X" :
                                   acc.platform === "vk" ? "VK" : acc.platform}
                                </Badge>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {!contact.phone && !contact.email && 
                       (!contact.phones || (contact.phones as PhoneEntry[]).length === 0) &&
                       (!contact.emails || (contact.emails as EmailEntry[]).length === 0) &&
                       (!contact.messengers || (contact.messengers as MessengerEntry[]).length === 0) &&
                       (!contact.socialAccounts || (contact.socialAccounts as SocialAccountEntry[]).length === 0) && (
                        <p className="text-sm text-muted-foreground">
                          Контактные данные не указаны
                        </p>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              {/* 3. Интересы и предпочтения */}
              <Card className="bg-purple-50/50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700">
                <CardHeader className="flex-row items-center justify-between space-y-0 gap-2 pb-3">
                  <CardTitle className="text-base flex items-center">
                    <Sparkles className="h-4 w-4 mr-2 text-purple-500" />
                    Интересы и предпочтения
                    <InfoPopover blockKey="interests" />
                  </CardTitle>
                  {editingSection === "interests" ? <SaveCancelButtons /> : <EditButton section="interests" />}
                </CardHeader>
                <CardContent className="space-y-4">
                  {editingSection === "interests" ? (
                    <div className="space-y-4">
                      <div className="grid gap-2">
                        <Label>Хобби и увлечения</Label>
                        <Textarea 
                          value={getFieldValue("hobbies") || ""} 
                          onChange={e => updateField("hobbies", e.target.value)}
                          placeholder="Опишите хобби и увлечения..."
                          data-testid="input-hobbies"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Предпочтения</Label>
                        <Textarea 
                          value={getFieldValue("preferences") || ""} 
                          onChange={e => updateField("preferences", e.target.value)}
                          placeholder="Опишите предпочтения..."
                          data-testid="input-preferences"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Идеи подарков</Label>
                        <Textarea 
                          value={getFieldValue("giftPreferences") || ""} 
                          onChange={e => updateField("giftPreferences", e.target.value)}
                          placeholder="Идеи для подарков..."
                          data-testid="input-gifts"
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      {contact.hobbies && (
                        <div className="space-y-2">
                          <div className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                            <Star className="h-3 w-3" /> Хобби и увлечения
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{contact.hobbies}</p>
                          <SectionAttachments contactId={contact.id} category="hobbies" compact />
                        </div>
                      )}
                      
                      {contact.preferences && (
                        <div className="space-y-2">
                          {contact.hobbies && <Separator />}
                          <div className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                            <Heart className="h-3 w-3" /> Предпочтения
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{contact.preferences}</p>
                          <SectionAttachments contactId={contact.id} category="preferences" compact />
                        </div>
                      )}
                      
                      {contact.giftPreferences && (
                        <div className="space-y-2">
                          {(contact.hobbies || contact.preferences) && <Separator />}
                          <div className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                            <Gift className="h-3 w-3" /> Идеи подарков
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{contact.giftPreferences}</p>
                          <SectionAttachments contactId={contact.id} category="gifts" compact />
                        </div>
                      )}
                      
                      {!contact.hobbies && !contact.preferences && !contact.giftPreferences && (
                        <p className="text-sm text-muted-foreground">Информация не указана</p>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              {/* 4. Семья */}
              <Card className="bg-pink-50/50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-700">
                <CardHeader className="flex-row items-center justify-between space-y-0 gap-2 pb-3">
                  <CardTitle className="text-base flex items-center">
                    <Heart className="h-4 w-4 mr-2 text-pink-500" />
                    Семья
                    <InfoPopover blockKey="family" />
                  </CardTitle>
                  {editingSection === "family" ? <SaveCancelButtons /> : <EditButton section="family" />}
                </CardHeader>
                <CardContent className="space-y-4">
                  {editingSection === "family" ? (
                    <div className="space-y-4">
                      <div className="grid gap-2">
                        <Label>Семейный статус</Label>
                        <Select 
                          value={(getFieldValue("familyStatus") as FamilyStatus)?.maritalStatus || ""}
                          onValueChange={v => {
                            const current = getFieldValue("familyStatus") as FamilyStatus || { members: [], events: [] };
                            updateField("familyStatus", { 
                              ...current,
                              maritalStatus: v as FamilyStatus["maritalStatus"]
                            });
                          }}
                        >
                          <SelectTrigger data-testid="select-marital">
                            <SelectValue placeholder="Выберите статус" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="single">Не женат/не замужем</SelectItem>
                            <SelectItem value="married">В браке</SelectItem>
                            <SelectItem value="divorced">В разводе</SelectItem>
                            <SelectItem value="widowed">Вдова/вдовец</SelectItem>
                            <SelectItem value="partnership">Гражданский брак</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="flex items-center gap-1">
                            <Users className="h-3 w-3" /> Члены семьи
                          </Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const current = getFieldValue("familyStatus") as FamilyStatus || { members: [], events: [] };
                              updateField("familyStatus", {
                                ...current,
                                members: [...(current.members || []), { name: "", relation: "spouse" as const }]
                              });
                            }}
                            data-testid="button-add-family-member"
                          >
                            <Plus className="h-3 w-3 mr-1" /> Добавить
                          </Button>
                        </div>
                        
                        {((getFieldValue("familyStatus") as FamilyStatus)?.members || []).map((member, index) => (
                          <div key={index} className="flex items-start gap-2 p-3 border rounded-md bg-background">
                            <div className="flex-1 grid gap-2">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-xs">Тип</Label>
                                  <Select
                                    value={member.relation}
                                    onValueChange={v => {
                                      const current = getFieldValue("familyStatus") as FamilyStatus;
                                      const updatedMembers = [...current.members];
                                      updatedMembers[index] = { ...updatedMembers[index], relation: v as FamilyMember["relation"] };
                                      updateField("familyStatus", { ...current, members: updatedMembers });
                                    }}
                                  >
                                    <SelectTrigger data-testid={`select-member-relation-${index}`}>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="spouse">Супруг(а)</SelectItem>
                                      <SelectItem value="child">Ребёнок</SelectItem>
                                      <SelectItem value="parent">Родитель</SelectItem>
                                      <SelectItem value="sibling">Брат/сестра</SelectItem>
                                      <SelectItem value="other">Другой</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className="text-xs">Имя</Label>
                                  <Input
                                    value={member.name}
                                    onChange={e => {
                                      const current = getFieldValue("familyStatus") as FamilyStatus;
                                      const updatedMembers = [...current.members];
                                      updatedMembers[index] = { ...updatedMembers[index], name: e.target.value };
                                      updateField("familyStatus", { ...current, members: updatedMembers });
                                    }}
                                    placeholder="Имя"
                                    data-testid={`input-member-name-${index}`}
                                  />
                                </div>
                              </div>
                              <div>
                                <Label className="text-xs">Дата рождения</Label>
                                <Input
                                  type="date"
                                  value={member.birthday || ""}
                                  onChange={e => {
                                    const current = getFieldValue("familyStatus") as FamilyStatus;
                                    const updatedMembers = [...current.members];
                                    updatedMembers[index] = { ...updatedMembers[index], birthday: e.target.value };
                                    updateField("familyStatus", { ...current, members: updatedMembers });
                                  }}
                                  className="w-40"
                                  data-testid={`input-member-birthday-${index}`}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Заметка</Label>
                                <Textarea
                                  value={member.notes || ""}
                                  onChange={e => {
                                    const current = getFieldValue("familyStatus") as FamilyStatus;
                                    const updatedMembers = [...current.members];
                                    updatedMembers[index] = { ...updatedMembers[index], notes: e.target.value };
                                    updateField("familyStatus", { ...current, members: updatedMembers });
                                  }}
                                  placeholder="Заметка о члене семьи..."
                                  className="resize-none"
                                  rows={2}
                                  data-testid={`input-member-notes-${index}`}
                                />
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                const current = getFieldValue("familyStatus") as FamilyStatus;
                                const updatedMembers = current.members.filter((_, i) => i !== index);
                                updateField("familyStatus", { ...current, members: updatedMembers });
                              }}
                              data-testid={`button-remove-member-${index}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        ))}
                        
                        {((getFieldValue("familyStatus") as FamilyStatus)?.members || []).length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-2">
                            Нажмите "Добавить" чтобы добавить члена семьи
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      {contact.familyStatus && (
                        <>
                          {(contact.familyStatus as FamilyStatus).maritalStatus && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Статус: </span>
                              <span className="font-medium">
                                {(contact.familyStatus as FamilyStatus).maritalStatus === "single" ? "Не женат/не замужем" :
                                 (contact.familyStatus as FamilyStatus).maritalStatus === "married" ? "В браке" :
                                 (contact.familyStatus as FamilyStatus).maritalStatus === "divorced" ? "В разводе" :
                                 (contact.familyStatus as FamilyStatus).maritalStatus === "widowed" ? "Вдова/вдовец" :
                                 (contact.familyStatus as FamilyStatus).maritalStatus === "partnership" ? "Гражданский брак" : ""}
                              </span>
                            </div>
                          )}
                          
                          {((contact.familyStatus as FamilyStatus).members?.length || 0) > 0 && (
                            <div className="space-y-2">
                              <div className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                                <Users className="h-3 w-3" /> Члены семьи
                              </div>
                              <div className="space-y-1">
                                {(contact.familyStatus as FamilyStatus).members?.map((member, i) => (
                                  <div key={i} className="flex items-center gap-2 text-sm">
                                    <Badge variant="outline" className="text-xs">
                                      {member.relation === "spouse" ? "Супруг(а)" :
                                       member.relation === "child" ? "Ребёнок" :
                                       member.relation === "parent" ? "Родитель" :
                                       member.relation === "sibling" ? "Брат/сестра" : "Другой"}
                                    </Badge>
                                    <span className="font-medium">{member.name}</span>
                                    {member.birthday && (
                                      <span className="text-muted-foreground text-xs">
                                        ({new Date(member.birthday).toLocaleDateString('ru-RU')})
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {((contact.familyStatus as FamilyStatus).events?.length || 0) > 0 && (
                            <div className="space-y-2">
                              <div className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                                <Calendar className="h-3 w-3" /> Важные даты
                              </div>
                              <div className="space-y-1">
                                {(contact.familyStatus as FamilyStatus).events?.map((event, i) => (
                                  <div key={i} className="flex items-center gap-2 text-sm">
                                    <span className="font-medium">{event.title}</span>
                                    <span className="text-muted-foreground">
                                      {new Date(event.date).toLocaleDateString('ru-RU')}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                      
                      <SectionAttachments contactId={contact.id} category="family" compact />
                      
                      {!contact.familyStatus && (
                        <p className="text-sm text-muted-foreground">Информация не указана</p>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              {/* 5. Команда */}
              <Card className="bg-blue-50/50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700">
                <CardHeader className="flex-row items-center justify-between space-y-0 gap-2 pb-3">
                  <CardTitle className="text-base flex items-center">
                    <Briefcase className="h-4 w-4 mr-2 text-blue-500" />
                    Команда
                    <InfoPopover blockKey="team" />
                  </CardTitle>
                  {editingSection === "team" ? <SaveCancelButtons /> : <EditButton section="team" />}
                </CardHeader>
                <CardContent className="space-y-4">
                  {editingSection === "team" ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-1">
                          <Users className="h-3 w-3" /> Персонал
                        </Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const current = (getFieldValue("staffMembers") as StaffMember[]) || [];
                            updateField("staffMembers", [
                              ...current,
                              { name: "", role: "assistant" as const, phones: [], messengers: [] }
                            ]);
                          }}
                          data-testid="button-add-staff-member"
                        >
                          <Plus className="h-3 w-3 mr-1" /> Добавить
                        </Button>
                      </div>
                      
                      {((getFieldValue("staffMembers") as StaffMember[]) || []).map((staff, index) => (
                        <div key={index} className="flex items-start gap-2 p-3 border rounded-md bg-background">
                          <div className="flex-1 space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs">Роль</Label>
                                <Select
                                  value={staff.role}
                                  onValueChange={v => {
                                    const current = [...(getFieldValue("staffMembers") as StaffMember[])];
                                    current[index] = { ...current[index], role: v as StaffMember["role"] };
                                    updateField("staffMembers", current);
                                  }}
                                >
                                  <SelectTrigger data-testid={`select-staff-role-${index}`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="assistant">Помощник</SelectItem>
                                    <SelectItem value="driver">Водитель</SelectItem>
                                    <SelectItem value="secretary">Секретарь</SelectItem>
                                    <SelectItem value="manager">Менеджер</SelectItem>
                                    <SelectItem value="security">Охрана</SelectItem>
                                    <SelectItem value="other">Другое</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs">Имя</Label>
                                <Input
                                  value={staff.name}
                                  onChange={e => {
                                    const current = [...(getFieldValue("staffMembers") as StaffMember[])];
                                    current[index] = { ...current[index], name: e.target.value };
                                    updateField("staffMembers", current);
                                  }}
                                  placeholder="Имя сотрудника"
                                  data-testid={`input-staff-name-${index}`}
                                />
                              </div>
                            </div>
                            
                            {staff.role === "other" && (
                              <div>
                                <Label className="text-xs">Своя роль</Label>
                                <Input
                                  value={staff.roleCustom || ""}
                                  onChange={e => {
                                    const current = [...(getFieldValue("staffMembers") as StaffMember[])];
                                    current[index] = { ...current[index], roleCustom: e.target.value };
                                    updateField("staffMembers", current);
                                  }}
                                  placeholder="Укажите роль..."
                                  data-testid={`input-staff-role-custom-${index}`}
                                />
                              </div>
                            )}
                            
                            {/* Телефоны сотрудника */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs flex items-center gap-1">
                                  <Phone className="h-3 w-3" /> Телефоны
                                </Label>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-xs"
                                  onClick={() => {
                                    const current = [...(getFieldValue("staffMembers") as StaffMember[])];
                                    current[index] = {
                                      ...current[index],
                                      phones: [...(current[index].phones || []), { type: "mobile" as const, number: "" }]
                                    };
                                    updateField("staffMembers", current);
                                  }}
                                  data-testid={`button-add-staff-phone-${index}`}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                              {(staff.phones || []).map((phone, phoneIdx) => (
                                <div key={phoneIdx} className="flex items-center gap-2">
                                  <Select
                                    value={phone.type}
                                    onValueChange={v => {
                                      const current = [...(getFieldValue("staffMembers") as StaffMember[])];
                                      const phones = [...(current[index].phones || [])];
                                      phones[phoneIdx] = { ...phones[phoneIdx], type: v as StaffPhone["type"] };
                                      current[index] = { ...current[index], phones };
                                      updateField("staffMembers", current);
                                    }}
                                  >
                                    <SelectTrigger className="w-24" data-testid={`select-staff-phone-type-${index}-${phoneIdx}`}>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="mobile">Мобильный</SelectItem>
                                      <SelectItem value="work">Рабочий</SelectItem>
                                      <SelectItem value="other">Другой</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Input
                                    value={phone.number}
                                    onChange={e => {
                                      const current = [...(getFieldValue("staffMembers") as StaffMember[])];
                                      const phones = [...(current[index].phones || [])];
                                      phones[phoneIdx] = { ...phones[phoneIdx], number: e.target.value };
                                      current[index] = { ...current[index], phones };
                                      updateField("staffMembers", current);
                                    }}
                                    placeholder="+7 ..."
                                    className="flex-1"
                                    data-testid={`input-staff-phone-${index}-${phoneIdx}`}
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => {
                                      const current = [...(getFieldValue("staffMembers") as StaffMember[])];
                                      current[index] = {
                                        ...current[index],
                                        phones: (current[index].phones || []).filter((_, i) => i !== phoneIdx)
                                      };
                                      updateField("staffMembers", current);
                                    }}
                                    data-testid={`button-remove-staff-phone-${index}-${phoneIdx}`}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                            
                            {/* Мессенджеры сотрудника */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs flex items-center gap-1">
                                  <MessageCircle className="h-3 w-3" /> Мессенджеры
                                </Label>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-xs"
                                  onClick={() => {
                                    const current = [...(getFieldValue("staffMembers") as StaffMember[])];
                                    current[index] = {
                                      ...current[index],
                                      messengers: [...(current[index].messengers || []), { platform: "telegram" as const, username: "" }]
                                    };
                                    updateField("staffMembers", current);
                                  }}
                                  data-testid={`button-add-staff-messenger-${index}`}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                              {(staff.messengers || []).map((msg, msgIdx) => (
                                <div key={msgIdx} className="flex items-center gap-2">
                                  <Select
                                    value={msg.platform}
                                    onValueChange={v => {
                                      const current = [...(getFieldValue("staffMembers") as StaffMember[])];
                                      const messengers = [...(current[index].messengers || [])];
                                      messengers[msgIdx] = { ...messengers[msgIdx], platform: v as StaffMessenger["platform"] };
                                      current[index] = { ...current[index], messengers };
                                      updateField("staffMembers", current);
                                    }}
                                  >
                                    <SelectTrigger className="w-28" data-testid={`select-staff-messenger-platform-${index}-${msgIdx}`}>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="telegram">Telegram</SelectItem>
                                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                                      <SelectItem value="viber">Viber</SelectItem>
                                      <SelectItem value="other">Другой</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Input
                                    value={msg.username}
                                    onChange={e => {
                                      const current = [...(getFieldValue("staffMembers") as StaffMember[])];
                                      const messengers = [...(current[index].messengers || [])];
                                      messengers[msgIdx] = { ...messengers[msgIdx], username: e.target.value };
                                      current[index] = { ...current[index], messengers };
                                      updateField("staffMembers", current);
                                    }}
                                    placeholder="@username или номер"
                                    className="flex-1"
                                    data-testid={`input-staff-messenger-${index}-${msgIdx}`}
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => {
                                      const current = [...(getFieldValue("staffMembers") as StaffMember[])];
                                      current[index] = {
                                        ...current[index],
                                        messengers: (current[index].messengers || []).filter((_, i) => i !== msgIdx)
                                      };
                                      updateField("staffMembers", current);
                                    }}
                                    data-testid={`button-remove-staff-messenger-${index}-${msgIdx}`}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                            
                            {/* Заметки о сотруднике */}
                            <div>
                              <Label className="text-xs">Заметка</Label>
                              <Input
                                value={staff.notes || ""}
                                onChange={e => {
                                  const current = [...(getFieldValue("staffMembers") as StaffMember[])];
                                  current[index] = { ...current[index], notes: e.target.value };
                                  updateField("staffMembers", current);
                                }}
                                placeholder="Заметки о сотруднике..."
                                data-testid={`input-staff-notes-${index}`}
                              />
                            </div>
                          </div>
                          
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const current = (getFieldValue("staffMembers") as StaffMember[]).filter((_, i) => i !== index);
                              updateField("staffMembers", current);
                            }}
                            data-testid={`button-remove-staff-${index}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                      
                      {((getFieldValue("staffMembers") as StaffMember[]) || []).length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-2">
                          Нажмите "Добавить" чтобы добавить члена команды
                        </p>
                      )}
                    </div>
                  ) : (
                    <>
                      {(contact.staffMembers && (contact.staffMembers as StaffMember[]).length > 0) ? (
                        <div className="space-y-3">
                          {(contact.staffMembers as StaffMember[]).map((staff, i) => (
                            <div key={i} className="p-3 border rounded-md bg-background/50 space-y-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {staff.role === "assistant" && "Помощник"}
                                  {staff.role === "driver" && "Водитель"}
                                  {staff.role === "secretary" && "Секретарь"}
                                  {staff.role === "manager" && "Менеджер"}
                                  {staff.role === "security" && "Охрана"}
                                  {staff.role === "other" && (staff.roleCustom || "Другое")}
                                </Badge>
                                <span className="font-medium">{staff.name || "Без имени"}</span>
                              </div>
                              
                              {(staff.phones && staff.phones.length > 0) && (
                                <div className="flex flex-wrap gap-2">
                                  {staff.phones.map((phone, pi) => (
                                    <a
                                      key={pi}
                                      href={`tel:${phone.number}`}
                                      className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                                    >
                                      <Phone className="h-3 w-3" />
                                      {phone.number}
                                    </a>
                                  ))}
                                </div>
                              )}
                              
                              {(staff.messengers && staff.messengers.length > 0) && (
                                <div className="flex flex-wrap gap-2">
                                  {staff.messengers.map((msg, mi) => (
                                    <span key={mi} className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                                      <MessageCircle className="h-3 w-3" />
                                      {msg.platform}: {msg.username}
                                    </span>
                                  ))}
                                </div>
                              )}
                              
                              {staff.notes && (
                                <p className="text-sm text-muted-foreground">{staff.notes}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Персонал не добавлен</p>
                      )}
                      
                      <SectionAttachments 
                        contactId={contact.id} 
                        category="team" 
                        label="Фото персонала"
                        compact
                      />
                    </>
                  )}
                </CardContent>
              </Card>

              {/* 6. Статус отношений */}
              <Card 
                className={cn(
                  contact.heatStatus === "green" && "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800",
                  contact.heatStatus === "yellow" && "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
                  contact.heatStatus === "red" && "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
                )}
              >
                <CardHeader className="flex-row items-center justify-between space-y-0 gap-2 pb-3">
                  <CardTitle className="text-base flex items-center">
                    Статус отношений
                    <InfoPopover blockKey="status" />
                  </CardTitle>
                  {editingSection === "status" ? <SaveCancelButtons /> : <EditButton section="status" />}
                </CardHeader>
                <CardContent className="space-y-4">
                  {editingSection === "status" ? (
                    <div className="space-y-4">
                      <div className="grid gap-2">
                        <Label>Желаемая частота контакта (дней)</Label>
                        <Input 
                          type="number"
                          min={1}
                          value={getFieldValue("desiredFrequencyDays") || 30} 
                          onChange={e => updateField("desiredFrequencyDays", parseInt(e.target.value) || 30)}
                          data-testid="input-frequency"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Статус отношений (1-10)</Label>
                        <div className="flex items-center gap-4">
                          <Slider
                            value={[getFieldValue("attentionLevel") || 5]}
                            onValueChange={([value]) => updateField("attentionLevel", value)}
                            min={1}
                            max={10}
                            step={1}
                            className="flex-1"
                            data-testid="slider-attention"
                          />
                          <span className="font-mono text-lg w-8">{getFieldValue("attentionLevel") || 5}</span>
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label>Энергия связи (1-5)</Label>
                        <div className="flex items-center gap-4">
                          <Slider
                            value={[getFieldValue("relationshipEnergy") || 3]}
                            onValueChange={([value]) => updateField("relationshipEnergy", value)}
                            min={1}
                            max={5}
                            step={1}
                            className="flex-1"
                            data-testid="slider-energy"
                          />
                          <span className="font-mono text-lg w-8">{getFieldValue("relationshipEnergy") || 3}</span>
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label>Качество ответа</Label>
                        <Select 
                          value={String(getFieldValue("responseQuality") || 2)}
                          onValueChange={v => updateField("responseQuality", parseInt(v))}
                        >
                          <SelectTrigger data-testid="select-response">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {responseLabels.map((label, i) => (
                              <SelectItem key={i} value={String(i)}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                            Важность
                          </div>
                          <ImportanceBadge level={contact.importanceLevel} />
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                            Частота
                          </div>
                          <span className="text-sm font-medium">
                            каждые {contact.desiredFrequencyDays} дн.
                          </span>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                            Тренд
                          </div>
                          <div className="flex items-center gap-1">
                            {trendIcon[String(contact.attentionTrend)]}
                            <span className="text-sm">
                              {contact.attentionTrend === 1
                                ? "Растёт"
                                : contact.attentionTrend === -1
                                  ? "Падает"
                                  : "Стабилен"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div>
                          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                            Последний контакт
                          </div>
                          <div className="text-sm font-medium">{formatDaysAgo(daysSince)}</div>
                          {lastContact && (
                            <div className="text-xs text-muted-foreground">
                              {lastContact.toLocaleDateString("ru-RU")}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                            Качество ответа
                          </div>
                          <div className="text-sm font-medium">
                            {responseLabels[contact.responseQuality]}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                            Энергия связи
                          </div>
                          <div className="text-sm font-medium">{contact.relationshipEnergy}/5</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                            Heat Index
                          </div>
                          <div className="flex items-center gap-2">
                            <HeatStatusBadge status={contact.heatStatus} size="md" />
                            <span className="text-sm font-mono font-medium">
                              {contact.heatIndex.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                          Статус отношений (факт / рекоменд.)
                        </div>
                        <div className="flex items-center gap-4">
                          <AttentionGapIndicator 
                            actual={contact.attentionLevel} 
                            recommended={contact.recommendedAttentionLevel} 
                          />
                          {attentionInfo && (
                            <div className="text-sm">
                              <span className="font-medium">{attentionInfo.name}</span>
                              <span className="text-muted-foreground ml-2">
                                {attentionInfo.description}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className={cn(
                        "flex items-start gap-3 p-3 rounded-lg",
                        contact.heatStatus === "green" && "bg-emerald-100/50 dark:bg-emerald-900/30",
                        contact.heatStatus === "yellow" && "bg-amber-100/50 dark:bg-amber-900/30",
                        contact.heatStatus === "red" && "bg-red-100/50 dark:bg-red-900/30"
                      )}>
                        <Lightbulb className={cn(
                          "w-5 h-5 flex-shrink-0 mt-0.5",
                          contact.heatStatus === "green" && "text-emerald-600 dark:text-emerald-400",
                          contact.heatStatus === "yellow" && "text-amber-600 dark:text-amber-400",
                          contact.heatStatus === "red" && "text-red-600 dark:text-red-400"
                        )} />
                        <div className="flex-1">
                          <span className="text-sm font-medium">Рекомендация</span>
                          <p className="text-sm text-muted-foreground mt-1">{getRecommendation()}</p>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* 7. Вклад */}
              <Card className="bg-amber-50/50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700">
                <CardHeader className="flex-row items-center justify-between space-y-0 gap-2 pb-3">
                  <CardTitle className="text-base flex items-center">
                    Вклад ({contact.contributionScore}/15)
                    <InfoPopover blockKey="contribution" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScorePanel
                    type="contribution"
                    scores={contributionDetails}
                    totalScore={contact.contributionScore}
                    scoreClass={contact.contributionClass}
                    compact
                    onAddPurchase={() => setShowPurchaseFromContribution(true)}
                    purchaseTotals={contact.purchaseTotals as { totalAmount: number; currency: string; count: number; lastPurchaseDate: string | null } | null}
                    onEditPurchaseTotal={handleEditPurchaseTotal}
                    contributionTotals={contact.contributionTotals as { [key: string]: { totalAmount: number; currency: string; count: number; lastDate: string | null } } | null}
                    onAddContribution={handleAddContribution}
                    onViewContributions={handleViewContributions}
                    onRecalculate={() => recalculateContributionsMutation.mutate()}
                    isRecalculating={recalculateContributionsMutation.isPending}
                  />
                </CardContent>
              </Card>

              {/* 8. Потенциал */}
              <Card className="bg-teal-50/50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-700">
                <CardHeader className="flex-row items-center justify-between space-y-0 gap-2 pb-3">
                  <CardTitle className="text-base flex items-center">
                    Потенциал ({contact.potentialScore}/15)
                    <InfoPopover blockKey="potential" />
                  </CardTitle>
                  {editingSection === "potential" ? <SaveCancelButtons /> : <EditButton section="potential" />}
                </CardHeader>
                <CardContent>
                  {editingSection === "potential" ? (
                    <div className="space-y-4">
                      <div className="grid gap-2">
                        <Label>Личностный рост (0-3)</Label>
                        <div className="flex items-center gap-4">
                          <Slider
                            value={[(getFieldValue("potentialDetails") as typeof potentialDetails)?.personal ?? potentialDetails.personal]}
                            onValueChange={([value]) => updateField("potentialDetails", { 
                              ...potentialDetails, 
                              ...(formData.potentialDetails as typeof potentialDetails || {}),
                              personal: value 
                            })}
                            min={0}
                            max={3}
                            step={1}
                            className="flex-1"
                            data-testid="slider-personal"
                          />
                          <span className="font-mono text-lg w-8">{(getFieldValue("potentialDetails") as typeof potentialDetails)?.personal ?? potentialDetails.personal}</span>
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label>Ресурсы (0-3)</Label>
                        <div className="flex items-center gap-4">
                          <Slider
                            value={[(getFieldValue("potentialDetails") as typeof potentialDetails)?.resources ?? potentialDetails.resources]}
                            onValueChange={([value]) => updateField("potentialDetails", { 
                              ...potentialDetails, 
                              ...(formData.potentialDetails as typeof potentialDetails || {}),
                              resources: value 
                            })}
                            min={0}
                            max={3}
                            step={1}
                            className="flex-1"
                            data-testid="slider-resources"
                          />
                          <span className="font-mono text-lg w-8">{(getFieldValue("potentialDetails") as typeof potentialDetails)?.resources ?? potentialDetails.resources}</span>
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label>Доступ к сети (0-3)</Label>
                        <div className="flex items-center gap-4">
                          <Slider
                            value={[(getFieldValue("potentialDetails") as typeof potentialDetails)?.network ?? potentialDetails.network]}
                            onValueChange={([value]) => updateField("potentialDetails", { 
                              ...potentialDetails, 
                              ...(formData.potentialDetails as typeof potentialDetails || {}),
                              network: value 
                            })}
                            min={0}
                            max={3}
                            step={1}
                            className="flex-1"
                            data-testid="slider-pot-network"
                          />
                          <span className="font-mono text-lg w-8">{(getFieldValue("potentialDetails") as typeof potentialDetails)?.network ?? potentialDetails.network}</span>
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label>Синергия (0-3)</Label>
                        <div className="flex items-center gap-4">
                          <Slider
                            value={[(getFieldValue("potentialDetails") as typeof potentialDetails)?.synergy ?? potentialDetails.synergy]}
                            onValueChange={([value]) => updateField("potentialDetails", { 
                              ...potentialDetails, 
                              ...(formData.potentialDetails as typeof potentialDetails || {}),
                              synergy: value 
                            })}
                            min={0}
                            max={3}
                            step={1}
                            className="flex-1"
                            data-testid="slider-synergy"
                          />
                          <span className="font-mono text-lg w-8">{(getFieldValue("potentialDetails") as typeof potentialDetails)?.synergy ?? potentialDetails.synergy}</span>
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label>Роль в системе (0-3)</Label>
                        <div className="flex items-center gap-4">
                          <Slider
                            value={[(getFieldValue("potentialDetails") as typeof potentialDetails)?.systemRole ?? potentialDetails.systemRole]}
                            onValueChange={([value]) => updateField("potentialDetails", { 
                              ...potentialDetails, 
                              ...(formData.potentialDetails as typeof potentialDetails || {}),
                              systemRole: value 
                            })}
                            min={0}
                            max={3}
                            step={1}
                            className="flex-1"
                            data-testid="slider-systemrole"
                          />
                          <span className="font-mono text-lg w-8">{(getFieldValue("potentialDetails") as typeof potentialDetails)?.systemRole ?? potentialDetails.systemRole}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <ScorePanel
                      type="potential"
                      scores={potentialDetails}
                      totalScore={contact.potentialScore}
                      scoreClass={contact.potentialClass}
                      compact
                    />
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* AI Assistant Panel */}
              <Card className="bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20 border-violet-200 dark:border-violet-700">
                <CardHeader className="flex-row items-center justify-between space-y-0 gap-2 pb-3">
                  <CardTitle className="text-base flex items-center">
                    <Sparkles className="h-5 w-5 mr-2 text-violet-500" />
                    AI Ассистент
                    <InfoPopover blockKey="ai" />
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {showAIPanel && (
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={handleRefreshAI}
                        disabled={insightsLoading || recommendationsLoading}
                        data-testid="button-refresh-ai"
                      >
                        <RefreshCw className={cn("h-4 w-4", (insightsLoading || recommendationsLoading) && "animate-spin")} />
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant={showAIPanel ? "secondary" : "default"}
                      onClick={() => setShowAIPanel(!showAIPanel)}
                      data-testid="button-toggle-ai"
                    >
                      <Brain className="h-4 w-4 mr-1" />
                      {showAIPanel ? "Скрыть" : "Анализ"}
                    </Button>
                  </div>
                </CardHeader>
                {showAIPanel && (
                  <CardContent className="space-y-4">
                    {(insightsLoading || recommendationsLoading) ? (
                      <div className="flex flex-col items-center justify-center py-8 space-y-3">
                        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
                        <p className="text-sm text-muted-foreground">Анализирую контакт...</p>
                      </div>
                    ) : (
                      <>
                        {aiInsights && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Brain className="h-4 w-4 text-violet-500" />
                              <h4 className="font-medium">Анализ отношений</h4>
                              {aiInsights.cached && (
                                <Badge variant="outline" className="text-xs">кэш</Badge>
                              )}
                            </div>
                            <p className="text-sm">{aiInsights.summary}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Крепость отношений:</span>
                              <Badge variant={
                                aiInsights.relationshipStrength === "Крепкие" ? "default" :
                                aiInsights.relationshipStrength === "Умеренные" ? "secondary" : "outline"
                              }>
                                {aiInsights.relationshipStrength}
                              </Badge>
                            </div>
                          </div>
                        )}

                        {aiRecommendations && (
                          <div className="space-y-3">
                            <Separator />
                            <div className="flex items-center gap-2">
                              <Target className="h-4 w-4 text-violet-500" />
                              <h4 className="font-medium">Рекомендации</h4>
                            </div>
                            
                            {aiRecommendations.nextActions && aiRecommendations.nextActions.length > 0 && (
                              <div className="space-y-2">
                                {aiRecommendations.nextActions.map((action, i) => (
                                  <div key={i} className="flex items-start gap-2 p-2 bg-violet-100/50 dark:bg-violet-900/30 rounded-md">
                                    <Badge variant="outline" className="text-xs mt-0.5">
                                      {action.priority === "high" ? "Важно" : action.priority === "medium" ? "Средне" : "Низко"}
                                    </Badge>
                                    <div>
                                      <p className="text-sm font-medium">{action.action}</p>
                                      <p className="text-xs text-muted-foreground">{action.reason}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {aiRecommendations.conversationStarters && aiRecommendations.conversationStarters.length > 0 && (
                              <div className="space-y-1">
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <MessageSquare className="h-3 w-3" /> Темы для разговора:
                                </span>
                                <ul className="text-sm space-y-1 pl-4">
                                  {aiRecommendations.conversationStarters.map((topic, i) => (
                                    <li key={i} className="list-disc">{topic}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {aiRecommendations.giftIdeas && aiRecommendations.giftIdeas.length > 0 && (
                              <div className="space-y-1">
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Gift className="h-3 w-3" /> Идеи подарков:
                                </span>
                                <ul className="text-sm space-y-1 pl-4">
                                  {aiRecommendations.giftIdeas.map((gift, i) => (
                                    <li key={i} className="list-disc">{gift}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {aiRecommendations.warningSignals && aiRecommendations.warningSignals.length > 0 && (
                              <div className="space-y-1 p-2 bg-red-50 dark:bg-red-900/20 rounded-md">
                                <span className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" /> Предупреждения:
                                </span>
                                <ul className="text-sm space-y-1 text-red-700 dark:text-red-300">
                                  {aiRecommendations.warningSignals.map((warning, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                      <span>•</span>
                                      <span>{warning}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}

                        {aiInsights?.model && (
                          <p className="text-xs text-muted-foreground text-right">
                            Модель: {aiInsights.model}
                          </p>
                        )}
                      </>
                    )}
                  </CardContent>
                )}
              </Card>

              {/* Files */}
              <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-900/10">
                <CardHeader className="flex-row items-center justify-between space-y-0 gap-2 pb-3">
                  <CardTitle className="text-base flex items-center">
                    <Paperclip className="h-4 w-4 mr-2 text-blue-500" />
                    Файлы и документы
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4">
                    <SectionAttachments 
                      contactId={contact.id} 
                      category="personal" 
                      label="Личные фото и файлы"
                    />
                    <Separator />
                    <SectionAttachments 
                      contactId={contact.id} 
                      category="work" 
                      label="Рабочие материалы"
                    />
                    <Separator />
                    <SectionAttachments 
                      contactId={contact.id} 
                      category="documents" 
                      label="Документы"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Interactions */}
              <Card className="bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-slate-600">
                <CardHeader className="flex-row items-center justify-between space-y-0 gap-2 pb-3">
                  <CardTitle className="text-base flex items-center">
                    Взаимодействия
                    <InfoPopover blockKey="interactions" />
                  </CardTitle>
                  <Dialog open={showInteractionForm} onOpenChange={setShowInteractionForm}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-1" data-testid="button-add-interaction">
                        <Plus className="h-4 w-4" />
                        Добавить
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Добавить взаимодействие</DialogTitle>
                      </DialogHeader>
                      <InteractionForm
                        onSubmit={handleInteractionSubmit}
                        onCancel={() => setShowInteractionForm(false)}
                      />
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent className="space-y-2">
                  {interactions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Нет записей о взаимодействиях
                    </p>
                  ) : (
                    interactions.map((interaction) => (
                      <InteractionItem key={interaction.id} interaction={interaction} />
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Contributions */}
              <ContributionSection 
                contactId={contact.id} 
                contributionTotals={contact.contributionTotals as {
                  [key: string]: {
                    totalAmount: number;
                    currency: string;
                    count: number;
                    lastDate: string | null;
                  };
                } | null}
              />

              {/* Purchases */}
              <PurchaseSection 
                contactId={contact.id} 
                purchaseTotals={contact.purchaseTotals as {
                  totalAmount: number;
                  currency: string;
                  count: number;
                  lastPurchaseDate: string | null;
                } | null}
              />

              {/* Gifts */}
              <GiftSection contactId={contact.id} />
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Purchase Form Dialog - opened from Contribution section */}
      <Dialog open={showPurchaseFromContribution} onOpenChange={setShowPurchaseFromContribution}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить покупку</DialogTitle>
          </DialogHeader>
          <PurchaseForm 
            onSubmit={(data) => createPurchaseMutation.mutate(data)} 
            onCancel={() => setShowPurchaseFromContribution(false)} 
          />
        </DialogContent>
      </Dialog>

      {/* Contribution Form Dialog - opened from ScorePanel */}
      <Dialog open={showContributionForm} onOpenChange={(open) => {
        setShowContributionForm(open);
        if (!open) setDefaultContributionCriterion(undefined);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить вклад</DialogTitle>
          </DialogHeader>
          <ContributionForm 
            onSubmit={(data) => createContributionMutation.mutate(data)} 
            onCancel={() => {
              setShowContributionForm(false);
              setDefaultContributionCriterion(undefined);
            }}
            defaultCriterion={defaultContributionCriterion as any}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Purchase Total Dialog */}
      <Dialog open={showEditPurchaseTotal} onOpenChange={setShowEditPurchaseTotal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Корректировка суммы покупок</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="purchaseTotal">Общая сумма ($)</Label>
              <Input
                id="purchaseTotal"
                type="number"
                value={editPurchaseTotalAmount}
                onChange={(e) => setEditPurchaseTotalAmount(e.target.value)}
                placeholder="0"
                data-testid="input-edit-purchase-total"
              />
              <p className="text-xs text-muted-foreground">
                Эта сумма используется для расчёта финансового балла вклада
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowEditPurchaseTotal(false)}
                data-testid="button-cancel-edit-purchase-total"
              >
                Отмена
              </Button>
              <Button 
                onClick={handleSavePurchaseTotal}
                disabled={updatePurchaseTotalMutation.isPending}
                data-testid="button-save-purchase-total"
              >
                {updatePurchaseTotalMutation.isPending ? "Сохранение..." : "Сохранить"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Contributions by Criterion Dialog */}
      <ViewContributionsByCriterionDialog
        isOpen={!!viewContributionsCriterion}
        onClose={() => setViewContributionsCriterion(null)}
        criterionType={viewContributionsCriterion}
        contributions={allContributions.filter(c => c.criterionType === viewContributionsCriterion)}
        onEdit={(id, data) => updateContributionMutation.mutate({ id, data })}
        onDelete={(id) => deleteContributionMutation.mutate(id)}
        onAdd={() => {
          setDefaultContributionCriterion(viewContributionsCriterion || undefined);
          setShowContributionForm(true);
        }}
      />
    </div>
  );
}
