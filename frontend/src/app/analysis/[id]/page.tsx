"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2, Sparkles, AlertTriangle, ArrowLeft, RefreshCw, CheckCircle2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { ChartContainer } from "@/components/charts/ChartContainer";
import { InsightCard } from "@/components/analysis/InsightCard";
import { RecommendationList } from "@/components/analysis/RecommendationList";
import { AnomalyAlert } from "@/components/analysis/AnomalyAlert";
import { useAnalysis } from "@/hooks/useAnalysis";
import { formatTableValue } from "@/lib/utils";

export default function AnalysisDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : null;
  const { analysis, loading, error, refetch } = useAnalysis(id);

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Memuat data analisis...</p>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="flex h-96 flex-col items-center justify-center text-center">
        <AlertTriangle className="mb-3 h-10 w-10 text-amber-500" />
        <p className="text-lg font-semibold">Analisis tidak ditemukan</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-md">
          {error || "ID analisis yang Anda cari tidak tersedia atau belum dibuat."}
        </p>
        <Link href="/upload" className="mt-4">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Kembali ke Upload Center
          </Button>
        </Link>
      </div>
    );
  }

  // ── Processing State (Waiting for Background Task) ──────────────────────
  if (analysis.status === "processing" || analysis.status === "pending") {
    return (
      <div className="mx-auto max-w-2xl py-12 space-y-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="glass border-primary/20 p-6 text-center shadow-lg">
            <CardContent className="space-y-6 pt-6">
              <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-10 w-10 text-primary animate-pulse" />
                <div className="absolute inset-0 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
              </div>

              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-2">
                  <Loader2 className="h-3 w-3 animate-spin" /> Sedang Menganalisis
                </div>
                <h2 className="text-2xl font-bold tracking-tight">Memproses Data Bisnis Anda</h2>
                <p className="mt-2 text-sm text-muted-foreground max-w-lg mx-auto">
                  Sistem sedang menjalankan parsing dokumen, normalisasi data, kalkulasi KPI otomatis,
                  serta penalaran strategi bisnis mendalam menggunakan model AI.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-left pt-2">
                <div className="flex items-center gap-3 rounded-lg border bg-background/50 p-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                  <div className="text-xs">
                    <p className="font-semibold">Membaca Berkas</p>
                    <p className="text-muted-foreground">Struktur data tervalidasi</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border bg-background/50 p-3">
                  <Loader2 className="h-5 w-5 text-primary animate-spin shrink-0" />
                  <div className="text-xs">
                    <p className="font-semibold">Kalkulasi Polars</p>
                    <p className="text-muted-foreground">Menghitung metrik & tren</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border bg-background/50 p-3">
                  <Sparkles className="h-5 w-5 text-amber-500 shrink-0" />
                  <div className="text-xs">
                    <p className="font-semibold">AI Insights</p>
                    <p className="text-muted-foreground">Merumuskan rekomendasi</p>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => refetch()} className="gap-2 text-xs">
                  <RefreshCw className="h-3 w-3" /> Cek Status Sekarang
                </Button>
                <Link href="/upload">
                  <Button variant="outline" size="sm" className="gap-2 text-xs">
                    <ArrowLeft className="h-3 w-3" /> Kembali ke Upload
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // ── Failed State ────────────────────────────────────────────────────────
  if (analysis.status === "failed") {
    return (
      <div className="mx-auto max-w-lg py-16 text-center space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Analisis Gagal</h2>
        <p className="text-sm text-muted-foreground">
          {analysis.summary || "Terjadi kesalahan saat memproses data. Pastikan format file sesuai dan tidak rusak."}
        </p>
        <div className="pt-4 flex justify-center gap-3">
          <Link href="/upload">
            <Button variant="default" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Unggah File Baru
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // ── Completed State ─────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{analysis.business_type || "Analisis Bisnis"}</h1>
            <Badge variant="success">Selesai</Badge>
          </div>
          <Link href="/upload">
            <Button variant="outline" size="sm" className="gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" /> Upload File Lain
            </Button>
          </Link>
        </div>
        {analysis.summary && (
          <p className="mt-2 text-muted-foreground leading-relaxed max-w-4xl">{analysis.summary}</p>
        )}
      </motion.div>

      {analysis.kpis && analysis.kpis.length > 0 && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {(analysis.kpis as { name: string; value: number; type: string; icon: string; description?: string }[]).map((kpi, i) => (
            <KpiCard key={i} {...kpi} index={i} />
          ))}
        </div>
      )}

      <Tabs defaultValue="charts" className="w-full">
        <TabsList>
          <TabsTrigger value="charts">Grafik & Visualisasi</TabsTrigger>
          <TabsTrigger value="insights">Insight Bisnis</TabsTrigger>
          <TabsTrigger value="recommendations">Rekomendasi</TabsTrigger>
          <TabsTrigger value="data">Preview Data</TabsTrigger>
          <TabsTrigger value="corrections">Kualitas Data</TabsTrigger>
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
                  {(analysis.raw_data_preview as Record<string, unknown>[]).slice(0, 50).map((row, i) => (
                    <tr key={i} className="border-b transition-colors hover:bg-muted/30">
                      {Object.entries(row).map(([col, val], j) => (
                        <td key={j} className="px-4 py-2">
                          {formatTableValue(val, col)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">Tidak ada pratinjau data.</p>
          )}
        </TabsContent>

        <TabsContent value="corrections">
          <AnomalyAlert corrections={(analysis.data_corrections || []) as { column: string; action: string; affected_rows: number }[]} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
