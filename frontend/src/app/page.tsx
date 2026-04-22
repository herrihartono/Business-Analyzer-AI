"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Upload, CalendarRange, FileBarChart, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QuickStats } from "@/components/dashboard/QuickStats";
import { RecentAnalyses } from "@/components/dashboard/RecentAnalyses";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { ChartContainer } from "@/components/charts/ChartContainer";
import { useDashboard, useAnalyses, useAnalysis, useFilteredAnalysis } from "@/hooks/useAnalysis";

export default function DashboardPage() {
  const { data: dashboardData, loading: dashLoading } = useDashboard();
  const { analyses, loading: analysesLoading } = useAnalyses();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const completedAnalyses = useMemo(
    () => analyses.filter((a) => a.status === "completed"),
    [analyses]
  );

  const { analysis, loading: analysisLoading } = useAnalysis(selectedId);
  const { data: filteredData, loading: filterLoading } = useFilteredAnalysis(
    selectedId,
    startDate || null,
    endDate || null
  );

  const activeData = filteredData ?? analysis;
  const isFileView = selectedId !== null;
  const loading = dashLoading || analysesLoading;

  const hasDateColumns = useMemo(() => {
    if (!activeData?.charts) return false;
    return activeData.charts.some(
      (c: Record<string, unknown>) => c.type === "line" && c.xKey === "date"
    );
  }, [activeData]);

  const kpis = (activeData?.kpis as { name: string; value: number; type: string; icon: string }[]) ?? [];
  const charts = (activeData?.charts ?? []) as { type: string; title: string; data: Record<string, unknown>[]; xKey?: string; dataKeys?: string[]; dataKey?: string; nameKey?: string }[];

  function handleFileSelect(id: string) {
    setSelectedId(id);
    setStartDate("");
    setEndDate("");
  }

  function clearFileSelection() {
    setSelectedId(null);
    setStartDate("");
    setEndDate("");
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">AI-powered business intelligence at a glance</p>
        </div>
        <Link href="/upload">
          <Button size="lg" className="gap-2">
            <Upload className="h-4 w-4" /> Upload Files
          </Button>
        </Link>
      </motion.div>

      {/* Filter Bar */}
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass flex flex-wrap items-center gap-4 rounded-xl p-4"
      >
        <div className="flex items-center gap-2">
          <FileBarChart className="h-4 w-4 text-muted-foreground" />
          <select
            value={selectedId ?? ""}
            onChange={(e) =>
              e.target.value ? handleFileSelect(e.target.value) : clearFileSelection()
            }
            className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring min-w-[200px]"
          >
            <option value="">Global Overview</option>
            {completedAnalyses.map((a) => (
              <option key={a.id} value={a.id}>
                {a.business_type || a.id.slice(0, 8)}
              </option>
            ))}
          </select>
          {isFileView && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={clearFileSelection}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {isFileView && (
          <div className="flex items-center gap-2">
            <CalendarRange className="h-4 w-4 text-muted-foreground" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={!hasDateColumns}
              className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Start date"
            />
            <span className="text-sm text-muted-foreground">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={!hasDateColumns}
              className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="End date"
            />
            {(startDate || endDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                }}
              >
                Clear dates
              </Button>
            )}
            {!hasDateColumns && (
              <span className="text-xs text-muted-foreground italic">
                No date columns detected
              </span>
            )}
          </div>
        )}

        {(analysisLoading || filterLoading) && (
          <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Loading...
          </div>
        )}
      </motion.div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : isFileView ? (
        /* File-specific view */
        activeData ? (
          <div className="space-y-6">
            {activeData.summary && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Card className="glass">
                  <CardContent className="py-4">
                    <p className="text-sm text-muted-foreground">{activeData.summary}</p>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {kpis.length > 0 && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {kpis.map((kpi, i) => (
                  <KpiCard
                    key={kpi.name}
                    name={kpi.name}
                    value={kpi.value}
                    type={kpi.type}
                    icon={kpi.icon}
                    index={i}
                  />
                ))}
              </div>
            )}

            {charts.length > 0 && <ChartContainer charts={charts} />}

            {kpis.length === 0 && charts.length === 0 && (
              <Card className="glass">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <FileBarChart className="mb-4 h-12 w-12 text-muted-foreground" />
                  <h3 className="text-lg font-semibold">No data available</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    This analysis doesn&apos;t have any KPIs or charts to display.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        )
      ) : dashboardData ? (
        /* Global view */
        <>
          <QuickStats
            totalUploads={dashboardData.total_uploads}
            totalAnalyses={dashboardData.total_analyses}
            businessTypes={dashboardData.business_type_counts}
          />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-base">Recent Analyses</CardTitle>
              </CardHeader>
              <CardContent>
                <RecentAnalyses analyses={dashboardData.recent_analyses} />
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-base">Business Types</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(dashboardData.business_type_counts).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(dashboardData.business_type_counts).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <span className="text-sm">{type}</span>
                        <span className="text-sm font-bold">{count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No data yet. Upload files to begin analyzing.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card className="glass">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Upload className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Welcome to SmartBiz Analyzer</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload your business data files to get AI-powered insights
            </p>
            <Link href="/upload" className="mt-4">
              <Button>Get Started</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
