import { cn } from "@/lib/utils";

interface HeatStatusBadgeProps {
  status: "green" | "yellow" | "red";
  heatIndex?: number;
  size?: "sm" | "md" | "lg";
  showIndex?: boolean;
}

export function HeatStatusBadge({
  status,
  heatIndex,
  size = "md",
  showIndex = false,
}: HeatStatusBadgeProps) {
  const sizeClasses = {
    sm: "w-2.5 h-2.5",
    md: "w-3.5 h-3.5",
    lg: "w-5 h-5",
  };

  const statusColors = {
    green: "bg-emerald-500",
    yellow: "bg-amber-500",
    red: "bg-red-500",
  };

  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "rounded-full flex-shrink-0",
          sizeClasses[size],
          statusColors[status]
        )}
        data-testid={`heat-status-${status}`}
      />
      {showIndex && heatIndex !== undefined && (
        <span className="text-sm font-mono text-muted-foreground" data-testid="heat-index-value">
          {heatIndex.toFixed(2)}
        </span>
      )}
    </div>
  );
}
