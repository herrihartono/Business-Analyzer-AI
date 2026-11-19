"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileSpreadsheet, FileText, FileType2, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatFileSize } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { uploadFiles } from "@/lib/api";

const ACCEPTED_TYPES = {
  "text/csv": [".csv"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "application/vnd.ms-excel": [".xls"],
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
};

const fileIcon = (name: string) => {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return <FileText className="h-5 w-5 text-red-500" />;
  if (ext === "docx" || ext === "doc") return <FileType2 className="h-5 w-5 text-blue-500" />;
  return <FileSpreadsheet className="h-5 w-5 text-emerald-500" />;
};

interface DropZoneProps {
  onUploaded?: (ids: string[]) => void;
}

export function DropZone({ onUploaded }: DropZoneProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; size: number }[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      setErrorMessage(null);
      setUploading(true);
      setUploadProgress(20);

      try {
        setUploadProgress(50);
        const results = await uploadFiles(acceptedFiles);
        setUploadProgress(100);
        setUploadedFiles(acceptedFiles.map((f) => ({ name: f.name, size: f.size })));
        onUploaded?.(results.map((r) => r.id));
      } catch (err: unknown) {
        setUploadProgress(0);
        const error = err as { response?: { data?: { detail?: string } }; message?: string };
        const msg = error?.response?.data?.detail || error?.message || "Gagal mengunggah file. Silakan periksa format atau ukuran file.";
        setErrorMessage(msg);
      } finally {
        setTimeout(() => {
          setUploading(false);
          setUploadProgress(0);
        }, 1200);
      }
    },
    [onUploaded]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    multiple: true,
  });

  return (
    <div className="space-y-4">
      <div {...getRootProps()}>
        <motion.div
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className={cn(
            "glass relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 text-center transition-colors",
            isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
          )}
        >
          <input {...getInputProps()} />
          <motion.div
            animate={isDragActive ? { y: -5, scale: 1.1 } : { y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
          </motion.div>
          <p className="mt-4 text-lg font-medium">
            {isDragActive ? "Lepaskan file di sini..." : "Tarik & letakkan file di sini"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            atau klik untuk memilih file. Mendukung format Excel (.xlsx, .xls), CSV, PDF, dan DOCX (maks. 50MB)
          </p>
          <div className="mt-3 flex gap-2">
            <Badge variant="secondary">.xlsx</Badge>
            <Badge variant="secondary">.csv</Badge>
            <Badge variant="secondary">.pdf</Badge>
            <Badge variant="secondary">.docx</Badge>
          </div>

          {uploading && (
            <div className="mt-4 w-full max-w-xs">
              <Progress value={uploadProgress} />
              <div className="mt-1 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Mengunggah berkas...
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {errorMessage && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </motion.div>
      )}

      <AnimatePresence>
        {uploadedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-2"
          >
            {uploadedFiles.map((file, i) => (
              <div key={i} className="glass flex items-center gap-3 rounded-lg px-4 py-3">
                {fileIcon(file.name)}
                <div className="flex-1">
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                </div>
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
