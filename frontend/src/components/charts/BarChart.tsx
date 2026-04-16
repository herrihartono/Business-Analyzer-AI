"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

const COLORS = ["hsl(221, 83%, 53%)", "hsl(160, 60%, 45%)", "hsl(30, 90%, 55%)", "hsl(280, 60%, 55%)"];

interface Props {
  data: Record<string, unknown>[];
  xKey: string;
  dataKeys: string[];
}

export function SmartBarChart({ data, xKey, dataKeys }: Props) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey={xKey} className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
        <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
          }}
        />
        <Legend />
        {dataKeys.map((key, i) => (
          <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
