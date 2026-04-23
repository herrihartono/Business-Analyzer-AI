import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "",
  headers: { "Content-Type": "application/json" },
});

export interface UploadFile {
  id: string;
  filename: string;
  original_name: string;
  file_type: string;
  file_size: number;
  status: string;
  created_at: string;
}

export interface AnalysisResult {
  id: string;
  upload_id: string;
  status: string;
  business_type: string | null;
  summary: string | null;
  insights: Record<string, unknown>[] | null;
  recommendations: Record<string, unknown>[] | null;
  kpis: Record<string, unknown>[] | null;
  charts: Record<string, unknown>[] | null;
  data_corrections: Record<string, unknown>[] | null;
  raw_data_preview: Record<string, unknown>[] | null;
  column_stats: Record<string, unknown> | null;
  created_at: string;
  completed_at: string | null;
}

export interface DashboardData {
  total_uploads: number;
  total_analyses: number;
  recent_analyses: AnalysisResult[];
  business_type_counts: Record<string, number>;
}

export async function uploadFiles(files: File[]): Promise<UploadFile[]> {
  const formData = new FormData();
  files.forEach((f) => formData.append("files", f));
  const { data } = await api.post<UploadFile[]>("/api/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function getUploads(): Promise<UploadFile[]> {
  const { data } = await api.get<UploadFile[]>("/api/uploads");
  return data;
}

export async function startAnalysis(uploadId: string): Promise<AnalysisResult> {
  const { data } = await api.post<AnalysisResult>("/api/analyze", {
    upload_id: uploadId,
  });
  return data;
}

export async function getAnalysis(id: string): Promise<AnalysisResult> {
  const { data } = await api.get<AnalysisResult>(`/api/analysis/${id}`);
  return data;
}

export async function getAnalyses(uploadId?: string): Promise<AnalysisResult[]> {
  const { data } = await api.get<AnalysisResult[]>("/api/analyses", {
    params: uploadId ? { upload_id: uploadId } : undefined,
  });
  return data;
}

export async function getDashboard(): Promise<DashboardData> {
  const { data } = await api.get<DashboardData>("/api/dashboard");
  return data;
}

export async function sendChatMessage(
  question: string,
  context?: { analysisId?: string; uploadId?: string }
): Promise<{ answer: string; sources: string[] | null }> {
  const { data } = await api.post("/api/chat", {
    analysis_id: context?.analysisId,
    upload_id: context?.uploadId,
    question,
  });
  return data;
}

export default api;
