import * as XLSX from "xlsx";

export interface ParsedSheet {
  headers: string[];
  rawRows: Record<string, string>[];
  totalRows: number;
}

export interface ParseError {
  code: "EMPTY_SHEET" | "NO_HEADERS" | "MALFORMED" | "UNSUPPORTED";
  message: string;
}

export function parseSheet(
  buffer: ArrayBuffer | Buffer,
  _fileName: string
): { data: ParsedSheet; error: null } | { data: null; error: ParseError } {
  try {
    const workbook = XLSX.read(buffer, {
      type: "buffer",
      cellDates: false,
      raw: true,
    });

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return { data: null, error: { code: "EMPTY_SHEET", message: "Spreadsheet contains no sheets" } };
    }

    const sheet = workbook.Sheets[sheetName];
    if (!sheet || !sheet["!ref"]) {
      return { data: null, error: { code: "EMPTY_SHEET", message: "Sheet is empty" } };
    }

    const jsonData = XLSX.utils.sheet_to_json<string[]>(sheet, {
      header: 1,
      defval: "",
      blankrows: false,
    });

    if (jsonData.length === 0) {
      return { data: null, error: { code: "EMPTY_SHEET", message: "Sheet contains no data" } };
    }

    const rawHeaders = jsonData[0] as string[];
    if (!rawHeaders || rawHeaders.length === 0) {
      return { data: null, error: { code: "NO_HEADERS", message: "No headers found in first row" } };
    }

    // Normalize headers: trim lowercase, assign unique names
    const headerCounts = new Map<string, number>();
    const headers = rawHeaders.map((h) => {
      const trimmed = String(h).trim();
      const normalized = trimmed.toLowerCase() || `column_${headerCounts.size + 1}`;
      const count = headerCounts.get(normalized) ?? 0;
      headerCounts.set(normalized, count + 1);
      return count > 0 ? `${normalized}_${count}` : normalized;
    });

    const dataRows = jsonData.slice(1).filter((row) => {
      return row.some((cell) => String(cell).trim().length > 0);
    });

    const rawRows: Record<string, string>[] = dataRows.map((row) => {
      const entry: Record<string, string> = {};
      headers.forEach((header, i) => {
        entry[header] = String(row[i] ?? "").trim();
      });
      return entry;
    });

    return {
      data: {
        headers,
        rawRows,
        totalRows: rawRows.length,
      },
      error: null,
    };
  } catch {
    return {
      data: null,
      error: {
        code: "MALFORMED",
        message: "Could not parse file. Ensure it is a valid .xlsx, .xls, or .csv file.",
      },
    };
  }
}
