import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ATTENTION_LEVELS } from "@/lib/constants";

interface AttentionLevelIndicatorProps {
  level: number;
  showLabel?: boolean;
  compact?: boolean;
}

export function AttentionLevelIndicator({
  level,
  showLabel = false,
  compact = false,
}: AttentionLevelIndicatorProps) {
  const levelInfo = ATTENTION_LEVELS.find((l) => l.id === level);

  const indicator = (
    <div className="flex items-center gap-2">
      <div className={cn("flex gap-0.5", compact && "gap-px")}>
        {Array.from({ length: 10 }, (_, i) => (
          <div
            key={i}
            className={cn(
              compact ? "w-1 h-3" : "w-1.5 h-4",
              "rounded-sm transition-colors",
              i < level
                ? level >= 8
                  ? "bg-primary"
                  : level >= 5
                    ? "bg-primary/70"
                    : "bg-primary/40"
                : "bg-muted"
            )}
          />
        ))}
      </div>
      {!compact && (
        <span className="text-sm font-mono text-muted-foreground" data-testid="attention-level-value">
          {level}
        </span>
      )}
    </div>
  );

  if (showLabel && levelInfo) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="cursor-help">{indicator}</div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="font-medium">{levelInfo.name}</p>
          <p className="text-xs text-muted-foreground">{levelInfo.description}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return indicator;
}
