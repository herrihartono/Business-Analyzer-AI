"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Info, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const severityConfig = {
  info: { icon: Info, color: "text-blue-500", bg: "bg-blue-500/10" },
  warning: { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-500/10" },
  critical: { icon: AlertCircle, color: "text-red-500", bg: "bg-red-500/10" },
  success: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
};

interface Props {
  title: string;
  description: string;
  severity: string;
  category: string;
  index?: number;
}

export function InsightCard({ title, description, severity, category, index = 0 }: Props) {
  const config = severityConfig[severity as keyof typeof severityConfig] || severityConfig.info;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="glass rounded-xl p-5"
    >
      <div className="flex items-start gap-3">
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", config.bg)}>
          <Icon className={cn("h-5 w-5", config.color)} />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">{title}</h4>
            <span className="text-xs text-muted-foreground">{category}</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </motion.div>
  );
}
