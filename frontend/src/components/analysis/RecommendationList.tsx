"use client";

import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Recommendation {
  title: string;
  description: string;
  priority: string;
  impact: string;
  sourceLabel?: string;
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
          className="glass rounded-xl p-5"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold">{rec.title}</h4>
                <Badge variant={priorityVariant[rec.priority as keyof typeof priorityVariant] || "secondary"}>
                  {rec.priority}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{rec.description}</p>
              <p className="mt-2 text-xs font-medium text-primary">Expected Impact: {rec.impact}</p>
              {rec.sourceLabel ? (
                <div className="mt-2">
                  <span className="inline-flex rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                    Source: {rec.sourceLabel}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
