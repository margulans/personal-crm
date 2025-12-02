import { useState, useCallback } from "react";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { HeatStatusBadge } from "./HeatStatusBadge";
import { ImportanceBadge } from "./ImportanceBadge";
import { AttentionGapIndicator } from "./AttentionGapIndicator";
import { ScorePanel } from "./ScorePanel";
import { InteractionItem } from "./InteractionItem";
import { InteractionForm } from "./InteractionForm";
import { ATTENTION_LEVELS, formatDaysAgo } from "@/lib/constants";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Phone,
  Mail,
  Link as LinkIcon,
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
} from "lucide-react";

import type { Contact, Interaction, PhoneEntry, MessengerEntry, SocialAccountEntry, FamilyStatus, AIInsight, AIRecommendation } from "@/lib/types";
import { SectionAttachments } from "./SectionAttachments";

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
    title: "Вклад (0-9 баллов)",
    description: "Что этот человек уже даёт: финансовая польза, помощь сетью контактов, доверие."
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

type EditingSection = "identity" | "contacts" | "interests" | "family" | "team" | "status" | "contribution" | "potential" | null;

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
  const [showInteractionForm, setShowInteractionForm] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [forceRefreshAI, setForceRefreshAI] = useState(0);
  const [editingSection, setEditingSection] = useState<EditingSection>(null);
  const [formData, setFormData] = useState<Partial<Contact>>({});

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

  const startEditing = useCallback((section: EditingSection) => {
    setEditingSection(section);
    if (section === "contacts") {
      setFormData({
        email: contact.email || "",
        phones: ((contact.phones as PhoneEntry[]) || []).map(p => ({ ...p })),
        messengers: ((contact.messengers as MessengerEntry[]) || []).map(m => ({ ...m })),
        socialAccounts: ((contact.socialAccounts as SocialAccountEntry[]) || []).map(s => ({ ...s })),
      });
    } else if (section === "contribution") {
      setFormData({
        contributionDetails: { ...(contact.contributionDetails as { financial: number; network: number; trust: number } || { financial: 0, network: 0, trust: 0 }) },
      });
    } else if (section === "potential") {
      setFormData({
        potentialDetails: { ...(contact.potentialDetails as { personal: number; resources: number; network: number; synergy: number; systemRole: number } || { personal: 0, resources: 0, network: 0, synergy: 0, systemRole: 0 }) },
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
    
    if (dataToSave.contributionDetails) {
      const details = dataToSave.contributionDetails as { financial: number; network: number; trust: number };
      const contributionScore = (details.financial || 0) + (details.network || 0) + (details.trust || 0);
      dataToSave.contributionScore = contributionScore;
      dataToSave.contributionClass = contributionScore >= 7 ? "A" : contributionScore >= 5 ? "B" : contributionScore >= 2 ? "C" : "D";
    }
    
    if (dataToSave.potentialDetails) {
      const details = dataToSave.potentialDetails as { personal: number; resources: number; network: number; synergy: number; systemRole: number };
      const potentialScore = (details.personal || 0) + (details.resources || 0) + (details.network || 0) + (details.synergy || 0) + (details.systemRole || 0);
      dataToSave.potentialScore = potentialScore;
      dataToSave.potentialClass = potentialScore >= 12 ? "A" : potentialScore >= 8 ? "B" : potentialScore >= 4 ? "C" : "D";
    }
    
    await updateMutation.mutateAsync(dataToSave);
  }, [formData, updateMutation]);

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
      financial?: number; network?: number; trust?: number 
    } | null;
    if (!details) return { financial: 0, network: 0, trust: 0 };
    return { 
      financial: details.financial || 0, 
      network: details.network || 0, 
      trust: details.trust || 0 
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
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-primary/10 text-primary text-lg font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">{contact.fullName}</h1>
              <HeatStatusBadge
                status={contact.heatStatus}
                heatIndex={contact.heatIndex}
                size="lg"
                showIndex
              />
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
                      <div className="grid gap-2">
                        <Label>ФИО</Label>
                        <Input 
                          value={getFieldValue("fullName") || ""} 
                          onChange={e => updateField("fullName", e.target.value)}
                          data-testid="input-fullname"
                        />
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
                      {contact.roleTags && contact.roleTags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {contact.roleTags.map((tag) => (
                            <Badge key={tag} variant="outline">{tag}</Badge>
                          ))}
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
                      {/* Email */}
                      <div className="grid gap-2">
                        <Label>Email</Label>
                        <Input 
                          type="email"
                          value={getFieldValue("email") || ""} 
                          onChange={e => updateField("email", e.target.value)}
                          data-testid="input-email"
                        />
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
                        {contact.email && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <a href={`mailto:${contact.email}`} className="hover:underline">
                              {contact.email}
                            </a>
                          </div>
                        )}
                        
                        {((contact.phones as PhoneEntry[]) || []).map((phone, i) => (
                          <div key={`phone-${i}`} className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <a href={`tel:${phone.number}`} className="hover:underline">
                              {phone.number}
                            </a>
                            <Badge variant="outline" className="text-xs">
                              {phone.type === "mobile" ? "Моб" : phone.type === "work" ? "Раб" : phone.type === "home" ? "Дом" : "Др"}
                            </Badge>
                          </div>
                        ))}
                        
                        {contact.phone && (!contact.phones || (contact.phones as PhoneEntry[]).length === 0) && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <a href={`tel:${contact.phone}`} className="hover:underline">
                              {contact.phone}
                            </a>
                          </div>
                        )}
                      </div>
                      
                      {((contact.messengers as MessengerEntry[]) || []).length > 0 && (
                        <div className="space-y-2">
                          <div className="text-xs text-muted-foreground uppercase tracking-wide">Мессенджеры</div>
                          <div className="flex flex-wrap gap-2">
                            {((contact.messengers as MessengerEntry[]) || []).map((msg, i) => (
                              <Badge key={`msg-${i}`} variant="secondary" className="gap-1">
                                <MessageCircle className="h-3 w-3" />
                                {msg.platform === "telegram" ? "TG" : 
                                 msg.platform === "whatsapp" ? "WA" : 
                                 msg.platform === "viber" ? "Vb" : msg.platform}: {msg.username}
                              </Badge>
                            ))}
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
                          onValueChange={v => updateField("familyStatus", { 
                            ...(contact.familyStatus as FamilyStatus || {}), 
                            ...(formData.familyStatus as FamilyStatus || {}),
                            maritalStatus: v as FamilyStatus["maritalStatus"]
                          })}
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
                      <div className="grid gap-2">
                        <Label>Заметки о семье</Label>
                        <Textarea 
                          value={(getFieldValue("familyStatus") as FamilyStatus)?.notes || ""}
                          onChange={e => updateField("familyStatus", { 
                            ...(contact.familyStatus as FamilyStatus || {}), 
                            ...(formData.familyStatus as FamilyStatus || {}),
                            notes: e.target.value 
                          })}
                          placeholder="Заметки о семье..."
                          data-testid="input-family-notes"
                        />
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
                </CardHeader>
                <CardContent>
                  <SectionAttachments 
                    contactId={contact.id} 
                    category="team" 
                    label="Персонал (водители, помощники)"
                  />
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
                    Вклад ({contact.contributionScore}/9)
                    <InfoPopover blockKey="contribution" />
                  </CardTitle>
                  {editingSection === "contribution" ? <SaveCancelButtons /> : <EditButton section="contribution" />}
                </CardHeader>
                <CardContent>
                  {editingSection === "contribution" ? (
                    <div className="space-y-4">
                      <div className="grid gap-2">
                        <Label>Финансовая польза (0-3)</Label>
                        <div className="flex items-center gap-4">
                          <Slider
                            value={[(getFieldValue("contributionDetails") as typeof contributionDetails)?.financial ?? contributionDetails.financial]}
                            onValueChange={([value]) => updateField("contributionDetails", { 
                              ...contributionDetails, 
                              ...(formData.contributionDetails as typeof contributionDetails || {}),
                              financial: value 
                            })}
                            min={0}
                            max={3}
                            step={1}
                            className="flex-1"
                            data-testid="slider-financial"
                          />
                          <span className="font-mono text-lg w-8">{(getFieldValue("contributionDetails") as typeof contributionDetails)?.financial ?? contributionDetails.financial}</span>
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label>Помощь сетью контактов (0-3)</Label>
                        <div className="flex items-center gap-4">
                          <Slider
                            value={[(getFieldValue("contributionDetails") as typeof contributionDetails)?.network ?? contributionDetails.network]}
                            onValueChange={([value]) => updateField("contributionDetails", { 
                              ...contributionDetails, 
                              ...(formData.contributionDetails as typeof contributionDetails || {}),
                              network: value 
                            })}
                            min={0}
                            max={3}
                            step={1}
                            className="flex-1"
                            data-testid="slider-network"
                          />
                          <span className="font-mono text-lg w-8">{(getFieldValue("contributionDetails") as typeof contributionDetails)?.network ?? contributionDetails.network}</span>
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label>Доверие и репутация (0-3)</Label>
                        <div className="flex items-center gap-4">
                          <Slider
                            value={[(getFieldValue("contributionDetails") as typeof contributionDetails)?.trust ?? contributionDetails.trust]}
                            onValueChange={([value]) => updateField("contributionDetails", { 
                              ...contributionDetails, 
                              ...(formData.contributionDetails as typeof contributionDetails || {}),
                              trust: value 
                            })}
                            min={0}
                            max={3}
                            step={1}
                            className="flex-1"
                            data-testid="slider-trust"
                          />
                          <span className="font-mono text-lg w-8">{(getFieldValue("contributionDetails") as typeof contributionDetails)?.trust ?? contributionDetails.trust}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <ScorePanel
                      type="contribution"
                      scores={contributionDetails}
                      totalScore={contact.contributionScore}
                      scoreClass={contact.contributionClass}
                      compact
                    />
                  )}
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
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
