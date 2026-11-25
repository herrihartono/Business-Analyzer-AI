"use client";

import { useState, useEffect } from "react";
import { AlertCircle, Lightbulb, RefreshCw } from "lucide-react";
import { InsightCard } from "@/components/analysis/InsightCard";
import { RecommendationList } from "@/components/analysis/RecommendationList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  const [uploadsError, setUploadsError] = useState(false);
  const [analysesError, setAnalysesError] = useState(false);
  const [requestKey, setRequestKey] = useState(0);

  useEffect(() => {
    getUploads()
      .then((data) => setUploads(data))
      .catch(() => setUploadsError(true))
      .finally(() => setLoadingUploads(false));
  }, [requestKey]);

  useEffect(() => {
    const uploadId = selectedUploadId === ALL_UPLOADS_VALUE ? undefined : selectedUploadId;

    setLoadingAnalyses(true);
    setAnalysesError(false);
    getAnalyses(uploadId)
      .then((data) => setAnalyses(data.filter((a) => a.status === "completed")))
      .catch(() => setAnalysesError(true))
      .finally(() => setLoadingAnalyses(false));
  }, [selectedUploadId, requestKey]);

  const uploadNameMap = uploads.reduce<Record<string, string>>((acc, upload) => {
    acc[upload.id] = upload.original_name;
    return acc;
  }, {});

  const selectedSourceLabel =
    selectedUploadId === ALL_UPLOADS_VALUE
      ? "Semua berkas"
      : uploadNameMap[selectedUploadId] || "Berkas terpilih";

  const allInsights: InsightItem[] = analyses.flatMap((analysis) =>
    (analysis.insights || []).map((rawInsight) => {
      const insight = rawInsight as Partial<InsightItem>;
      return {
        title: insight.title || "Insight tanpa judul",
        description: insight.description || "Deskripsi belum tersedia.",
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
        title: recommendation.title || "Rekomendasi tanpa judul",
        description: recommendation.description || "Deskripsi belum tersedia.",
        priority: recommendation.priority || "low",
        impact: recommendation.impact || "Belum ditentukan",
        sourceLabel: uploadNameMap[analysis.upload_id] || analysis.upload_id,
      };
    })
  );

  const hasContent = allInsights.length > 0 || allRecs.length > 0;

  return (
    <div className="page-shell">
      <section className="page-heading">
        <div>
          <h1>Insight yang perlu diperhatikan.</h1>
          <p>Sumber saat ini: {selectedSourceLabel}</p>
        </div>
      </section>

      <Card className="surface border-0 shadow-none">
        <CardHeader className="space-y-3">
          <CardTitle className="text-base">Pilih sumber data</CardTitle>
          <div className="flex flex-col gap-2 md:max-w-md">
            <label htmlFor="insights-upload-filter" className="text-sm text-muted-foreground">
              Berkas
            </label>
            <select
              id="insights-upload-filter"
              value={selectedUploadId}
              onChange={(e) => setSelectedUploadId(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              disabled={loadingUploads}
            >
              <option value={ALL_UPLOADS_VALUE}>Semua berkas</option>
              {uploads.map((upload) => (
                <option key={upload.id} value={upload.id}>
                  {upload.original_name}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
      </Card>

      {uploadsError || analysesError ? (
        <Card className="surface border-0 shadow-none">
          <CardContent className="empty-state">
            <AlertCircle className="h-10 w-10 text-destructive" />
            <h3 className="mt-4 text-lg font-semibold">Insight belum dapat dimuat</h3>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">Periksa layanan API, lalu coba lagi.</p>
            <Button variant="outline" className="mt-5 gap-2 rounded-xl" onClick={() => setRequestKey((key) => key + 1)}>
              <RefreshCw className="h-4 w-4" /> Coba lagi
            </Button>
          </CardContent>
        </Card>
      ) : loadingAnalyses ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : !hasContent ? (
        <Card className="surface border-0 shadow-none">
          <CardContent className="empty-state">
            <Lightbulb className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Belum ada insight</h3>
            <p className="text-sm text-muted-foreground">
              {selectedUploadId === ALL_UPLOADS_VALUE
                ? "Unggah dan analisis data untuk menghasilkan insight."
                : "Berkas ini belum memiliki insight."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="insights">
          <TabsList className="grid h-auto w-full grid-cols-2 sm:w-auto">
            <TabsTrigger value="insights">Insight ({allInsights.length})</TabsTrigger>
            <TabsTrigger value="recommendations">Rekomendasi ({allRecs.length})</TabsTrigger>
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
