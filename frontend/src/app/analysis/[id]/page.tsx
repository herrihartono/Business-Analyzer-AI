"use client";

import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { ChartContainer } from "@/components/charts/ChartContainer";
import { InsightCard } from "@/components/analysis/InsightCard";
import { RecommendationList } from "@/components/analysis/RecommendationList";
import { AnomalyAlert } from "@/components/analysis/AnomalyAlert";
import { ChatDrawer } from "@/components/analysis/ChatDrawer";
import { useAnalysis } from "@/hooks/useAnalysis";

export default function AnalysisDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : null;
  const { analysis, loading, error } = useAnalysis(id);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="flex h-96 flex-col items-center justify-center text-muted-foreground">
        <p className="text-lg font-medium">Analysis not found</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{analysis.business_type || "Analysis"}</h1>
          <Badge variant={analysis.status === "completed" ? "success" : "secondary"}>
            {analysis.status}
          </Badge>
        </div>
        {analysis.summary && (
          <p className="mt-1 text-muted-foreground">{analysis.summary}</p>
        )}
      </motion.div>

      {analysis.kpis && analysis.kpis.length > 0 && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {(analysis.kpis as { name: string; value: number; type: string; icon: string }[]).map((kpi, i) => (
            <KpiCard key={i} {...kpi} index={i} />
          ))}
        </div>
      )}

      <Tabs defaultValue="charts" className="w-full">
        <TabsList>
          <TabsTrigger value="charts">Charts</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="data">Data Preview</TabsTrigger>
          <TabsTrigger value="corrections">Data Quality</TabsTrigger>
        </TabsList>

        <TabsContent value="charts">
          <ChartContainer charts={(analysis.charts || []) as never[]} />
        </TabsContent>

        <TabsContent value="insights">
          <div className="space-y-3">
            {((analysis.insights || []) as { title: string; description: string; severity: string; category: string }[]).map((insight, i) => (
              <InsightCard key={i} {...insight} index={i} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="recommendations">
          <RecommendationList
            recommendations={(analysis.recommendations || []) as { title: string; description: string; priority: string; impact: string }[]}
          />
        </TabsContent>

        <TabsContent value="data">
          {analysis.raw_data_preview && (analysis.raw_data_preview as Record<string, unknown>[]).length > 0 ? (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    {Object.keys((analysis.raw_data_preview as Record<string, unknown>[])[0]).map((col) => (
                      <th key={col} className="px-4 py-2 text-left font-medium">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(analysis.raw_data_preview as Record<string, unknown>[]).slice(0, 20).map((row, i) => (
                    <tr key={i} className="border-b transition-colors hover:bg-muted/30">
                      {Object.values(row).map((val, j) => (
                        <td key={j} className="px-4 py-2">
                          {String(val ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">No data preview available</p>
          )}
        </TabsContent>

        <TabsContent value="corrections">
          <AnomalyAlert corrections={(analysis.data_corrections || []) as { column: string; action: string; affected_rows: number }[]} />
        </TabsContent>
      </Tabs>

      {analysis.status === "completed" && id && <ChatDrawer analysisId={id} />}
    </div>
  );
}
