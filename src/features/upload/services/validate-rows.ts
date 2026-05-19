import type {
  NormalizedContactRow,
  ValidationResult,
} from "@/features/upload/types/normalized-row";
import { isValidPhone } from "@/shared/utils/phone";
import { isValidDate } from "@/shared/utils/date";

export function validateRow(row: NormalizedContactRow): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!row.phoneNumber) {
    errors.push("Phone number is missing");
  } else if (!isValidPhone(row.phoneNumber)) {
    errors.push(
      `Invalid phone number: "${row.phoneNumber}" — must be 10 digits`
    );
  }

  if (!row.customerName) {
    warnings.push("Customer name is missing");
  }

  if (row.totalAmount !== null && row.totalAmount < 0) {
    warnings.push("Total amount is negative");
  }

  if (row.paidAmount !== null && row.paidAmount < 0) {
    warnings.push("Paid amount is negative");
  }

  if (row.dueAmount !== null && row.dueAmount < 0) {
    warnings.push("Due amount is negative");
  }

  if (row.dueDate !== null && !isValidDate(row.dueDate)) {
    warnings.push(`Unrecognized date format: "${row.dueDate}"`);
  }

  if (
    !row.customerName &&
    !row.phoneNumber &&
    row.totalAmount === null &&
    row.paidAmount === null &&
    row.dueAmount === null &&
    !row.dueDate &&
    !row.status &&
    !row.notes
  ) {
    warnings.push("Row is empty");
  }

  return { row, errors, warnings };
}

export function validateRows(rows: NormalizedContactRow[]): ValidationResult[] {
  return rows.map(validateRow);
}

export function computeSummary(results: ValidationResult[]) {
  const totalRows = results.length;
  const validRows = results.filter((r) => r.errors.length === 0).length;
  const invalidRows = totalRows - validRows;
  const withPhone = results.filter((r) => r.row.phoneNumber.length > 0).length;
  const withTotalAmount = results.filter((r) => r.row.totalAmount !== null).length;
  const withPaidAmount = results.filter((r) => r.row.paidAmount !== null).length;
  const withDueAmount = results.filter((r) => r.row.dueAmount !== null).length;
  const withDueDate = results.filter((r) => r.row.dueDate !== null).length;

  return {
    totalRows,
    validRows,
    invalidRows,
    withPhone,
    withTotalAmount,
    withPaidAmount,
    withDueAmount,
    withDueDate,
  };
}
