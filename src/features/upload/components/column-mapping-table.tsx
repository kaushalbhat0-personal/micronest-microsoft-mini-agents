"use client";

import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Button } from "@/shared/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DetectedColumn, MappedField } from "@/features/upload/types/normalized-row";
import { ALL_FIELDS } from "@/features/upload/types/normalized-row";

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

const CONFIDENCE_STYLES: Record<string, string> = {
  high: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  low: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

const CONFIDENCE_LABEL: Record<string, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

const IMPORTANT_FIELDS: MappedField[] = [
  "customerName",
  "phoneNumber",
  "totalAmount",
  "paidAmount",
  "dueAmount",
  "dueDate",
];

interface ColumnMappingTableProps {
  columns: DetectedColumn[];
  autoColumns: DetectedColumn[];
  onMappingChange: (header: string, field: MappedField | "ignore") => void;
}

export function ColumnMappingTable({ columns, autoColumns, onMappingChange }: ColumnMappingTableProps) {
  const [showIgnored, setShowIgnored] = useState(false);

  const autoMap = useMemo(() => {
    const map = new Map<string, DetectedColumn>();
    for (const col of autoColumns) {
      map.set(col.header, col);
    }
    return map;
  }, [autoColumns]);

  const mappedFields = useMemo(
    () => columns.filter((c) => c.mappedField).map((c) => c.mappedField as string),
    [columns]
  );

  function getDuplicateCount(field: string): number {
    return mappedFields.filter((f) => f === field).length;
  }

  function isDuplicateField(field: string): boolean {
    return getDuplicateCount(field) > 1;
  }

  const { active, ignored } = useMemo(() => {
    const active: DetectedColumn[] = [];
    const ignored: DetectedColumn[] = [];
    for (const col of columns) {
      if (col.mappedField || col.confidence) {
        active.push(col);
      } else {
        ignored.push(col);
      }
    }
    return { active, ignored };
  }, [columns]);

  const importantUnmapped = useMemo(() => {
    const mappedSet = new Set(
      columns.filter((c) => c.mappedField).map((c) => c.mappedField)
    );
    return IMPORTANT_FIELDS.filter((f) => !mappedSet.has(f));
  }, [columns]);

  function renderRow(col: DetectedColumn, compact?: boolean) {
    const auto = autoMap.get(col.header);
    const autoField = auto?.mappedField ?? null;
    const isUserChanged = col.mappedField !== autoField;
    const isDup = col.mappedField ? isDuplicateField(col.mappedField) : false;
    const isLowConf = col.confidence === "low" && !!col.mappedField;

    return (
      <TableRow
        key={col.header}
        className={cn(
          isDup && "bg-yellow-50 dark:bg-yellow-950/20",
          isLowConf && "bg-red-50 dark:bg-red-950/10",
        )}
      >
        <TableCell className={cn("py-1.5 text-xs", compact && "text-muted-foreground")}>
          <span className={cn(compact && "line-clamp-1")}>{col.header}</span>
        </TableCell>
        <TableCell className="py-1.5 text-xs">
          {autoField ? (
            <span className={cn(isUserChanged && "text-muted-foreground line-through")}>
              {FIELD_LABELS[autoField]}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>
        <TableCell className="py-1.5">
          <Select
            value={col.mappedField ?? "ignore"}
            onValueChange={(val) => onMappingChange(col.header, val as MappedField | "ignore")}
          >
            <SelectTrigger size="sm" className="text-xs h-7 min-w-[130px]">
              <SelectValue>
                {col.mappedField ? FIELD_LABELS[col.mappedField] : "Ignore"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ignore">Ignore</SelectItem>
              {ALL_FIELDS.map((field) => {
                const count = getDuplicateCount(field);
                const isSelected = col.mappedField === field;
                const total = isSelected ? count : count + 1;
                return (
                  <SelectItem key={field} value={field}>
                    {FIELD_LABELS[field]}
                    {total > 1 && (
                      <span className="text-muted-foreground ml-1">(×{total})</span>
                    )}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell className="py-1.5">
          {col.confidence ? (
            <span
              className={cn(
                "text-[10px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap",
                CONFIDENCE_STYLES[col.confidence]
              )}
            >
              {CONFIDENCE_LABEL[col.confidence]}
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground">—</span>
          )}
        </TableCell>
      </TableRow>
    );
  }

  return (
    <div className="space-y-1">
      <div className="rounded-md border overflow-y-auto max-h-[400px]">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead className="h-8 text-xs">Spreadsheet Column</TableHead>
              <TableHead className="h-8 text-xs">Auto Detection</TableHead>
              <TableHead className="h-8 text-xs">Final Mapping</TableHead>
              <TableHead className="h-8 text-xs">Confidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {active.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-16 text-center text-muted-foreground text-xs">
                  No columns detected
                </TableCell>
              </TableRow>
            ) : (
              active.map((col) => renderRow(col))
            )}
          </TableBody>
        </Table>
      </div>

      {active.length > 0 && importantUnmapped.length > 0 && (
        <div className="flex flex-wrap gap-1 px-1">
          {importantUnmapped.map((field) => (
            <span
              key={field}
              className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
            >
              {FIELD_LABELS[field]} not mapped
            </span>
          ))}
        </div>
      )}

      {ignored.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowIgnored(!showIgnored)}
          className="w-full justify-start text-xs text-muted-foreground h-7"
        >
          {showIgnored ? <ChevronDown className="size-3 mr-1" /> : <ChevronRight className="size-3 mr-1" />}
          Ignored Columns ({ignored.length})
        </Button>
      )}

      {showIgnored && ignored.length > 0 && (
        <div className="rounded-md border overflow-y-auto max-h-[200px]">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="h-7 text-[10px] text-muted-foreground">Spreadsheet Column</TableHead>
                <TableHead className="h-7 text-[10px] text-muted-foreground">Auto Detection</TableHead>
                <TableHead className="h-7 text-[10px] text-muted-foreground">Final Mapping</TableHead>
                <TableHead className="h-7 text-[10px] text-muted-foreground" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {ignored.map((col) => (
                <TableRow key={col.header} className="text-muted-foreground">
                  <TableCell className="py-1 text-xs text-muted-foreground">{col.header}</TableCell>
                  <TableCell className="py-1 text-xs text-muted-foreground">—</TableCell>
                  <TableCell className="py-1">
                    <Select
                      value="ignore"
                      onValueChange={(val) => onMappingChange(col.header, val as MappedField | "ignore")}
                    >
                      <SelectTrigger size="sm" className="text-xs h-7 min-w-[130px]">
                        <SelectValue>Ignore</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ignore">Ignore</SelectItem>
                        {ALL_FIELDS.map((field) => (
                          <SelectItem key={field} value={field}>
                            {FIELD_LABELS[field]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="py-1" />
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
