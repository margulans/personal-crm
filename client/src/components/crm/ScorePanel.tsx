import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Info } from "lucide-react";
import { CONTRIBUTION_CRITERIA, POTENTIAL_CRITERIA } from "@/lib/constants";

const SCORE_DESCRIPTIONS = {
  contribution: {
    title: "Вклад (0-15 баллов)",
    description: "Что этот человек уже даёт вам: финансовый, ресурсный, репутационный, интеллектуальный и эмоциональный вклад. Каждый критерий от 0 до 3 баллов. Класс: A (12+), B (8-11), C (4-7), D (0-3)."
  },
  potential: {
    title: "Потенциал (0-15 баллов)",
    description: "Что этот человек может дать в будущем: личностный рост, ресурсы, доступ к сети, синергия и роль в вашей системе. Каждый критерий от 0 до 3 баллов. Класс: A (12-15), B (8-11), C (4-7), D (0-3)."
  }
};

interface ScorePanelProps {
  type: "contribution" | "potential";
  scores: Record<string, number>;
  totalScore: number;
  scoreClass: string;
  compact?: boolean;
}

export function ScorePanel({ type, scores, totalScore, scoreClass, compact = false }: ScorePanelProps) {
  const criteria = type === "contribution" ? CONTRIBUTION_CRITERIA : POTENTIAL_CRITERIA;
  const title = type === "contribution" ? "Вклад" : "Потенциал";
  const info = SCORE_DESCRIPTIONS[type];

  const classColors: Record<string, string> = {
    A: "text-primary",
    B: "text-amber-600 dark:text-amber-500",
    C: "text-muted-foreground",
    D: "text-muted-foreground/60",
  };

  if (compact) {
    return (
      <div className="space-y-3" data-testid={`score-panel-${type}-compact`}>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{title}</span>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold font-mono">{totalScore}</span>
            <span className={`text-base font-bold ${classColors[scoreClass]}`}>
              {scoreClass}
            </span>
          </div>
        </div>
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
      </div>
    );
  }

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
