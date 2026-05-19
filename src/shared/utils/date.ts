export function normalizeDate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  // ISO date (yyyy-mm-dd)
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const d = new Date(
      Number(isoMatch[1]),
      Number(isoMatch[2]) - 1,
      Number(isoMatch[3])
    );
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  }

  // dd/mm/yyyy or dd-mm-yyyy
  const dmyMatch = trimmed.match(
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/
  );
  if (dmyMatch) {
    const d = new Date(
      Number(dmyMatch[3]),
      Number(dmyMatch[2]) - 1,
      Number(dmyMatch[1])
    );
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  }

  // mm/dd/yyyy or mm-dd-yyyy
  const mdyMatch = trimmed.match(
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/
  );
  if (mdyMatch) {
    const d = new Date(
      Number(mdyMatch[3]),
      Number(mdyMatch[1]) - 1,
      Number(mdyMatch[2])
    );
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  }

  // Try native Date parsing as fallback
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split("T")[0];
  }

  return null;
}

export function isValidDate(value: string): boolean {
  return normalizeDate(value) !== null;
}
