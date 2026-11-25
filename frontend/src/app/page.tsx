"use client";

import Link from "next/link";
import { ArrowUpRight, RefreshCw, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QuickStats } from "@/components/dashboard/QuickStats";
import { RecentAnalyses } from "@/components/dashboard/RecentAnalyses";
import { useDashboard } from "@/hooks/useAnalysis";
import { getDashboardPulse } from "@/lib/interface.mjs";

export default function DashboardPage() {
  const { data, loading, error, refetch } = useDashboard();
  const pulse = getDashboardPulse(data?.total_uploads ?? 0, data?.total_analyses ?? 0);

  return (
    <div className="page-shell">
      <section className="page-heading">
        <div>
          <h1>Selamat datang kembali.</h1>
          <p>Lihat kondisi bisnis Anda, lalu lanjutkan dari hal yang paling penting.</p>
        </div>
        <Link href="/upload" className="w-full sm:w-auto">
          <Button size="lg" className="w-full gap-2 rounded-xl sm:w-auto">
            <Upload className="h-4 w-4" /> Unggah data
          </Button>
        </Link>
      </section>

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : error ? (
        <section className="surface flex flex-col items-start gap-5 border-destructive/25 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">Ringkasan belum dapat dimuat</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Pastikan layanan API berjalan, lalu coba muat kembali halaman ini.
            </p>
          </div>
          <Button variant="outline" className="gap-2 rounded-xl" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" /> Coba lagi
          </Button>
        </section>
      ) : data ? (
        <>
          <section className="surface relative overflow-hidden border-0 bg-primary px-5 py-6 text-primary-foreground sm:px-7 sm:py-8">
            <Sparkles className="absolute -right-5 -top-5 h-32 w-32 opacity-[0.08]" aria-hidden="true" />
            <div className="relative max-w-2xl">
              <p className="text-xl font-semibold tracking-[-0.025em] sm:text-2xl">{pulse.title}</p>
              <p className="mt-2 text-sm leading-6 text-primary-foreground/75 sm:text-base">{pulse.description}</p>
              <Link href="/upload" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold">
                {pulse.action} <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </section>

          <QuickStats
            totalUploads={data.total_uploads}
            totalAnalyses={data.total_analyses}
            businessTypes={data.business_type_counts}
          />

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_0.75fr]">
            <Card className="surface border-0 shadow-none">
              <CardHeader>
                <CardTitle className="text-base">Analisis terbaru</CardTitle>
              </CardHeader>
              <CardContent>
                <RecentAnalyses analyses={data.recent_analyses} />
              </CardContent>
            </Card>

            <Card className="surface border-0 shadow-none">
              <CardHeader>
                <CardTitle className="text-base">Jenis bisnis</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(data.business_type_counts).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(data.business_type_counts).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between rounded-xl bg-muted/60 px-3 py-2.5">
                        <span className="text-sm">{type}</span>
                        <span className="data-number text-sm font-semibold">{count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Belum ada data bisnis yang teridentifikasi.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card className="surface border-0 shadow-none">
          <CardContent className="empty-state">
            <Upload className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Mulai dari data yang Anda punya</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Unggah data bisnis untuk mendapatkan insight dan rekomendasi.
            </p>
            <Link href="/upload" className="mt-4">
              <Button className="rounded-xl">Unggah data pertama</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
