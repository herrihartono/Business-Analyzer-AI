"use client";

import { motion } from "framer-motion";
import { Upload, BarChart3, Brain } from "lucide-react";

interface Props {
  totalUploads: number;
  totalAnalyses: number;
  businessTypes: Record<string, number>;
}

export function QuickStats({ totalUploads, totalAnalyses, businessTypes }: Props) {
  const stats = [
    { label: "Berkas tersimpan", value: totalUploads, icon: Upload },
    { label: "Analisis selesai", value: totalAnalyses, icon: BarChart3 },
    { label: "Jenis bisnis", value: Object.keys(businessTypes).length, icon: Brain },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.1 }}
          className="surface flex items-center gap-4 p-4 sm:p-5"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <stat.icon className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="data-number text-2xl font-semibold tracking-[-0.03em]">{stat.value}</p>
            <p className="truncate text-xs text-muted-foreground sm:text-sm">{stat.label}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
