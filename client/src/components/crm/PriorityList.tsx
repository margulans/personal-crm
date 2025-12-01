import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HeatStatusBadge } from "./HeatStatusBadge";
import { ImportanceBadge } from "./ImportanceBadge";
import { formatDaysAgo } from "@/lib/constants";
import { AlertCircle, TrendingUp, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Contact } from "@/lib/types";

const PRIORITY_DESCRIPTIONS = {
  urgent: {
    title: "Срочно связаться",
    description: "Контакты высокой ценности (AA, AB, BA) в красной зоне — отношения критически «остыли». Свяжитесь с ними в ближайшие дни, чтобы восстановить связь. Промедление может привести к потере контакта."
  },
  develop: {
    title: "Для развития",
    description: "Ценные контакты (AA, AB, BA) в жёлтой зоне — отношения ещё не критичны, но нуждаются во внимании. Запланируйте взаимодействие на ближайшие недели, чтобы предотвратить переход в красную зону."
  }
};

interface PriorityListProps {
  title: string;
  description: string;
  contacts: Contact[];
  variant: "urgent" | "develop";
  onContactClick?: (contact: Contact) => void;
}

export function PriorityList({
  title,
  description,
  contacts,
  variant,
  onContactClick,
}: PriorityListProps) {
  const Icon = variant === "urgent" ? AlertCircle : TrendingUp;

  const today = new Date();
  const getDaysSince = (dateStr: string | null) => {
    if (!dateStr) return 30;
    const date = new Date(dateStr);
    return Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  };

  const info = PRIORITY_DESCRIPTIONS[variant];

  return (
    <Card data-testid={`priority-list-${variant}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Icon
            className={cn(
              "w-5 h-5",
              variant === "urgent" ? "text-red-500" : "text-amber-500"
            )}
          />
          <div className="flex-1">
            <CardTitle className="text-base flex items-center">
              {title}
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
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {contacts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Нет контактов в этом списке
          </p>
        ) : (
          contacts.map((contact) => (
            <button
              key={contact.id}
              onClick={() => onContactClick?.(contact)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all",
                "hover-elevate cursor-pointer",
                variant === "urgent" ? "bg-red-500/5" : "bg-amber-500/5"
              )}
              data-testid={`priority-item-${contact.id}`}
            >
              <HeatStatusBadge status={contact.heatStatus} size="md" />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">{contact.fullName}</span>
                  <ImportanceBadge level={contact.importanceLevel} size="sm" />
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {contact.roleTags.slice(0, 2).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="text-right text-xs text-muted-foreground">
                <div>{formatDaysAgo(getDaysSince(contact.lastContactDate))}</div>
                <div className="text-muted-foreground/60">
                  цель: {contact.desiredFrequencyDays} дн.
                </div>
              </div>
            </button>
          ))
        )}
      </CardContent>
    </Card>
  );
}
