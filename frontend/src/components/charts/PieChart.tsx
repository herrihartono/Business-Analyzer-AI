"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { formatCurrencyIDR, formatNumberID, parseNumericValue } from "@/lib/utils";

const COLORS = [
  "hsl(162, 63%, 32%)",
  "hsl(40, 76%, 57%)",
  "hsl(8, 53%, 53%)",
  "hsl(198, 45%, 46%)",
  "hsl(282, 28%, 48%)",
  "hsl(26, 55%, 48%)",
  "hsl(130, 28%, 45%)",
  "hsl(215, 35%, 52%)",
];

interface Props {
  data: Record<string, unknown>[];
  dataKey: string;
  nameKey: string;
  valueFormat?: "currency" | "number";
}

function formatChartValue(value: unknown, valueFormat: "currency" | "number"): string {
  const numeric = parseNumericValue(value);
  if (numeric === null) return String(value ?? "");
  return valueFormat === "currency" ? formatCurrencyIDR(numeric) : formatNumberID(numeric);
}

export function SmartPieChart({ data, dataKey, nameKey, valueFormat = "number" }: Props) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          dataKey={dataKey}
          nameKey={nameKey}
          paddingAngle={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name) => [formatChartValue(value, valueFormat), String(name)]}
          itemStyle={{ color: "hsl(var(--foreground))" }}
          labelStyle={{ color: "hsl(var(--foreground))" }}
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            color: "hsl(var(--foreground))",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.25)",
          }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
