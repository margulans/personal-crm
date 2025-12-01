import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ImportanceBadgeProps {
  level: "A" | "B" | "C";
  size?: "sm" | "md";
}

export function ImportanceBadge({ level, size = "md" }: ImportanceBadgeProps) {
  const variants = {
    A: "bg-primary/10 text-primary border-primary/20",
    B: "bg-muted text-muted-foreground border-muted",
    C: "bg-muted/50 text-muted-foreground/70 border-muted/50",
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-semibold",
        size === "sm" ? "text-xs px-1.5 py-0" : "text-sm px-2 py-0.5",
        variants[level]
      )}
      data-testid={`importance-${level}`}
    >
      {level}
    </Badge>
  );
}
