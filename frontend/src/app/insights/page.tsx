"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Lightbulb,
  Filter,
  Calendar,
  FileText,
  RotateCcw,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { InsightCard } from "@/components/analysis/InsightCard";
import { RecommendationList } from "@/components/analysis/RecommendationList";
import { DateRangeCalendarPicker } from "@/components/analysis/DateRangeCalendarPicker";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AnalysisResult } from "@/lib/api";
import api from "@/lib/api";
import { formatDate } from "@/lib/utils";

export default function InsightsPage() {
  const [analyses, setAnalyses] = useState<AnalysisResult[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  useEffect(() => {
    api
      .get<AnalysisResult[]>("/api/analyses")
      .then((res) => setAnalyses(res.data.filter((a) => a.status === "completed")))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Most recent date in datasets to orient the calendar
  const defaultMonthDate = useMemo(() => {
    if (analyses.length > 0) {
      const firstDate = analyses[0]?.created_at || analyses[0]?.upload?.created_at;
      if (firstDate) return firstDate.split("T")[0];
    }
    return undefined;
  }, [analyses]);

  // Filter analyses based on source and date range
  const filteredAnalyses = useMemo(() => {
    return analyses.filter((a) => {
      // Source filter
      if (selectedSource !== "all" && a.id !== selectedSource) {
        return false;
      }

      // Date range filter
      const itemDateStr = a.created_at || a.upload?.created_at;
      if (itemDateStr) {
        const itemDate = new Date(itemDateStr);
        if (startDate) {
          const start = new Date(startDate + "T00:00:00");
          if (itemDate < start) return false;
        }
        if (endDate) {
          const end = new Date(endDate + "T23:59:59");
          if (itemDate > end) return false;
        }
      }

      return true;
    });
  }, [analyses, selectedSource, startDate, endDate]);

  // Flatten insights with attached metadata
  const allInsights = useMemo(() => {
    return filteredAnalyses
      .flatMap((a) => {
        const sourceName = a.upload?.original_name || a.business_type || "Data Analisis";
        const sourceDate = a.created_at || a.upload?.created_at || "";
        const businessType = a.business_type;

        return ((a.insights || []) as {
          title: string;
          description: string;
          severity: string;
          category: string;
        }[]).map((insight) => ({
          ...insight,
          sourceName,
          sourceDate,
          businessType,
          analysisId: a.id,
        }));
      })
      .filter((insight) => {
        if (severityFilter === "all") return true;
        return insight.severity?.toLowerCase() === severityFilter.toLowerCase();
      });
  }, [filteredAnalyses, severityFilter]);

  // Flatten recommendations with attached metadata
  const allRecs = useMemo(() => {
    return filteredAnalyses.flatMap((a) => {
      const sourceName = a.upload?.original_name || a.business_type || "Data Analisis";
      const sourceDate = a.created_at || a.upload?.created_at || "";
      const businessType = a.business_type;

      return ((a.recommendations || []) as {
        title: string;
        description: string;
        priority: string;
        impact: string;
      }[]).map((rec) => ({
        ...rec,
        sourceName,
        sourceDate,
        businessType,
        analysisId: a.id,
      }));
    });
  }, [filteredAnalyses]);

  const hasActiveFilters =
    selectedSource !== "all" || startDate !== "" || endDate !== "" || severityFilter !== "all";

  const resetFilters = () => {
    setSelectedSource("all");
    setStartDate("");
    setEndDate("");
    setSeverityFilter("all");
  };

  const selectedAnalysis = analyses.find((a) => a.id === selectedSource);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Insights & Rekomendasi</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Wawasan bisnis dan rekomendasi AI dari dataset yang dianalisis
            </p>
          </div>
          <div className="self-start sm:self-auto flex items-center gap-2 text-xs sm:text-sm text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-lg border">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            <span>
              <strong>{analyses.length}</strong> data dianalisis
            </span>
          </div>
        </div>
      </motion.div>

      {/* Responsive Filter Toolbar with Interactive Calendar */}
      <div className="glass rounded-xl p-3 sm:p-4 border border-border/50 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 min-w-0">
            {/* 1. Filter Sumber Data */}
            <div className="relative w-full sm:w-64 lg:w-72 shrink-0">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-primary">
                <FileText className="h-4 w-4" />
              </div>
              <select
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
                className="w-full h-10 rounded-lg border border-input bg-background/80 pl-9 pr-8 text-xs sm:text-sm shadow-sm transition-colors outline-none focus:ring-2 focus:ring-ring appearance-none truncate cursor-pointer"
                title="Pilih Sumber Data"
              >
                <option value="all">Semua Sumber Data ({analyses.length})</option>
                {analyses.map((a) => {
                  const name = a.upload?.original_name || a.business_type || "Analisis";
                  const dateStr = a.created_at ? formatDate(a.created_at) : "";
                  return (
                    <option key={a.id} value={a.id}>
                      {name} {dateStr ? `(${dateStr})` : ""}
                    </option>
                  );
                })}
              </select>
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-muted-foreground">
                <ChevronDown className="h-4 w-4" />
              </div>
            </div>

            {/* 2. Interactive Calendar Date Range Picker */}
            <DateRangeCalendarPicker
              startDate={startDate}
              endDate={endDate}
              onChange={({ start, end }) => {
                setStartDate(start);
                setEndDate(end);
              }}
              defaultMonthDate={defaultMonthDate}
              className="w-full sm:w-auto"
            />
          </div>

          {/* 3. Severity Filter Pills & Reset */}
          <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap">
            <div className="flex items-center gap-1 overflow-x-auto py-0.5 scrollbar-none">
              {(["all", "critical", "warning", "info", "success"] as const).map((sev) => (
                <button
                  key={sev}
                  type="button"
                  onClick={() => setSeverityFilter(sev)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
                    severityFilter === sev
                      ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {sev === "all" ? "Semua" : sev.charAt(0).toUpperCase() + sev.slice(1)}
                </button>
              ))}
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive shrink-0"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Active Filters Summary Bar */}
        {hasActiveFilters && (
          <div className="pt-2 border-t border-border/40 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-medium text-foreground/80">Filter:</span>
              {selectedSource !== "all" && (
                <Badge variant="secondary" className="gap-1 text-[11px] py-0.5">
                  <FileText className="h-3 w-3 text-primary" />
                  <span className="max-w-[160px] truncate">
                    {selectedAnalysis?.upload?.original_name || selectedAnalysis?.business_type || "File Terpilih"}
                  </span>
                  <button
                    onClick={() => setSelectedSource("all")}
                    className="ml-1 hover:text-destructive font-bold text-xs"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {(startDate || endDate) && (
                <Badge variant="secondary" className="gap-1 text-[11px] py-0.5">
                  <Calendar className="h-3 w-3 text-primary" />
                  {startDate || "Awal"} → {endDate || "Kini"}
                  <button
                    onClick={() => {
                      setStartDate("");
                      setEndDate("");
                    }}
                    className="ml-1 hover:text-destructive font-bold text-xs"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {severityFilter !== "all" && (
                <Badge variant="secondary" className="gap-1 text-[11px] py-0.5">
                  {severityFilter}
                  <button
                    onClick={() => setSeverityFilter("all")}
                    className="ml-1 hover:text-destructive font-bold text-xs"
                  >
                    ×
                  </button>
                </Badge>
              )}
            </div>

            <span className="text-[11px]">
              Menampilkan {allInsights.length} insights • {allRecs.length} rekomendasi
            </span>
          </div>
        )}
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : analyses.length === 0 ? (
        <Card className="glass">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Lightbulb className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Belum Ada Insights</h3>
            <p className="text-sm text-muted-foreground mt-1 text-center">
              Unggah dan analisis file bisnis Anda untuk menghasilkan wawasan AI.
            </p>
          </CardContent>
        </Card>
      ) : allInsights.length === 0 && allRecs.length === 0 ? (
        <Card className="glass">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Filter className="mb-4 h-12 w-12 text-muted-foreground opacity-60" />
            <h3 className="text-lg font-semibold">Tidak Ada Hasil yang Cocok</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md text-center">
              Tidak ditemukan insights atau rekomendasi untuk filter sumber data atau rentang tanggal yang dipilih.
            </p>
            <Button variant="outline" size="sm" onClick={resetFilters} className="mt-4">
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Reset Semua Filter
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="insights">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <TabsList>
              <TabsTrigger value="insights">Insights ({allInsights.length})</TabsTrigger>
              <TabsTrigger value="recommendations">Recommendations ({allRecs.length})</TabsTrigger>
            </TabsList>
            <p className="text-xs text-muted-foreground">
              Dari <strong>{filteredAnalyses.length}</strong> sumber data
            </p>
          </div>

          <TabsContent value="insights" className="mt-4">
            {allInsights.length === 0 ? (
              <Card className="glass">
                <CardContent className="py-10 text-center text-muted-foreground text-sm">
                  Tidak ada insights untuk kriteria filter ini.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {allInsights.map((insight, i) => (
                  <InsightCard
                    key={`${insight.analysisId || i}-${i}`}
                    {...insight}
                    index={i}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="recommendations" className="mt-4">
            {allRecs.length === 0 ? (
              <Card className="glass">
                <CardContent className="py-10 text-center text-muted-foreground text-sm">
                  Tidak ada rekomendasi untuk kriteria filter ini.
                </CardContent>
              </Card>
            ) : (
              <RecommendationList recommendations={allRecs} />
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
