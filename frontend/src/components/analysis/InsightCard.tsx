"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Info, CheckCircle2, AlertCircle, FileText, Calendar } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

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
  sourceName?: string;
  sourceDate?: string;
  businessType?: string | null;
}

export function InsightCard({
  title,
  description,
  severity,
  category,
  index = 0,
  sourceName,
  sourceDate,
  businessType,
}: Props) {
  const config = severityConfig[severity as keyof typeof severityConfig] || severityConfig.info;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="glass rounded-xl p-5 hover:border-primary/40 transition-colors"
    >
      <div className="flex items-start gap-3">
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", config.bg)}>
          <Icon className={cn("h-5 w-5", config.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="font-semibold text-base">{title}</h4>
            <div className="flex items-center gap-1.5 flex-wrap">
              {businessType && (
                <Badge variant="outline" className="text-xs font-normal">
                  {businessType}
                </Badge>
              )}
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                {category}
              </span>
            </div>
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{description}</p>
          {(sourceName || sourceDate) && (
            <div className="mt-3 pt-2.5 border-t border-border/50 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
              {sourceName && (
                <div className="flex items-center gap-1.5 font-medium text-foreground/80">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  <span className="truncate max-w-[280px]" title={sourceName}>{sourceName}</span>
                </div>
              )}
              {sourceDate && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{formatDate(sourceDate)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
