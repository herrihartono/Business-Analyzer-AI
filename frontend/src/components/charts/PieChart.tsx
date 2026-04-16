"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

const COLORS = [
  "hsl(221, 83%, 53%)",
  "hsl(160, 60%, 45%)",
  "hsl(30, 90%, 55%)",
  "hsl(280, 60%, 55%)",
  "hsl(340, 70%, 55%)",
  "hsl(190, 70%, 45%)",
  "hsl(50, 80%, 50%)",
  "hsl(100, 50%, 45%)",
];

interface Props {
  data: Record<string, unknown>[];
  dataKey: string;
  nameKey: string;
}

export function SmartPieChart({ data, dataKey, nameKey }: Props) {
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
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
          }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
