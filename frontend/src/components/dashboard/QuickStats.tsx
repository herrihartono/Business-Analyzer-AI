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
    { label: "Total Uploads", value: totalUploads, icon: Upload },
    { label: "Analyses Run", value: totalAnalyses, icon: BarChart3 },
    { label: "Business Types", value: Object.keys(businessTypes).length, icon: Brain },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.1 }}
          className="glass flex items-center gap-3 rounded-xl p-4"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <stat.icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
