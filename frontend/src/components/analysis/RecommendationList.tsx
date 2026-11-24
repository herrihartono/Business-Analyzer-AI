"use client";

import { motion } from "framer-motion";
import { Zap, FileText, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export interface Recommendation {
  title: string;
  description: string;
  priority: string;
  impact: string;
  sourceName?: string;
  sourceDate?: string;
  businessType?: string | null;
}

interface Props {
  recommendations: Recommendation[];
}

const priorityVariant = {
  high: "destructive" as const,
  medium: "warning" as const,
  low: "secondary" as const,
};

export function RecommendationList({ recommendations }: Props) {
  if (!recommendations || recommendations.length === 0) return null;

  return (
    <div className="space-y-3">
      {recommendations.map((rec, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.08 }}
          className="glass rounded-xl p-5 hover:border-primary/40 transition-colors"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-semibold text-base">{rec.title}</h4>
                  <Badge variant={priorityVariant[rec.priority as keyof typeof priorityVariant] || "secondary"}>
                    {rec.priority}
                  </Badge>
                  {rec.businessType && (
                    <Badge variant="outline" className="text-xs font-normal">
                      {rec.businessType}
                    </Badge>
                  )}
                </div>
              </div>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{rec.description}</p>
              <p className="mt-2 text-xs font-medium text-primary">Expected Impact: {rec.impact}</p>
              {(rec.sourceName || rec.sourceDate) && (
                <div className="mt-3 pt-2.5 border-t border-border/50 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                  {rec.sourceName && (
                    <div className="flex items-center gap-1.5 font-medium text-foreground/80">
                      <FileText className="h-3.5 w-3.5 text-primary" />
                      <span className="truncate max-w-[280px]" title={rec.sourceName}>{rec.sourceName}</span>
                    </div>
                  )}
                  {rec.sourceDate && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{formatDate(rec.sourceDate)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
