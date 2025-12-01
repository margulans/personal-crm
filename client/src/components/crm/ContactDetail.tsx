import { useState } from "react";
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
import { ValueCategoryBadge } from "./ValueCategoryBadge";
import { ImportanceBadge } from "./ImportanceBadge";
import { AttentionLevelIndicator } from "./AttentionLevelIndicator";
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
} from "lucide-react";

import type { Contact, Interaction } from "@/lib/types";

const BLOCK_DESCRIPTIONS = {
  contact: {
    title: "Контактная информация",
    description: "Основные способы связи с контактом: телефон, email и социальные сети. Используйте эти данные для поддержания регулярного общения."
  },
  priority: {
    title: "Приоритизация и внимание",
    description: "Определяет, сколько времени и усилий нужно уделять этому контакту. Важность (A/B/C) показывает стратегическую ценность, категория — комбинацию вклада и потенциала. Уровень внимания (1-10) задаёт интенсивность взаимодействия."
  },
  heat: {
    title: "Тепловой статус",
    description: "Показывает 'здоровье' отношений. Heat Index рассчитывается по формуле: 40% давность контакта + 30% энергия связи + 20% качество ответа + 10% тренд. Зелёный — всё хорошо, жёлтый — нужно внимание, красный — срочно связаться!"
  },
  contribution: {
    title: "Вклад (0-15 баллов)",
    description: "Что этот человек уже даёт вам: финансовая польза, помощь сетью контактов, тактическая поддержка, стратегическое влияние и лояльность. Каждый критерий от 0 до 3 баллов."
  },
  potential: {
    title: "Потенциал (0-15 баллов)",
    description: "Что этот человек может дать в будущем: личностный рост, ресурсы, доступ к сети, синергия и роль в вашей системе. Каждый критерий от 0 до 3 баллов."
  },
  interactions: {
    title: "Взаимодействия",
    description: "История всех контактов с этим человеком. Отмечайте значимые взаимодействия — они влияют на Heat Index и помогают отслеживать динамику отношений."
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
    
    if (contact.attentionLevel < 6) {
      recommendations.push(`Поднимите уровень внимания хотя бы до 6`);
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
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {contact.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${contact.phone}`} className="hover:underline">
                        {contact.phone}
                      </a>
                    </div>
                  )}
                  {contact.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${contact.email}`} className="hover:underline">
                        {contact.email}
                      </a>
                    </div>
                  )}
                  {contact.socialLinks?.map((link, i) => (
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
                  {!contact.phone && !contact.email && (!contact.socialLinks || contact.socialLinks.length === 0) && (
                    <p className="text-sm text-muted-foreground col-span-2">
                      Контактные данные не указаны
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card 
                className="bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-slate-600 cursor-pointer transition-colors hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
                onClick={() => handleDoubleTap("priority", "priority")}
              >
                <CardHeader>
                  <CardTitle className="text-base flex items-center">
                    Приоритизация и внимание
                    <InfoPopover blockKey="priority" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                        Важность
                      </div>
                      <ImportanceBadge level={contact.importanceLevel} />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                        Категория
                      </div>
                      <ValueCategoryBadge category={contact.valueCategory} />
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
                      Уровень внимания
                    </div>
                    <div className="flex items-center gap-4">
                      <AttentionLevelIndicator level={contact.attentionLevel} />
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
                    <div>
                      <div className="text-sm font-medium mb-1">Рекомендация</div>
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
