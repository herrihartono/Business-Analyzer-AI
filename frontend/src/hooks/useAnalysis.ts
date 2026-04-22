"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getAnalysis,
  getAnalyses,
  getDashboard,
  filterAnalysis,
  type AnalysisResult,
  type DashboardData,
} from "@/lib/api";

export function useAnalysis(id: string | null) {
  const query = useQuery<AnalysisResult, Error>({
    queryKey: ["analysis", id],
    queryFn: () => getAnalysis(id!),
    enabled: !!id,
    refetchInterval: (query) => {
      if (query.state.data?.status === "processing") return 3000;
      return false;
    },
  });

  return {
    analysis: query.data ?? null,
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
}

export function useAnalyses() {
  const query = useQuery<AnalysisResult[], Error>({
    queryKey: ["analyses"],
    queryFn: getAnalyses,
  });

  return {
    analyses: query.data ?? [],
    loading: query.isLoading,
  };
}

export function useFilteredAnalysis(
  analysisId: string | null,
  startDate: string | null,
  endDate: string | null
) {
  const query = useQuery<AnalysisResult, Error>({
    queryKey: ["analysis-filtered", analysisId, startDate, endDate],
    queryFn: () => filterAnalysis(analysisId!, startDate, endDate),
    enabled: !!analysisId && (!!startDate || !!endDate),
  });

  return {
    data: query.data ?? null,
    loading: query.isLoading,
  };
}

export function useDashboard() {
  const query = useQuery<DashboardData, Error>({
    queryKey: ["dashboard"],
    queryFn: getDashboard,
  });

  return {
    data: query.data ?? null,
    loading: query.isLoading,
  };
}
