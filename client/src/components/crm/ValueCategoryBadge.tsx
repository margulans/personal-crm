import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ValueCategoryBadgeProps {
  category: string;
  size?: "sm" | "md";
}

export function ValueCategoryBadge({ category, size = "md" }: ValueCategoryBadgeProps) {
  const isHighValue = category.startsWith("A") || category === "BA";
  
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-mono font-semibold",
        size === "sm" ? "text-xs px-1.5 py-0" : "text-sm px-2 py-0.5",
        isHighValue && "border-primary/50 text-primary"
      )}
      data-testid={`value-category-${category}`}
    >
      {category}
    </Badge>
  );
}
