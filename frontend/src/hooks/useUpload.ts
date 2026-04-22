"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadFiles, type UploadFile } from "@/lib/api";

export function useUpload() {
  const queryClient = useQueryClient();
  const [results, setResults] = useState<UploadFile[]>([]);

  const mutation = useMutation({
    mutationFn: (files: File[]) => uploadFiles(files),
    onSuccess: (data) => {
      setResults(data);
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  return {
    upload: async (files: File[]) => {
      try {
        return await mutation.mutateAsync(files);
      } catch (err) {
        return [];
      }
    },
    uploading: mutation.isPending,
    error: mutation.error?.message ?? null,
    results,
  };
}
