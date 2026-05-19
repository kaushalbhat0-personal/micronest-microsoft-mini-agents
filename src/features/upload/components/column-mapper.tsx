"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DetectedColumn } from "@/features/upload/types/normalized-row";
import { ALL_FIELDS, type MappedField } from "@/features/upload/types/normalized-row";

const FIELD_LABELS: Record<MappedField, string> = {
  customerName: "Customer Name",
  phoneNumber: "Phone Number",
  totalAmount: "Total Amount",
  paidAmount: "Paid Amount",
  dueAmount: "Due Amount",
  dueDate: "Due Date",
  status: "Status",
  notes: "Notes",
};

const CONFIDENCE_LABEL: Record<string, { label: string; className: string }> = {
  high: { label: "High", className: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
  medium: { label: "Medium", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300" },
  low: { label: "Low", className: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
};

interface ColumnMapperProps {
  columns: DetectedColumn[];
  onMappingChange: (header: string, field: MappedField | "ignore") => void;
}

export function ColumnMapper({ columns, onMappingChange }: ColumnMapperProps) {
  const mappedFields = columns
    .filter((c) => c.mappedField)
    .map((c) => c.mappedField);

  function getDuplicateFor(field: string): string | null {
    const count = mappedFields.filter((f) => f === field).length;
    if (count > 1) return ` (×${count})`;
    return null;
  }

  return (
    <div className="space-y-2">
      {columns.map((col) => (
        <div
          key={col.header}
          className="flex items-center gap-3 rounded-lg border bg-card p-3"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{col.header}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-muted-foreground">Auto:</span>
              {col.mappedField ? (
                <Badge variant="outline" className="text-xs">
                  {FIELD_LABELS[col.mappedField]}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  Unmapped
                </Badge>
              )}
              {col.confidence && (
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded font-medium",
                    CONFIDENCE_LABEL[col.confidence]?.className
                  )}
                >
                  {CONFIDENCE_LABEL[col.confidence]?.label}
                </span>
              )}
            </div>
          </div>

          <Select
            value={col.mappedField ?? "ignore"}
            onValueChange={(val) =>
              onMappingChange(col.header, val as MappedField | "ignore")
            }
          >
            <SelectTrigger className="w-44">
              <SelectValue>
                {col.mappedField
                  ? FIELD_LABELS[col.mappedField]
                  : "Ignore"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ignore">Ignore</SelectItem>
              {ALL_FIELDS.map((field) => {
                const dup = getDuplicateFor(field);
                return (
                  <SelectItem key={field} value={field}>
                    {FIELD_LABELS[field]}
                    {dup && (
                      <span className="text-muted-foreground ml-1">{dup}</span>
                    )}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  );
}
