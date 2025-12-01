import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
          <CardTitle className="text-base">Распределение по статусу</CardTitle>
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
        <CardTitle className="text-base">Распределение по статусу</CardTitle>
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

export function ValueCategoryChart({ contacts }: AnalyticsChartsProps) {
  const categories = ["AA", "AB", "BA", "BB", "AC", "CA", "BC", "CB", "CC", "AD", "DA", "BD", "DB", "CD", "DC", "DD"];
  
  const data = categories
    .map((cat) => ({
      name: cat,
      value: contacts.filter((c) => c.valueCategory === cat).length,
    }))
    .filter((d) => d.value > 0);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Распределение по ценности</CardTitle>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center text-muted-foreground">
          Нет данных
        </CardContent>
      </Card>
    );
  }

  const getBarColor = (category: string) => {
    if (category.startsWith("A")) return "#10b981";
    if (category.startsWith("B")) return "#3b82f6";
    if (category.startsWith("C")) return "#f59e0b";
    return "#6b7280";
  };

  return (
    <Card data-testid="chart-value-category">
      <CardHeader>
        <CardTitle className="text-base">Распределение по ценности</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
              <XAxis type="number" allowDecimals={false} />
              <YAxis dataKey="name" type="category" width={40} fontSize={12} />
              <Tooltip
                formatter={(value: number) => [`${value} контактов`, "Количество"]}
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.name)} />
                ))}
              </Bar>
            </BarChart>
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
        <CardTitle className="text-base">Важность vs Статус</CardTitle>
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
          <CardTitle className="text-base">Распределение по вниманию</CardTitle>
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
        <CardTitle className="text-base">Распределение по уровню внимания</CardTitle>
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
