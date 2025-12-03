import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Info } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { Contact } from "@/lib/types";

const CHART_DESCRIPTIONS = {
  heatStatus: {
    title: "Структура отношений",
    description: "Показывает долю контактов в каждой зоне. Зелёный — отношения в порядке, жёлтый — нужно внимание, красный — срочно связаться. Стремитесь к максимуму зелёных контактов."
  },
  importance: {
    title: "Распределение по важности",
    description: "Показывает количество контактов в каждом классе важности (A, B, C). Важность рассчитывается автоматически из оценок вклада и потенциала."
  },
  importanceStatus: {
    title: "Важность vs Статус",
    description: "Сопоставляет уровень важности (A/B/C) с тепловым статусом. Помогает найти проблемы: A-класс в красной зоне — критично, C-класс в красной — менее срочно."
  },
  attention: {
    title: "Распределение по статусу отношений",
    description: "Показывает, как распределены контакты по 10 уровням статуса отношений (1 — минимум, 10 — максимум). Помогает оценить баланс усилий и выявить перегруженные/недогруженные уровни."
  }
};

function InfoPopover({ chartKey }: { chartKey: keyof typeof CHART_DESCRIPTIONS }) {
  const info = CHART_DESCRIPTIONS[chartKey];
  return (
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
  );
}

interface AnalyticsChartsProps {
  contacts: Contact[];
}

export function HeatStatusChart({ contacts }: AnalyticsChartsProps) {
  const data = [
    { name: "Зелёный", value: contacts.filter((c) => c.heatStatus === "green").length, color: "#10b981" },
    { name: "Жёлтый", value: contacts.filter((c) => c.heatStatus === "yellow").length, color: "#f59e0b" },
    { name: "Красный", value: contacts.filter((c) => c.heatStatus === "red").length, color: "#ef4444" },
  ].filter((d) => d.value > 0);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Структура отношений</CardTitle>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center text-muted-foreground">
          Нет данных
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="chart-heat-status">
      <CardHeader>
        <CardTitle className="text-base flex items-center">
          Структура отношений
          <InfoPopover chartKey="heatStatus" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [`${value} контактов`, ""]}
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function ImportanceChart({ contacts }: AnalyticsChartsProps) {
  const data = [
    { name: "A - Высокая", value: contacts.filter((c) => c.importanceLevel === "A").length, color: "#10b981" },
    { name: "B - Средняя", value: contacts.filter((c) => c.importanceLevel === "B").length, color: "#3b82f6" },
    { name: "C - Низкая", value: contacts.filter((c) => c.importanceLevel === "C").length, color: "#6b7280" },
  ].filter((d) => d.value > 0);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Распределение по важности</CardTitle>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center text-muted-foreground">
          Нет данных
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="chart-importance">
      <CardHeader>
        <CardTitle className="text-base flex items-center">
          Распределение по важности
          <InfoPopover chartKey="importance" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [`${value} контактов`, ""]}
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function ImportanceLevelChart({ contacts }: AnalyticsChartsProps) {
  const data = [
    { 
      name: "A-класс", 
      green: contacts.filter((c) => c.importanceLevel === "A" && c.heatStatus === "green").length,
      yellow: contacts.filter((c) => c.importanceLevel === "A" && c.heatStatus === "yellow").length,
      red: contacts.filter((c) => c.importanceLevel === "A" && c.heatStatus === "red").length,
    },
    { 
      name: "B-класс", 
      green: contacts.filter((c) => c.importanceLevel === "B" && c.heatStatus === "green").length,
      yellow: contacts.filter((c) => c.importanceLevel === "B" && c.heatStatus === "yellow").length,
      red: contacts.filter((c) => c.importanceLevel === "B" && c.heatStatus === "red").length,
    },
    { 
      name: "C-класс", 
      green: contacts.filter((c) => c.importanceLevel === "C" && c.heatStatus === "green").length,
      yellow: contacts.filter((c) => c.importanceLevel === "C" && c.heatStatus === "yellow").length,
      red: contacts.filter((c) => c.importanceLevel === "C" && c.heatStatus === "red").length,
    },
  ];

  const hasData = data.some((d) => d.green > 0 || d.yellow > 0 || d.red > 0);

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Важность vs Статус</CardTitle>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center text-muted-foreground">
          Нет данных
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="chart-importance-status">
      <CardHeader>
        <CardTitle className="text-base flex items-center">
          Важность vs Статус
          <InfoPopover chartKey="importanceStatus" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ left: -10, right: 20 }}>
              <XAxis dataKey="name" fontSize={12} />
              <YAxis allowDecimals={false} fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="green" name="Зелёный" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
              <Bar dataKey="yellow" name="Жёлтый" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
              <Bar dataKey="red" name="Красный" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function AttentionDistributionChart({ contacts }: AnalyticsChartsProps) {
  const data = Array.from({ length: 10 }, (_, i) => ({
    level: i + 1,
    count: contacts.filter((c) => c.attentionLevel === i + 1).length,
  }));

  const hasData = data.some((d) => d.count > 0);

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Распределение по статусу отношений</CardTitle>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center text-muted-foreground">
          Нет данных
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="chart-attention">
      <CardHeader>
        <CardTitle className="text-base flex items-center">
          Распределение по статусу отношений
          <InfoPopover chartKey="attention" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ left: -10, right: 20 }}>
              <XAxis dataKey="level" fontSize={12} />
              <YAxis allowDecimals={false} fontSize={12} />
              <Tooltip
                formatter={(value: number) => [`${value} контактов`, "Количество"]}
                labelFormatter={(label) => `Уровень ${label}`}
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                }}
              />
              <Bar 
                dataKey="count" 
                fill="hsl(var(--primary))" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
