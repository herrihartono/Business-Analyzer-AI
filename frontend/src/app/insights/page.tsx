"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Lightbulb } from "lucide-react";
import { InsightCard } from "@/components/analysis/InsightCard";
import { RecommendationList } from "@/components/analysis/RecommendationList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAnalyses, getUploads, type AnalysisResult, type UploadFile } from "@/lib/api";

const ALL_UPLOADS_VALUE = "__all_uploads__";

type InsightItem = {
  title: string;
  description: string;
  severity: string;
  category: string;
  sourceLabel: string;
};

type RecommendationItem = {
  title: string;
  description: string;
  priority: string;
  impact: string;
  sourceLabel: string;
};

export default function InsightsPage() {
  const [analyses, setAnalyses] = useState<AnalysisResult[]>([]);
  const [uploads, setUploads] = useState<UploadFile[]>([]);
  const [selectedUploadId, setSelectedUploadId] = useState(ALL_UPLOADS_VALUE);
  const [loadingAnalyses, setLoadingAnalyses] = useState(true);
  const [loadingUploads, setLoadingUploads] = useState(true);

  useEffect(() => {
    getUploads()
      .then((data) => setUploads(data))
      .catch(() => {})
      .finally(() => setLoadingUploads(false));
  }, []);

  useEffect(() => {
    const uploadId = selectedUploadId === ALL_UPLOADS_VALUE ? undefined : selectedUploadId;

    setLoadingAnalyses(true);
    getAnalyses(uploadId)
      .then((data) => setAnalyses(data.filter((a) => a.status === "completed")))
      .catch(() => {})
      .finally(() => setLoadingAnalyses(false));
  }, [selectedUploadId]);

  const uploadNameMap = uploads.reduce<Record<string, string>>((acc, upload) => {
    acc[upload.id] = upload.original_name;
    return acc;
  }, {});

  const selectedSourceLabel =
    selectedUploadId === ALL_UPLOADS_VALUE
      ? "All uploaded files"
      : uploadNameMap[selectedUploadId] || "Selected file";

  const allInsights: InsightItem[] = analyses.flatMap((analysis) =>
    (analysis.insights || []).map((rawInsight) => {
      const insight = rawInsight as Partial<InsightItem>;
      return {
        title: insight.title || "Untitled Insight",
        description: insight.description || "No description available.",
        severity: insight.severity || "info",
        category: insight.category || "General",
        sourceLabel: uploadNameMap[analysis.upload_id] || analysis.upload_id,
      };
    })
  );
  const allRecs: RecommendationItem[] = analyses.flatMap((analysis) =>
    (analysis.recommendations || []).map((rawRecommendation) => {
      const recommendation = rawRecommendation as Partial<RecommendationItem>;
      return {
        title: recommendation.title || "Untitled Recommendation",
        description: recommendation.description || "No description available.",
        priority: recommendation.priority || "low",
        impact: recommendation.impact || "Not specified",
        sourceLabel: uploadNameMap[analysis.upload_id] || analysis.upload_id,
      };
    })
  );

  const hasContent = allInsights.length > 0 || allRecs.length > 0;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold tracking-tight">Insights Panel</h1>
        <p className="text-muted-foreground">Insights and recommendations from: {selectedSourceLabel}</p>
      </motion.div>

      <Card className="glass">
        <CardHeader className="space-y-3">
          <CardTitle className="text-base">Filter by uploaded file</CardTitle>
          <div className="flex flex-col gap-2 md:max-w-md">
            <label htmlFor="insights-upload-filter" className="text-sm text-muted-foreground">
              Data source
            </label>
            <select
              id="insights-upload-filter"
              value={selectedUploadId}
              onChange={(e) => setSelectedUploadId(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              disabled={loadingUploads}
            >
              <option value={ALL_UPLOADS_VALUE}>All files</option>
              {uploads.map((upload) => (
                <option key={upload.id} value={upload.id}>
                  {upload.original_name}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
      </Card>

      {loadingAnalyses ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : !hasContent ? (
        <Card className="glass">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Lightbulb className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No insights yet</h3>
            <p className="text-sm text-muted-foreground">
              {selectedUploadId === ALL_UPLOADS_VALUE
                ? "Upload and analyze files to generate AI insights"
                : "No insights found for the selected file"}
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
