"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DropZone } from "@/components/upload/DropZone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getUploads, startAnalysis, type UploadFile } from "@/lib/api";
import { formatFileSize, formatDate } from "@/lib/utils";
import { AlertCircle, FileSpreadsheet, Play, Loader2, RefreshCw } from "lucide-react";
import { normalizeApiError } from "@/lib/interface.mjs";

export default function UploadPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: uploads = [], isLoading, error, refetch } = useQuery<UploadFile[]>({
    queryKey: ["uploads"],
    queryFn: getUploads,
  });

  const analyzeMutation = useMutation({
    mutationFn: startAnalysis,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["uploads"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      router.push(`/analysis/${result.id}`);
    },
  });

  const handleUploaded = () => {
    queryClient.invalidateQueries({ queryKey: ["uploads"] });
  };

  const handleAnalyze = (uploadId: string) => {
    analyzeMutation.mutate(uploadId);
  };

  return (
    <div className="page-shell">
      <section className="page-heading">
        <div>
          <h1>Tambahkan data bisnis.</h1>
          <p>Pilih beberapa berkas sekaligus. Kami akan menyimpan data lebih dulu sebelum analisis dimulai.</p>
        </div>
      </section>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <DropZone onUploaded={handleUploaded} />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="surface border-0 shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Berkas tersimpan</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2].map((item) => <div key={item} className="h-16 animate-pulse rounded-xl bg-muted" />)}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center py-10 text-center">
                <AlertCircle className="h-8 w-8 text-destructive" />
                <p className="mt-3 font-semibold">Riwayat unggahan belum dapat dimuat</p>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  {normalizeApiError(error, "Periksa layanan API lalu coba lagi.")}
                </p>
                <Button variant="outline" className="mt-4 gap-2 rounded-xl" onClick={() => refetch()}>
                  <RefreshCw className="h-4 w-4" /> Coba lagi
                </Button>
              </div>
            ) : uploads.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Belum ada berkas. Area unggah di atas siap digunakan.
              </p>
            ) : (
              <div className="space-y-2">
                {uploads.map((file) => (
                  <div
                    key={file.id}
                    className="flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:gap-4"
                  >
                    <div className="flex min-w-0 w-full items-center gap-3 sm:flex-1">
                      <FileSpreadsheet className="h-5 w-5 shrink-0 text-primary" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium" title={file.original_name}>{file.original_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.file_size)} &middot; {formatDate(file.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
                      <Badge variant={file.status === "analyzed" ? "success" : "secondary"}>
                        {file.status === "analyzed" ? "Dianalisis" : "Tersimpan"}
                      </Badge>
                      {file.status === "uploaded" && (
                        <Button
                          size="sm"
                          onClick={() => handleAnalyze(file.id)}
                          disabled={analyzeMutation.isPending && analyzeMutation.variables === file.id}
                          className="gap-1 rounded-lg"
                        >
                          {analyzeMutation.isPending && analyzeMutation.variables === file.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Play className="h-3 w-3" />
                          )}
                          Analisis
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {analyzeMutation.isError && (
              <p className="mt-4 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {normalizeApiError(analyzeMutation.error, "Analisis belum dapat dimulai. Coba lagi.")}
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
