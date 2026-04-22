"use client";

import { motion } from "framer-motion";
import { Banknote, TrendingUp, Hash, Percent, Rows3, Columns3, Calculator } from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  dollar: Banknote,
  trending: TrendingUp,
  hash: Hash,
  percent: Percent,
  rows: Rows3,
  columns: Columns3,
  sum: Calculator,
};

interface KpiCardProps {
  name: string;
  value: number;
  type: string;
  icon: string;
  index?: number;
}

function formatKpiValue(value: number, type: string): string {
  if (type === "currency") {
    return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
  }
  if (type === "percentage") return `${value}%`;
  if (type === "count" || type === "number") return Math.round(value).toLocaleString("id-ID");
  return String(value);
}

export function KpiCard({ name, value, type, icon, index = 0 }: KpiCardProps) {
  const Icon = iconMap[icon] || Hash;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="glass rounded-xl p-4 min-w-0"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{name}</p>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
      <p className="mt-2 text-lg sm:text-xl lg:text-2xl font-bold tracking-tight truncate">
        {formatKpiValue(value, type)}
      </p>
    </motion.div>
  );
}
