import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  ArrowLeft,
  Phone,
  Mail,
  Link as LinkIcon,
  Plus,
  Edit,
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
} from "lucide-react";

import type { Contact, Interaction, PhoneEntry, MessengerEntry, SocialAccountEntry, FamilyStatus, AIInsight, AIRecommendation } from "@/lib/types";
import { SectionAttachments } from "./SectionAttachments";

const BLOCK_DESCRIPTIONS = {
  contact: {
    title: "Контактная информация",
    description: "Основные способы связи с контактом: телефон, email и социальные сети. Используйте эти данные для поддержания регулярного общения."
  },
  priority: {
    title: "Уровень приоритета",
    description: "Определяет, сколько времени и усилий нужно уделять этому контакту. Важность (A/B/C) автоматически рассчитывается из оценок вклада и потенциала. Статус отношений (1-10) задаёт интенсивность взаимодействия."
  },
  heat: {
    title: "Тепловой статус",
    description: "Показывает 'здоровье' отношений. Heat Index рассчитывается по формуле: 40% давность контакта + 30% энергия связи + 20% качество ответа + 10% тренд. Зелёный — всё хорошо, жёлтый — нужно внимание, красный — срочно связаться!"
  },
  contribution: {
    title: "Вклад (0-9 баллов)",
    description: "Что этот человек уже даёт вам: финансовая польза (0-3), помощь сетью контактов (0-3), доверие и репутация (0-3)."
  },
  potential: {
    title: "Потенциал (0-15 баллов)",
    description: "Что этот человек может дать в будущем: личностный рост, ресурсы, доступ к сети, синергия и роль в вашей системе. Каждый критерий от 0 до 3 баллов."
  },
  interactions: {
    title: "Взаимодействия",
    description: "История всех контактов с этим человеком. Отмечайте значимые взаимодействия — они влияют на Heat Index и помогают отслеживать динамику отношений."
  },
  ai: {
    title: "AI Ассистент",
    description: "Искусственный интеллект анализирует контакт и даёт рекомендации по поддержанию отношений. Использует модель GPT-5.1."
  },
  attachments: {
    title: "Файлы и документы",
    description: "Прикрепляйте файлы к контакту: личные фото, семейные документы, рабочие материалы, фото водителей и персонала. Файлы организованы по категориям."
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

type EditTab = "basic" | "priority" | "contribution" | "potential";

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
  onEditTab?: (tab: EditTab) => void;
}

export function ContactDetail({
  contact,
  interactions,
  onBack,
  onAddInteraction,
  onEdit,
  onEditTab,
}: ContactDetailProps) {
  const [showInteractionForm, setShowInteractionForm] = useState(false);
  const [lastTapTime, setLastTapTime] = useState<Record<string, number>>({});
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [forceRefreshAI, setForceRefreshAI] = useState(0);

  // AI Insights query - uses proper URL with contact ID
  const { data: aiInsights, isLoading: insightsLoading, refetch: refetchInsights } = useQuery<AIInsight>({
    queryKey: [`/api/ai/insights/${contact.id}${forceRefreshAI > 0 ? '?refresh=true' : ''}`],
    enabled: showAIPanel,
  });

  // AI Recommendations query - uses proper URL with contact ID
  const { data: aiRecommendations, isLoading: recommendationsLoading, refetch: refetchRecommendations } = useQuery<AIRecommendation>({
    queryKey: [`/api/ai/recommendations/${contact.id}${forceRefreshAI > 0 ? '?refresh=true' : ''}`],
    enabled: showAIPanel,
  });

  const handleRefreshAI = () => {
    setForceRefreshAI(prev => prev + 1);
  };

  const handleDoubleTap = (blockId: string, tab: EditTab) => {
    const now = Date.now();
    const lastTap = lastTapTime[blockId] || 0;
    
    if (now - lastTap < 300) {
      onEditTab?.(tab);
      setLastTapTime({});
    } else {
      setLastTapTime({ ...lastTapTime, [blockId]: now });
    }
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
          `Поднимите статус отношений с ${contact.attentionLevel} («${currentLevel.name}») до ${contact.recommendedAttentionLevel} («${recommendedLevel.name}» — ${recommendedLevel.description.toLowerCase()})`
        );
      } else {
        recommendations.push(`Поднимите статус отношений до ${contact.recommendedAttentionLevel} (сейчас ${contact.attentionLevel})`);
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
      financial?: number; network?: number; tactical?: number; 
      strategic?: number; loyalty?: number; trust?: number 
    } | null;
    if (!details) return { financial: 0, network: 0, trust: 0 };
    if ('trust' in details) {
      return { financial: details.financial || 0, network: details.network || 0, trust: details.trust || 0 };
    }
    const trustValue = Math.min(3, Math.round(((details.tactical || 0) + (details.strategic || 0) + (details.loyalty || 0)) / 3));
    return { financial: details.financial || 0, network: details.network || 0, trust: trustValue };
  })();
  const potentialDetails = contact.potentialDetails || { personal: 0, resources: 0, network: 0, synergy: 0, systemRole: 0 };

  return (
    <div className="h-full flex flex-col" data-testid="contact-detail">
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
        <Button variant="outline" size="default" className="gap-2" onClick={onEdit} data-testid="button-edit">
          <Edit className="h-4 w-4" />
          Редактировать
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card 
                className="cursor-pointer transition-colors hover:bg-muted/30"
                onClick={() => handleDoubleTap("contact", "basic")}
              >
                <CardHeader>
                  <CardTitle className="text-base flex items-center">
                    Контактная информация
                    <InfoPopover blockKey="contact" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
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
                             msg.platform === "viber" ? "Vb" : 
                             msg.platform === "signal" ? "Sg" : 
                             msg.platform === "wechat" ? "WC" : msg.platform}: {msg.username}
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
                               acc.platform === "vk" ? "VK" :
                               acc.platform === "youtube" ? "YT" :
                               acc.platform === "tiktok" ? "TT" : acc.platform}
                            </Badge>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {contact.socialLinks && contact.socialLinks.length > 0 && (!contact.socialAccounts || (contact.socialAccounts as SocialAccountEntry[]).length === 0) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {contact.socialLinks.map((link, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <LinkIcon className="h-4 w-4 text-muted-foreground" />
                          <a
                            href={link.startsWith("http") ? link : `https://${link}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline text-primary"
                          >
                            {link}
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {!contact.phone && !contact.email && 
                   (!contact.phones || (contact.phones as PhoneEntry[]).length === 0) &&
                   (!contact.messengers || (contact.messengers as MessengerEntry[]).length === 0) &&
                   (!contact.socialAccounts || (contact.socialAccounts as SocialAccountEntry[]).length === 0) &&
                   (!contact.socialLinks || contact.socialLinks.length === 0) && (
                    <p className="text-sm text-muted-foreground">
                      Контактные данные не указаны
                    </p>
                  )}
                </CardContent>
              </Card>
              
              {contact.familyStatus && (
                (contact.familyStatus as FamilyStatus).maritalStatus || 
                ((contact.familyStatus as FamilyStatus).members?.length || 0) > 0 || 
                ((contact.familyStatus as FamilyStatus).events?.length || 0) > 0
              ) && (
                <Card className="cursor-pointer transition-colors hover:bg-muted/30">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center">
                      <Heart className="h-4 w-4 mr-2 text-pink-500" />
                      Семья
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
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
                    
                    {(contact.familyStatus as FamilyStatus).notes && (
                      <div className="text-sm text-muted-foreground italic">
                        {(contact.familyStatus as FamilyStatus).notes}
                      </div>
                    )}
                    
                    <Separator />
                    <SectionAttachments 
                      contactId={contact.id} 
                      category="family" 
                      label="Фото семьи"
                      compact
                    />
                  </CardContent>
                </Card>
              )}

              {/* Interests Section */}
              {(contact.hobbies || contact.preferences || contact.importantDates || contact.giftPreferences || contact.otherInterests) && (
                <Card className="bg-purple-50/50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center">
                      <Sparkles className="h-4 w-4 mr-2 text-purple-500" />
                      Интересы и предпочтения
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {contact.hobbies && (
                      <div className="space-y-2">
                        <div className="text-xs text-muted-foreground uppercase tracking-wide">
                          Хобби и увлечения
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{contact.hobbies}</p>
                        <SectionAttachments 
                          contactId={contact.id} 
                          category="hobbies" 
                          compact
                        />
                      </div>
                    )}
                    
                    {contact.preferences && (
                      <div className="space-y-2">
                        <Separator />
                        <div className="text-xs text-muted-foreground uppercase tracking-wide">
                          Любимая еда и напитки
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{contact.preferences}</p>
                        <SectionAttachments 
                          contactId={contact.id} 
                          category="preferences" 
                          compact
                        />
                      </div>
                    )}
                    
                    {contact.importantDates && (
                      <div className="space-y-2">
                        <Separator />
                        <div className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Важные даты
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{contact.importantDates}</p>
                        <SectionAttachments 
                          contactId={contact.id} 
                          category="dates" 
                          compact
                        />
                      </div>
                    )}
                    
                    {contact.giftPreferences && (
                      <div className="space-y-2">
                        <Separator />
                        <div className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                          <Gift className="h-3 w-3" /> Идеи подарков
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{contact.giftPreferences}</p>
                        <SectionAttachments 
                          contactId={contact.id} 
                          category="gifts" 
                          compact
                        />
                      </div>
                    )}
                    
                    {contact.otherInterests && (
                      <div className="space-y-2">
                        <Separator />
                        <div className="text-xs text-muted-foreground uppercase tracking-wide">
                          Другие заметки
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{contact.otherInterests}</p>
                        <SectionAttachments 
                          contactId={contact.id} 
                          category="notes" 
                          compact
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <Card 
                className="bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-slate-600 cursor-pointer transition-colors hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
                onClick={() => handleDoubleTap("priority", "priority")}
              >
                <CardHeader>
                  <CardTitle className="text-base flex items-center">
                    Уровень приоритета
                    <InfoPopover blockKey="priority" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
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
                </CardContent>
              </Card>

              <Card 
                className={cn(
                  "cursor-pointer transition-colors",
                  contact.heatStatus === "green" && "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/40",
                  contact.heatStatus === "yellow" && "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 hover:bg-amber-100/50 dark:hover:bg-amber-900/40",
                  contact.heatStatus === "red" && "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 hover:bg-red-100/50 dark:hover:bg-red-900/40"
                )}
                onClick={() => handleDoubleTap("heat", "priority")}
              >
                <CardHeader>
                  <CardTitle className="text-base flex items-center">
                    Тепловой статус
                    <InfoPopover blockKey="heat" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
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
                      <div className="flex items-center gap-1 mb-1">
                        <span className="text-sm font-medium">Рекомендация</span>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-5 w-5">
                              <Info className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80" align="start">
                            <div className="space-y-2">
                              <h4 className="font-medium text-sm">Шкала статусов отношений</h4>
                              <div className="space-y-1 text-xs">
                                {ATTENTION_LEVELS.map((level) => (
                                  <div key={level.id} className={cn(
                                    "flex gap-2 py-1 px-1.5 rounded",
                                    level.id === contact.recommendedAttentionLevel && "bg-primary/10 font-medium",
                                    level.id === contact.attentionLevel && "border border-primary/30"
                                  )}>
                                    <span className="font-mono w-5 text-right">{level.id}.</span>
                                    <div>
                                      <span className="font-medium">{level.name}</span>
                                      <span className="text-muted-foreground"> — {level.description}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div className="pt-2 border-t text-xs text-muted-foreground space-y-1">
                                <p><span className="inline-block w-3 h-3 bg-primary/10 rounded mr-1" /> Рекомендуемый уровень</p>
                                <p><span className="inline-block w-3 h-3 border border-primary/30 rounded mr-1" /> Текущий уровень</p>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <p className="text-sm text-muted-foreground">{getRecommendation()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div 
                  className="cursor-pointer" 
                  onClick={() => handleDoubleTap("contribution", "contribution")}
                >
                  <ScorePanel
                    type="contribution"
                    scores={contributionDetails}
                    totalScore={contact.contributionScore}
                    scoreClass={contact.contributionClass}
                  />
                </div>
                <div 
                  className="cursor-pointer" 
                  onClick={() => handleDoubleTap("potential", "potential")}
                >
                  <ScorePanel
                    type="potential"
                    scores={potentialDetails}
                    totalScore={contact.potentialScore}
                    scoreClass={contact.potentialClass}
                  />
                </div>
              </div>
            </div>

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
                        {/* Insights Section */}
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
                                aiInsights.relationshipStrength === "Умеренные" ? "secondary" :
                                aiInsights.relationshipStrength === "Слабые" ? "outline" : "destructive"
                              }>
                                {aiInsights.relationshipStrength}
                              </Badge>
                            </div>

                            {aiInsights.keyPoints && aiInsights.keyPoints.length > 0 && (
                              <div className="space-y-1">
                                <span className="text-xs text-muted-foreground">Ключевые факты:</span>
                                <ul className="text-sm space-y-1">
                                  {aiInsights.keyPoints.map((point, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                                      <span>{point}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {aiInsights.riskFactors && aiInsights.riskFactors.length > 0 && (
                              <div className="space-y-1">
                                <span className="text-xs text-muted-foreground">Риски:</span>
                                <ul className="text-sm space-y-1">
                                  {aiInsights.riskFactors.map((risk, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                                      <span>{risk}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {aiInsights.opportunities && aiInsights.opportunities.length > 0 && (
                              <div className="space-y-1">
                                <span className="text-xs text-muted-foreground">Возможности:</span>
                                <ul className="text-sm space-y-1">
                                  {aiInsights.opportunities.map((opp, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                      <Lightbulb className="h-3.5 w-3.5 text-yellow-500 mt-0.5 flex-shrink-0" />
                                      <span>{opp}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}

                        <Separator />

                        {/* Recommendations Section */}
                        {aiRecommendations && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Target className="h-4 w-4 text-indigo-500" />
                              <h4 className="font-medium">Рекомендации</h4>
                            </div>

                            {aiRecommendations.nextActions && aiRecommendations.nextActions.length > 0 && (
                              <div className="space-y-2">
                                <span className="text-xs text-muted-foreground">Следующие шаги:</span>
                                {aiRecommendations.nextActions.map((action, i) => (
                                  <div key={i} className="p-2 bg-white/50 dark:bg-black/20 rounded-md">
                                    <div className="flex items-start gap-2">
                                      <Badge 
                                        variant={action.priority === "high" ? "destructive" : action.priority === "medium" ? "default" : "secondary"}
                                        className="text-xs flex-shrink-0"
                                      >
                                        {action.priority === "high" ? "Важно" : action.priority === "medium" ? "Средне" : "Низкий"}
                                      </Badge>
                                      <div>
                                        <p className="text-sm font-medium">{action.action}</p>
                                        <p className="text-xs text-muted-foreground">{action.reason}</p>
                                        {action.suggestedDate && (
                                          <p className="text-xs text-muted-foreground mt-1">
                                            <Calendar className="h-3 w-3 inline mr-1" />
                                            {action.suggestedDate}
                                          </p>
                                        )}
                                      </div>
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

              <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-900/10">
                <CardHeader className="flex-row items-center justify-between space-y-0 gap-2 pb-3">
                  <CardTitle className="text-base flex items-center">
                    <Paperclip className="h-4 w-4 mr-2 text-blue-500" />
                    Файлы и документы
                    <InfoPopover blockKey="attachments" />
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
                      category="team" 
                      label="Персонал (фото водителей, помощников)"
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
