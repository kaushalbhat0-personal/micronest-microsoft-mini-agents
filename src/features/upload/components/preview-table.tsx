"use client";

import { useMemo } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { cn } from "@/lib/utils";
import type { ValidationResult, PreviewResult } from "@/features/upload/types/normalized-row";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface PreviewTableProps {
  preview: PreviewResult;
}

function fmt(num: number | null): string {
  return num !== null ? `₹${num.toLocaleString("en-IN")}` : "-";
}

export function PreviewTable({ preview }: PreviewTableProps) {
  const columns = useMemo<ColumnDef<ValidationResult>[]>(
    () => [
      {
        header: "#",
        accessorFn: (r) => r.row.rowIndex + 1,
        id: "index",
        size: 48,
      },
      {
        header: "Customer Name",
        accessorFn: (r) => r.row.customerName || "-",
        id: "customerName",
      },
      {
        header: "Phone",
        accessorFn: (r) => r.row.phoneNumber || "-",
        id: "phoneNumber",
      },
      {
        header: "Total",
        accessorFn: (r) => fmt(r.row.totalAmount),
        id: "totalAmount",
      },
      {
        header: "Paid",
        accessorFn: (r) => fmt(r.row.paidAmount),
        id: "paidAmount",
      },
      {
        header: "Due",
        accessorFn: (r) => fmt(r.row.dueAmount),
        id: "dueAmount",
      },
      {
        header: "Due Date",
        accessorFn: (r) => r.row.dueDate ?? "-",
        id: "dueDate",
      },
      {
        header: "Status",
        accessorFn: (r) => r.row.status ?? "-",
        id: "status",
      },
      {
        header: "Notes",
        accessorFn: (r) => r.row.notes ?? "-",
        id: "notes",
      },
      {
        header: "Validation",
        id: "validation",
        cell: ({ row }) => {
          const errors = row.original.errors;
          const warnings = row.original.warnings;
          if (errors.length > 0) {
            return (
              <div className="flex items-center gap-1 text-destructive">
                <AlertCircle className="size-3.5 shrink-0" />
                <span className="text-xs">{errors[0]}</span>
              </div>
            );
          }
          if (warnings.length > 0) {
            return (
              <div className="flex items-center gap-1 text-muted-foreground">
                <AlertCircle className="size-3.5 shrink-0" />
                <span className="text-xs">{warnings[0]}</span>
              </div>
            );
          }
          return (
            <div className="flex items-center gap-1 text-green-600">
              <CheckCircle2 className="size-3.5 shrink-0" />
              <span className="text-xs">OK</span>
            </div>
          );
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: preview.rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader className="sticky top-0 bg-background z-10">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className="whitespace-nowrap"
                  style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center text-muted-foreground"
              >
                No rows to display
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className={cn(
                  row.original.errors.length > 0 && "bg-destructive/5"
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="whitespace-nowrap">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export function PreviewSummary({ preview }: PreviewTableProps) {
  const s = preview.summary;
  const financialCount = s.withTotalAmount + s.withPaidAmount + s.withDueAmount;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="Total Rows" value={s.totalRows} />
        <SummaryCard
          label="Valid"
          value={s.validRows}
          className="text-green-600"
        />
        <SummaryCard
          label="With Issues"
          value={s.invalidRows}
          className={s.invalidRows > 0 ? "text-destructive" : ""}
        />
        <SummaryCard label="Has Phone" value={s.withPhone} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="Rows with Financial Data" value={financialCount} />
        <SummaryCard
          label="Unmapped Columns"
          value={s.unmappedColumns}
          className={s.unmappedColumns > 0 ? "text-destructive" : ""}
        />
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-xl font-bold", className)}>{value}</p>
    </div>
  );
}
