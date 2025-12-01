import { Badge } from "@/components/ui/badge";
import { INTERACTION_TYPES, INTERACTION_CHANNELS } from "@/lib/constants";
import { Phone, MessageSquare, Users, Gift, Share2, Calendar, MoreHorizontal, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Interaction } from "@/lib/mockData";

interface InteractionItemProps {
  interaction: Interaction;
}

const typeIcons: Record<string, typeof Phone> = {
  call: Phone,
  meeting: Users,
  message: MessageSquare,
  event: Calendar,
  gift: Gift,
  intro: Share2,
  other: MoreHorizontal,
};

export function InteractionItem({ interaction }: InteractionItemProps) {
  const Icon = typeIcons[interaction.type] || MoreHorizontal;
  const typeLabel = INTERACTION_TYPES.find((t) => t.value === interaction.type)?.label || interaction.type;
  const channelLabel = INTERACTION_CHANNELS.find((c) => c.value === interaction.channel)?.label || interaction.channel;

  const formattedDate = new Date(interaction.date).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: interaction.date.startsWith(new Date().getFullYear().toString()) ? undefined : "numeric",
  });

  return (
    <div
      className={cn(
        "flex gap-3 p-3 rounded-lg transition-colors",
        interaction.isMeaningful ? "bg-primary/5" : "bg-transparent hover:bg-muted/50"
      )}
      data-testid={`interaction-${interaction.id}`}
    >
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          interaction.isMeaningful ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
        )}
      >
        <Icon className="w-4 h-4" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium">{typeLabel}</span>
          <Badge variant="secondary" className="text-xs px-1.5 py-0">
            {channelLabel}
          </Badge>
          {interaction.isMeaningful && (
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
          )}
        </div>
        {interaction.note && (
          <p className="text-sm text-muted-foreground line-clamp-2">{interaction.note}</p>
        )}
      </div>

      <div className="flex-shrink-0 text-xs text-muted-foreground">
        {formattedDate}
      </div>
    </div>
  );
}
