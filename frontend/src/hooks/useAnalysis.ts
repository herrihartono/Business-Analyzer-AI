"use client";

import { useQuery } from "@tanstack/react-query";
import { getAnalysis, getDashboard, type AnalysisResult, type DashboardData } from "@/lib/api";

export function useAnalysis(id: string | null) {
  const query = useQuery<AnalysisResult, Error>({
    queryKey: ["analysis", id],
    queryFn: () => getAnalysis(id!),
    enabled: !!id,
    refetchInterval: (query) => {
      // Auto-refetch every 3s if still processing
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
