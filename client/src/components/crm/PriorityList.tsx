import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HeatStatusBadge } from "./HeatStatusBadge";
import { ValueCategoryBadge } from "./ValueCategoryBadge";
import { formatDaysAgo } from "@/lib/constants";
import { AlertCircle, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Contact } from "@/lib/mockData";

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
  const getDaysSince = (dateStr: string) => {
    const date = new Date(dateStr);
    return Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  };

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
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {contacts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Нет контактов в этой категории
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
                  <ValueCategoryBadge category={contact.valueCategory} size="sm" />
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
