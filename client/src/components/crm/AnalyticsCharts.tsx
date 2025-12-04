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
    title: "Распределение внимания",
    description: "Показывает, как распределены контакты по 10 уровням статуса отношений (1 — минимум, 10 — максимум). Помогает оценить баланс усилий и выявить перегруженные/недогруженные уровни."
  },
  country: {
    title: "По странам",
    description: "Показывает географическое распределение вашей сети контактов. Помогает оценить охват и выявить ключевые регионы для развития отношений."
  },
  industry: {
    title: "По отраслям",
    description: "Показывает распределение контактов по отраслям бизнеса. Помогает понять, в каких секторах у вас сильные позиции, а где есть потенциал для расширения."
  },
  activityType: {
    title: "По видам деятельности",
    description: "Показывает распределение контактов по сферам: спорт, культура, бизнес, политика, наука и др. Помогает оценить разнообразие вашей сети и найти возможности для кросс-секторного сотрудничества."
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
          <CardTitle className="text-base">Распределение внимания</CardTitle>
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
          Распределение внимания
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

const COUNTRY_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", 
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1"
];

export function CountryChart({ contacts }: AnalyticsChartsProps) {
  const countryMap = new Map<string, number>();
  
  contacts.forEach((c) => {
    const country = c.country || "Не указана";
    countryMap.set(country, (countryMap.get(country) || 0) + 1);
  });
  
  const data = Array.from(countryMap.entries())
    .filter(([name]) => name !== "Не указана")
    .map(([name, value], index) => ({
      name,
      value,
      color: COUNTRY_COLORS[index % COUNTRY_COLORS.length],
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">По странам</CardTitle>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center text-muted-foreground">
          Нет данных. Укажите страну в карточке контакта.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="chart-country">
      <CardHeader>
        <CardTitle className="text-base flex items-center">
          По странам
          <InfoPopover chartKey="country" />
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

const INDUSTRY_COLORS = [
  "#6366f1", "#22c55e", "#eab308", "#ef4444", "#a855f7",
  "#14b8a6", "#f97316", "#0ea5e9", "#ec4899", "#84cc16"
];

export function IndustryChart({ contacts }: AnalyticsChartsProps) {
  const industryMap = new Map<string, number>();
  
  contacts.forEach((c) => {
    const industry = c.industry || "Не указана";
    industryMap.set(industry, (industryMap.get(industry) || 0) + 1);
  });
  
  const data = Array.from(industryMap.entries())
    .filter(([name]) => name !== "Не указана")
    .map(([name, value], index) => ({
      name,
      value,
      color: INDUSTRY_COLORS[index % INDUSTRY_COLORS.length],
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">По отраслям</CardTitle>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center text-muted-foreground">
          Нет данных. Укажите отрасль в карточке контакта.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="chart-industry">
      <CardHeader>
        <CardTitle className="text-base flex items-center">
          По отраслям
          <InfoPopover chartKey="industry" />
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
                label={({ name, percent }) => `${name.length > 12 ? name.substring(0, 12) + "..." : name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string, props: { payload?: { name?: string } }) => [
                  `${value} контактов`, 
                  props.payload?.name || ""
                ]}
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

const ACTIVITY_COLORS = [
  "#8b5cf6", "#06b6d4", "#22c55e", "#f59e0b", "#ef4444",
  "#ec4899", "#3b82f6", "#84cc16", "#f97316", "#6366f1"
];

export function ActivityTypeChart({ contacts }: AnalyticsChartsProps) {
  const activityMap = new Map<string, number>();
  
  contacts.forEach((c) => {
    const activity = c.activityType || "Не указан";
    activityMap.set(activity, (activityMap.get(activity) || 0) + 1);
  });
  
  const data = Array.from(activityMap.entries())
    .filter(([name]) => name !== "Не указан")
    .map(([name, value], index) => ({
      name,
      value,
      color: ACTIVITY_COLORS[index % ACTIVITY_COLORS.length],
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">По видам деятельности</CardTitle>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center text-muted-foreground">
          Нет данных. Укажите вид деятельности в карточке контакта.
        </CardContent>
      </Card>
    );
  }

  const total = data.reduce((acc, item) => acc + item.value, 0);

  return (
    <Card data-testid="chart-activity-type">
      <CardHeader>
        <CardTitle className="text-base flex items-center">
          По видам деятельности
          <InfoPopover chartKey="activityType" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 flex items-center">
          <ResponsiveContainer width="50%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                dataKey="value"
                nameKey="name"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [`${value} контактов (${Math.round(value / total * 100)}%)`, ""]}
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex-1 space-y-1 text-sm">
            {data.map((item, index) => (
              <div key={index} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-sm" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="truncate max-w-32">{item.name}</span>
                </div>
                <span className="text-muted-foreground">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
