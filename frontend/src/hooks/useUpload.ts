"use client";

import { useState, useCallback } from "react";
import { uploadFiles, type UploadFile } from "@/lib/api";

export function useUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<UploadFile[]>([]);

  const upload = useCallback(async (files: File[]) => {
    setUploading(true);
    setError(null);
    try {
      const data = await uploadFiles(files);
      setResults(data);
      return data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setError(message);
      return [];
    } finally {
      setUploading(false);
    }
  }, []);

  return { upload, uploading, error, results };
}
