"use client";

import { useState, useEffect, useCallback } from "react";
import { getAnalysis, getDashboard, type AnalysisResult, type DashboardData } from "@/lib/api";

export function useAnalysis(id: string | null) {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getAnalysis(id);
      setAnalysis(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load analysis");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { analysis, loading, error, refetch: fetch };
}

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}
