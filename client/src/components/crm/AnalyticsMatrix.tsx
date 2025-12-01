import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Contact } from "@/lib/types";

interface AnalyticsMatrixProps {
  contacts: Contact[];
  onCellClick?: (importance: string, status: string) => void;
}

export function AnalyticsMatrix({ contacts, onCellClick }: AnalyticsMatrixProps) {
  const importanceLevels = ["A", "B", "C"] as const;
  const heatStatuses = ["green", "yellow", "red"] as const;

  const getCellCount = (importance: string, status: string) => {
    return contacts.filter(
      (c) => c.importanceLevel === importance && c.heatStatus === status
    ).length;
  };

  const statusColors = {
    green: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    yellow: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    red: "bg-red-500/10 text-red-700 dark:text-red-400",
  };

  const statusLabels = {
    green: "Зелёный",
    yellow: "Жёлтый",
    red: "Красный",
  };

  return (
    <Card data-testid="analytics-matrix">
      <CardHeader>
        <CardTitle className="text-base">Матрица контактов</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wide py-2" />
          {heatStatuses.map((status) => (
            <div
              key={status}
              className={cn(
                "text-center text-xs font-medium uppercase tracking-wide py-2 rounded",
                statusColors[status]
              )}
            >
              {statusLabels[status]}
            </div>
          ))}

          {importanceLevels.map((importance) => (
            <div key={importance} className="contents">
              <div className="flex items-center justify-center text-sm font-semibold">
                {importance}-класс
              </div>
              {heatStatuses.map((status) => {
                const count = getCellCount(importance, status);
                return (
                  <button
                    key={`${importance}-${status}`}
                    onClick={() => onCellClick?.(importance, status)}
                    className={cn(
                      "flex items-center justify-center h-14 rounded-lg text-lg font-bold font-mono transition-all",
                      "hover-elevate cursor-pointer",
                      count > 0 ? statusColors[status] : "bg-muted/50 text-muted-foreground"
                    )}
                    data-testid={`matrix-cell-${importance}-${status}`}
                  >
                    {count}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t">
          <div className="grid grid-cols-3 gap-4 text-center">
            {heatStatuses.map((status) => {
              const total = contacts.filter((c) => c.heatStatus === status).length;
              return (
                <div key={status}>
                  <div className={cn("text-2xl font-bold font-mono", statusColors[status])}>
                    {total}
                  </div>
                  <div className="text-xs text-muted-foreground">{statusLabels[status]}</div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
