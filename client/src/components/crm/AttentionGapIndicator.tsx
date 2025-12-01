import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getAttentionGapStatus } from "@shared/schema";

interface AttentionGapIndicatorProps {
  actual: number;
  recommended: number;
  compact?: boolean;
}

const GAP_STATUS_CONFIG = {
  green: {
    label: "Норма",
    description: "Фактический уровень соответствует рекомендуемому",
    dotClass: "bg-emerald-500",
    textClass: "text-emerald-600 dark:text-emerald-400",
  },
  yellow: {
    label: "Небольшой разрыв",
    description: "Недобор 1-2 уровня",
    dotClass: "bg-amber-500",
    textClass: "text-amber-600 dark:text-amber-400",
  },
  red: {
    label: "Критический разрыв",
    description: "Недобор 3+ уровней",
    dotClass: "bg-red-500",
    textClass: "text-red-600 dark:text-red-400",
  },
};

export function AttentionGapIndicator({
  actual,
  recommended,
  compact = false,
}: AttentionGapIndicatorProps) {
  const gapStatus = getAttentionGapStatus(actual, recommended);
  const config = GAP_STATUS_CONFIG[gapStatus];
  const gap = recommended - actual;

  const indicator = (
    <div className={cn("flex items-center", compact ? "gap-1" : "gap-2")}>
      <div
        className={cn(
          "rounded-full flex-shrink-0",
          compact ? "w-2 h-2" : "w-2.5 h-2.5",
          config.dotClass
        )}
        data-testid={`attention-gap-dot-${gapStatus}`}
      />
      <div className={cn("flex items-center font-mono", compact ? "text-xs gap-1" : "text-sm gap-1.5")}>
        <span className="text-foreground" data-testid="attention-level-actual">
          {actual}
        </span>
        <span className="text-muted-foreground">/</span>
        <span className="text-muted-foreground" data-testid="attention-level-recommended">
          {recommended}
        </span>
        {gap > 0 && !compact && (
          <span className={cn("text-xs", config.textClass)} data-testid="attention-gap-value">
            (-{gap})
          </span>
        )}
      </div>
    </div>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="cursor-help" data-testid="attention-gap-indicator">
          {indicator}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="font-medium">{config.label}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Фактический: {actual} | Рекомендуемый: {recommended}
        </p>
        {gap > 0 && (
          <p className={cn("text-xs mt-1", config.textClass)}>
            {config.description}
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
