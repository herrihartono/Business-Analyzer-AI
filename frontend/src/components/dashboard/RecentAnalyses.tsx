"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { FileBarChart, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { AnalysisResult } from "@/lib/api";

interface Props {
  analyses: AnalysisResult[];
}

export function RecentAnalyses({ analyses }: Props) {
  if (analyses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
        <FileBarChart className="mb-3 h-10 w-10" />
        <p className="font-medium">No analyses yet</p>
        <p className="text-sm">Upload a file to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {analyses.map((a, i) => (
        <motion.div
          key={a.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <Link
            href={`/analysis/${a.id}`}
            className="flex items-center gap-4 rounded-lg p-3 transition-colors hover:bg-accent"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <FileBarChart className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium">{a.business_type || "Analyzing..."}</p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatDate(a.created_at)}
              </div>
            </div>
            <Badge variant={a.status === "completed" ? "success" : a.status === "failed" ? "destructive" : "secondary"}>
              {a.status}
            </Badge>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
