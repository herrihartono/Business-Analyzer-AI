"use client";

import { motion } from "framer-motion";
import { ShieldAlert, Wrench } from "lucide-react";

interface Correction {
  column: string;
  action: string;
  affected_rows: number;
}

interface Props {
  corrections: Correction[];
}

export function AnomalyAlert({ corrections }: Props) {
  if (!corrections || corrections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
        <ShieldAlert className="mb-2 h-8 w-8" />
        <p className="text-sm">No data corrections needed</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {corrections.map((c, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="flex items-center gap-3 rounded-lg border p-3"
        >
          <Wrench className="h-4 w-4 shrink-0 text-amber-500" />
          <div className="flex-1 text-sm">
            <span className="font-medium">{c.column}</span>
            <span className="text-muted-foreground">
              {" "}&mdash; {c.action.replace(/_/g, " ")} ({c.affected_rows} rows)
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
