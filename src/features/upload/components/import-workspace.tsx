"use client";

import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { SummaryBar } from "./summary-bar";
import { ColumnMappingTable } from "./column-mapping-table";
import { PreviewTable } from "./preview-table";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/lib/utils";
import type { PreviewResult, DetectedColumn, MappedField } from "@/features/upload/types/normalized-row";

interface ImportWorkspaceProps {
  fileName: string;
  preview: PreviewResult;
  columns: DetectedColumn[];
  autoColumns: DetectedColumn[];
  onMappingChange: (header: string, field: MappedField | "ignore") => void;
  onReset: () => void;
  onConfirmImport: () => void;
  isImporting: boolean;
  importError: string | null;
  importSuccess: boolean;
}

export function ImportWorkspace({
  fileName,
  preview,
  columns,
  autoColumns,
  onMappingChange,
  onReset,
  onConfirmImport,
  isImporting,
  importError,
  importSuccess,
}: ImportWorkspaceProps) {
  const hasValidRows = preview.summary.validRows > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{fileName}</h2>
          <p className="text-xs text-muted-foreground">
            {preview.summary.totalRows} rows detected, {preview.summary.validRows} valid
          </p>
        </div>
      </div>

      <SummaryBar
        totalRows={preview.summary.totalRows}
        columns={columns}
        mappingConfidence={preview.summary.mappingConfidence}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium">Column Mapping</p>
          </div>
          <ColumnMappingTable
            columns={columns}
            autoColumns={autoColumns}
            onMappingChange={onMappingChange}
          />
        </div>

        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium">Data Preview</p>
            <span className="text-xs text-muted-foreground">
              {preview.summary.validRows} / {preview.summary.totalRows} valid
            </span>
          </div>
          <div className="overflow-y-auto max-h-[500px]">
            <PreviewTable preview={preview} />
          </div>
        </div>
      </div>

      {importError && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
          <AlertCircle className="size-4 shrink-0" />
          {importError}
        </div>
      )}

      {importSuccess && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-300 rounded-lg p-3">
          <CheckCircle2 className="size-4 shrink-0" />
          Import successful! Redirecting to follow-ups...
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          type="button"
          onClick={onConfirmImport}
          disabled={!hasValidRows || isImporting || importSuccess}
          className={cn("flex-1", isImporting && "opacity-70")}
        >
          {isImporting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Importing {preview.summary.validRows} contacts...
            </>
          ) : (
            <>
              <CheckCircle2 className="size-4" />
              Confirm Import ({preview.summary.validRows} contacts)
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onReset}
          disabled={isImporting}
          className="sm:w-auto w-full"
        >
          Upload another file
        </Button>
      </div>
    </div>
  );
}
