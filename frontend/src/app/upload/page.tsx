"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { DropZone } from "@/components/upload/DropZone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getUploads, startAnalysis, type UploadFile } from "@/lib/api";
import { formatFileSize, formatDate } from "@/lib/utils";
import { FileSpreadsheet, Play, Loader2 } from "lucide-react";

export default function UploadPage() {
  const router = useRouter();
  const [uploads, setUploads] = useState<UploadFile[]>([]);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  const loadUploads = () => {
    getUploads().then(setUploads).catch(() => {});
  };

  useEffect(() => {
    loadUploads();
  }, []);

  const handleUploaded = () => {
    loadUploads();
  };

  const handleAnalyze = async (uploadId: string) => {
    setAnalyzingId(uploadId);
    try {
      const result = await startAnalysis(uploadId);
      router.push(`/analysis/${result.id}`);
    } catch {
      setAnalyzingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold tracking-tight">Upload Center</h1>
        <p className="text-muted-foreground">Upload business data files for AI analysis</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <DropZone onUploaded={handleUploaded} />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base">Upload History</CardTitle>
          </CardHeader>
          <CardContent>
            {uploads.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No files uploaded yet
              </p>
            ) : (
              <div className="space-y-2">
                {uploads.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-4 rounded-lg border p-3"
                  >
                    <FileSpreadsheet className="h-5 w-5 shrink-0 text-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium">{file.original_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.file_size)} &middot; {formatDate(file.created_at)}
                      </p>
                    </div>
                    <Badge variant={file.status === "analyzed" ? "success" : "secondary"}>
                      {file.status}
                    </Badge>
                    {file.status === "uploaded" && (
                      <Button
                        size="sm"
                        onClick={() => handleAnalyze(file.id)}
                        disabled={analyzingId === file.id}
                        className="gap-1"
                      >
                        {analyzingId === file.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Play className="h-3 w-3" />
                        )}
                        Analyze
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
