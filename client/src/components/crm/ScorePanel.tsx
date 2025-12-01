import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { CONTRIBUTION_CRITERIA, POTENTIAL_CRITERIA } from "@/lib/constants";

interface ScorePanelProps {
  type: "contribution" | "potential";
  scores: Record<string, number>;
  totalScore: number;
  scoreClass: string;
}

export function ScorePanel({ type, scores, totalScore, scoreClass }: ScorePanelProps) {
  const criteria = type === "contribution" ? CONTRIBUTION_CRITERIA : POTENTIAL_CRITERIA;
  const title = type === "contribution" ? "Вклад" : "Потенциал";

  const classColors: Record<string, string> = {
    A: "text-primary",
    B: "text-amber-600 dark:text-amber-500",
    C: "text-muted-foreground",
    D: "text-muted-foreground/60",
  };

  return (
    <Card 
      className={cn(
        type === "contribution" && "bg-cyan-50 dark:bg-cyan-950/30 border-cyan-200 dark:border-cyan-800",
        type === "potential" && "bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800"
      )}
      data-testid={`score-panel-${type}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold font-mono">{totalScore}</span>
            <span className={`text-xl font-bold ${classColors[scoreClass]}`}>
              {scoreClass}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {criteria.map((criterion) => {
          const key = criterion.key as keyof typeof scores;
          const value = scores[key] || 0;
          return (
            <div key={criterion.key} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{criterion.label}</span>
                <span className="font-mono font-medium">{value}/3</span>
              </div>
              <Progress value={(value / 3) * 100} className="h-1.5" />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
