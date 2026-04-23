"use client";

import { motion } from "framer-motion";
import { DollarSign, TrendingUp, Hash, Percent, Rows3, Columns3, Calculator } from "lucide-react";
import { formatCurrencyIDR, formatNumberID } from "@/lib/utils";

const iconMap: Record<string, React.ElementType> = {
  dollar: DollarSign,
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
  if (type === "currency") return formatCurrencyIDR(value);
  if (type === "percentage") return `${formatNumberID(value)}%`;
  if (type === "count" || type === "number") return formatNumberID(value);
  return String(value);
}

export function KpiCard({ name, value, type, icon, index = 0 }: KpiCardProps) {
  const Icon = iconMap[icon] || Hash;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="glass rounded-xl p-5"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{name}</p>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight">{formatKpiValue(value, type)}</p>
    </motion.div>
  );
}
