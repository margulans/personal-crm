import { useState } from "react";
import { createPortal } from "react-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Info, Plus, Pencil, RefreshCw, X } from "lucide-react";
import { CONTRIBUTION_CRITERIA, POTENTIAL_CRITERIA } from "@/lib/constants";

interface PurchaseTotals {
  totalAmount: number;
  currency: string;
  count: number;
  lastPurchaseDate: string | null;
}

interface ContributionTotals {
  [key: string]: {
    totalAmount: number;
    currency: string;
    count: number;
    lastDate: string | null;
  };
}

const SCORE_DESCRIPTIONS = {
  contribution: {
    title: "Вклад (0-15 баллов)",
    description: `Что этот человек уже даёт: финансовый, ресурсный, репутационный, интеллектуальный и эмоциональный вклад.

Расчёт баллов:
• Финансовый — 50% веса: $0=0, <$100k=1, <$500k=2, ≥$500k=3 балла
• Остальные 4 критерия — по 12.5% каждый: 0 записей=0, 1-2=1, 3-4=2, 5+=3 балла

Классы: A (12+), B (8-11), C (4-7), D (0-3).`
  },
  potential: {
    title: "Потенциал (0-15 баллов)",
    description: `Что этот человек может дать в будущем: личностный рост, ресурсы, доступ к сети, синергия и роль в вашей системе.

Каждый критерий от 0 до 3 баллов.
Классы: A (12-15), B (8-11), C (4-7), D (0-3).`
  }
};

interface ScorePanelProps {
  type: "contribution" | "potential";
  scores: Record<string, number>;
  totalScore: number;
  scoreClass: string;
  compact?: boolean;
  onAddPurchase?: () => void;
  purchaseTotals?: PurchaseTotals | null;
  onEditPurchaseTotal?: () => void;
  contributionTotals?: ContributionTotals | null;
  onAddContribution?: (criterionType: string) => void;
  onViewContributions?: (criterionType: string) => void;
  onRecalculate?: () => void;
  isRecalculating?: boolean;
}

function InfoModal({ isOpen, onClose, title, description }: { isOpen: boolean; onClose: () => void; title: string; description: string }) {
  if (!isOpen) return null;
  
  const handleClose = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClose();
  };
  
  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={handleClose}
      onTouchEnd={handleClose}
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
    >
      <div 
        className="bg-background rounded-lg shadow-lg max-w-md w-full p-5 relative max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        <button 
          onClick={handleClose}
          onTouchEnd={handleClose}
          className="absolute top-3 right-3 p-2 rounded-sm hover:bg-accent active:bg-accent"
          data-testid="button-close-info-modal"
        >
          <X className="h-5 w-5" />
        </button>
        <h3 className="font-semibold text-lg mb-4 pr-8">{title}</h3>
        <div className="text-sm text-muted-foreground space-y-3">
          {description.split('\n\n').map((paragraph, i) => (
            <p key={i} className="whitespace-pre-line">{paragraph}</p>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}

export function ScorePanel({ type, scores, totalScore, scoreClass, compact = false, onAddPurchase, purchaseTotals, onEditPurchaseTotal, contributionTotals, onAddContribution, onViewContributions, onRecalculate, isRecalculating }: ScorePanelProps) {
  const [showInfo, setShowInfo] = useState(false);
  const criteria = type === "contribution" ? CONTRIBUTION_CRITERIA : POTENTIAL_CRITERIA;
  const title = type === "contribution" ? "Вклад" : "Потенциал";
  const info = SCORE_DESCRIPTIONS[type];

  const classColors: Record<string, string> = {
    A: "text-primary",
    B: "text-amber-600 dark:text-amber-500",
    C: "text-muted-foreground",
    D: "text-muted-foreground/60",
  };

  const formatAmount = (amount: number, currency: string) => {
    // Default to USD ($) if currency not specified or unknown
    const symbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : currency === "KZT" ? "₸" : "₽";
    return `${amount.toLocaleString()} ${symbol}`;
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
          const isContributionType = type === "contribution";
          const isFinancial = criterion.key === "financial" && isContributionType;
          const contributionTotal = isContributionType && contributionTotals?.[criterion.key];
          return (
            <div key={criterion.key} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">{criterion.label}</span>
                  {isContributionType && onAddContribution && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-5 w-5 text-primary hover:bg-primary/10"
                      onClick={() => onAddContribution(criterion.key)}
                      data-testid={`button-add-contribution-${criterion.key}`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {isContributionType && onViewContributions && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-5 w-5 text-muted-foreground hover:text-foreground"
                      onClick={() => onViewContributions(criterion.key)}
                      data-testid={`button-view-contributions-${criterion.key}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {isContributionType && onRecalculate && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-5 w-5 text-muted-foreground hover:text-primary"
                      onClick={onRecalculate}
                      disabled={isRecalculating}
                      data-testid={`button-recalculate-${criterion.key}`}
                    >
                      <RefreshCw className={cn("h-3.5 w-3.5", isRecalculating && "animate-spin")} />
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {isFinancial && purchaseTotals && purchaseTotals.totalAmount > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                        {formatAmount(purchaseTotals.totalAmount, purchaseTotals.currency)}
                      </span>
                      {onEditPurchaseTotal && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-4 w-4 text-muted-foreground hover:text-foreground"
                          onClick={onEditPurchaseTotal}
                          data-testid="button-edit-purchase-total"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  )}
                  {contributionTotal && contributionTotal.count > 0 && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      {contributionTotal.totalAmount > 0 ? formatAmount(contributionTotal.totalAmount, contributionTotal.currency) : `${contributionTotal.count} шт.`}
                    </span>
                  )}
                  <span className="font-mono font-medium">{value}/3</span>
                </div>
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
          <div className="flex items-center gap-1">
            <CardTitle className="text-base">{title}</CardTitle>
            <button 
              type="button"
              className="h-10 w-10 flex items-center justify-center rounded-md hover:bg-accent active:bg-accent touch-manipulation" 
              onClick={() => setShowInfo(true)}
              onTouchEnd={(e) => { e.preventDefault(); setShowInfo(true); }}
              data-testid={`button-info-${type}`}
            >
              <Info className="h-5 w-5 text-muted-foreground" />
            </button>
            <InfoModal 
              isOpen={showInfo} 
              onClose={() => setShowInfo(false)} 
              title={info.title} 
              description={info.description} 
            />
          </div>
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
