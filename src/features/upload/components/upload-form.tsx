"use client";

import { useState, useRef, useCallback, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { FILE } from "@/shared/utils/constants";
import {
  Upload,
  FileText,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PreviewResult, DetectedColumn, MappedField } from "@/features/upload/types/normalized-row";
import { ImportWorkspace } from "./import-workspace";
import { buildPreviewFromMapping } from "@/features/upload/services/build-preview";
import { confirmImport } from "@/features/followups/services/confirm-import";

type UploadState =
  | { status: "idle" }
  | { status: "selecting" }
  | { status: "uploading" }
  | { status: "success"; fileName: string }
  | { status: "error"; message: string };

const ACCEPT_STRING = FILE.ACCEPTED_TYPES.join(",");

export function UploadForm() {
  const router = useRouter();
  const [state, setState] = useState<UploadState>({ status: "idle" });
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [columns, setColumns] = useState<DetectedColumn[]>([]);
  const [autoColumns, setAutoColumns] = useState<DetectedColumn[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setPreview(null);
    setParseError(null);
    setState(f ? { status: "selecting" } : { status: "idle" });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0] ?? null;
    if (f) {
      setFile(f);
      setPreview(null);
      setParseError(null);
      setState({ status: "selecting" });
    }
  }

  function clearFile() {
    setFile(null);
    setPreview(null);
    setColumns([]);
    setRawRows([]);
    setParseError(null);
    setState({ status: "idle" });
    if (inputRef.current) inputRef.current.value = "";
  }

  function resetFlow() {
    setFile(null);
    setPreview(null);
    setColumns([]);
    setAutoColumns([]);
    setRawRows([]);
    setUploadId(null);
    setImportError(null);
    setImportSuccess(false);
    setIsImporting(false);
    setParseError(null);
    setState({ status: "idle" });
    if (inputRef.current) inputRef.current.value = "";
  }

  const handleMappingChange = useCallback(
    (header: string, field: MappedField | "ignore") => {
      setColumns((prev) => {
        const updated: DetectedColumn[] = prev.map((col) => {
          if (col.header !== header) return col;
          if (field === "ignore") {
            return { ...col, mappedField: null, confidence: null };
          }
          return { ...col, mappedField: field, confidence: "high" as const };
        });

        const result = buildPreviewFromMapping(rawRows, updated);
        setPreview(result.preview);
        return updated;
      });
    },
    [rawRows]
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) return;

    setState({ status: "uploading" });

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const body = await res.json();

      if (!res.ok) {
        throw new Error(body.error ?? "Upload failed");
      }

      setState({ status: "success", fileName: file.name });

      if (body.data.upload?.id) {
        setUploadId(body.data.upload.id);
      }

      if (body.data.parsedSheet) {
        const initialColumns = body.data.preview?.columns ?? [];
        setRawRows(body.data.parsedSheet.rawRows);
        setColumns(initialColumns);
        setAutoColumns(initialColumns);
        setPreview(body.data.preview);
      }

      if (body.data.parseError && !body.data.preview) {
        setParseError(body.data.parseError.message);
      }
    } catch (err) {
      setState({
        status: "error",
        message: err instanceof Error ? err.message : "Upload failed",
      });
    }
  }

  const isUploading = state.status === "uploading";

  async function handleConfirmImport() {
    if (!uploadId) return;
    setIsImporting(true);
    setImportError(null);
    try {
      const result = await confirmImport(uploadId, columns);
      if (result.success) {
        setImportSuccess(true);
        setTimeout(() => router.push("/followups"), 800);
      } else {
        setImportError(result.error ?? "Import failed");
        setIsImporting(false);
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Import failed");
      setIsImporting(false);
    }
  }

  if (state.status === "success" && preview) {
    return (
      <ImportWorkspace
        fileName={state.fileName}
        preview={preview}
        columns={columns}
        autoColumns={autoColumns}
        onMappingChange={handleMappingChange}
        onReset={resetFlow}
        onConfirmImport={handleConfirmImport}
        isImporting={isImporting}
        importError={importError}
        importSuccess={importSuccess}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {parseError && !preview && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
          <AlertCircle className="size-4 shrink-0" />
          File uploaded but could not be parsed: {parseError}
        </div>
      )}

      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50",
          isUploading && "pointer-events-none opacity-60"
        )}
      >
        {file ? (
          <div className="flex items-center justify-center gap-3" onClick={(e) => e.stopPropagation()}>
            <FileText className="size-8 text-primary" />
            <div className="text-left">
              <p className="font-medium">{file.name}</p>
              <p className="text-sm text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            {!isUploading && (
              <button
                type="button"
                onClick={clearFile}
                className="p-1 hover:bg-muted rounded-full"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="size-8 text-muted-foreground" />
            <p className="font-medium">
              Drop your file here, or click to browse
            </p>
            <p className="text-sm text-muted-foreground">
              CSV or Excel files up to {FILE.MAX_SIZE_MB}MB
            </p>
          </div>
        )}
      </div>

      <Input
        ref={inputRef}
        type="file"
        accept={ACCEPT_STRING}
        onChange={handleFileChange}
        className="hidden"
      />

      {state.status === "error" && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
          <AlertCircle className="size-4 shrink-0" />
          {state.message}
        </div>
      )}

      <Button type="submit" disabled={!file || isUploading} className="w-full">
        {isUploading ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Uploading...
          </>
        ) : (
          "Upload & Preview"
        )}
      </Button>
    </form>
  );
}
