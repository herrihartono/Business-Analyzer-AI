"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Lightbulb } from "lucide-react";
import { InsightCard } from "@/components/analysis/InsightCard";
import { RecommendationList } from "@/components/analysis/RecommendationList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AnalysisResult } from "@/lib/api";
import api from "@/lib/api";

export default function InsightsPage() {
  const [analyses, setAnalyses] = useState<AnalysisResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<AnalysisResult[]>("/api/analyses")
      .then((res) => setAnalyses(res.data.filter((a) => a.status === "completed")))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const allInsights = analyses.flatMap(
    (a) => ((a.insights || []) as { title: string; description: string; severity: string; category: string }[])
  );
  const allRecs = analyses.flatMap(
    (a) => ((a.recommendations || []) as { title: string; description: string; priority: string; impact: string }[])
  );

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold tracking-tight">Insights Panel</h1>
        <p className="text-muted-foreground">Aggregated insights from all analyses</p>
      </motion.div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : allInsights.length === 0 ? (
        <Card className="glass">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Lightbulb className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No insights yet</h3>
            <p className="text-sm text-muted-foreground">
              Upload and analyze files to generate AI insights
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="insights">
          <TabsList>
            <TabsTrigger value="insights">Insights ({allInsights.length})</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations ({allRecs.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="insights">
            <div className="space-y-3">
              {allInsights.map((insight, i) => (
                <InsightCard key={i} {...insight} index={i} />
              ))}
            </div>
          </TabsContent>
          <TabsContent value="recommendations">
            <RecommendationList recommendations={allRecs} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
