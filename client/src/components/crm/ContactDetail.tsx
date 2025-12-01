import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
} from "lucide-react";
import type { Contact, Interaction } from "@/lib/types";

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
}

export function ContactDetail({
  contact,
  interactions,
  onBack,
  onAddInteraction,
  onEdit,
}: ContactDetailProps) {
  const [showInteractionForm, setShowInteractionForm] = useState(false);

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

  const contributionDetails = contact.contributionDetails || { financial: 0, network: 0, tactical: 0, strategic: 0, loyalty: 0 };
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
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Контактная информация</CardTitle>
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

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Приоритизация и внимание</CardTitle>
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

              <Card className={cn(
                contact.heatStatus === "green" && "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800",
                contact.heatStatus === "yellow" && "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
                contact.heatStatus === "red" && "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
              )}>
                <CardHeader>
                  <CardTitle className="text-base">Тепловой статус</CardTitle>
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
                <ScorePanel
                  type="contribution"
                  scores={contributionDetails}
                  totalScore={contact.contributionScore}
                  scoreClass={contact.contributionClass}
                />
                <ScorePanel
                  type="potential"
                  scores={potentialDetails}
                  totalScore={contact.potentialScore}
                  scoreClass={contact.potentialClass}
                />
              </div>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0 gap-2 pb-3">
                  <CardTitle className="text-base">Взаимодействия</CardTitle>
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
