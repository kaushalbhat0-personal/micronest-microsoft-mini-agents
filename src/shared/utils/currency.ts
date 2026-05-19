const CURRENCY_PREFIX_RE = /^(₹|Rs\.?\s*|\$\s*|€\s*|£\s*)/i;

function removeCurrencyPrefix(value: string): string {
  return value.replace(CURRENCY_PREFIX_RE, "").trim();
}

export function normalizeAmount(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  let cleaned = removeCurrencyPrefix(trimmed);

  // Remove remaining non-numeric characters except dot, comma, minus
  cleaned = cleaned.replace(/[^\d.,\-]/g, "");

  if (!cleaned) return null;

  const lastDot = cleaned.lastIndexOf(".");
  const lastComma = cleaned.lastIndexOf(",");

  // Both dot and comma present — determine which is the decimal separator
  if (lastDot !== -1 && lastComma !== -1) {
    if (lastComma > lastDot) {
      // European: 1.234,56  → comma is decimal separator
      cleaned = cleaned.replace(/\./g, "");
      cleaned = cleaned.replace(",", ".");
    } else {
      // Standard: 1,234.56 → dot is decimal separator
      cleaned = cleaned.replace(/,/g, "");
    }
  } else if (lastComma !== -1) {
    // Only commas — check if it's a decimal comma (e.g. 1234,56)
    const parts = cleaned.split(",");
    if (parts.length === 2 && parts[1].length <= 2) {
      // Likely a decimal comma: 1234,56
      cleaned = cleaned.replace(",", ".");
    } else {
      // Thousand separators: 1,234,567
      cleaned = cleaned.replace(/,/g, "");
    }
  } else if (lastDot !== -1) {
    // Only dots — check if multiple dots (thousand separators)
    const dotCount = (cleaned.match(/\./g) ?? []).length;
    if (dotCount > 1) {
      // Multiple dots: 1.234.567,89 — thousand separators, last is decimal
      // But we don't know for sure, so check if the last group has ≤2 digits
      const afterLastDot = cleaned.slice(lastDot + 1);
      if (afterLastDot.length <= 2 && /^\d+$/.test(afterLastDot)) {
        // Last dot is decimal: 1.234.56 → 1234.56
        cleaned = cleaned.slice(0, lastDot).replace(/\./g, "") + "." + afterLastDot;
      } else {
        // All dots are thousand separators: 1.234.567
        cleaned = cleaned.replace(/\./g, "");
      }
    }
    // Single dot: keep as-is (decimal separator)
  }

  const num = parseFloat(cleaned);

  if (isNaN(num)) return null;
  if (num < 0) return null;

  return Math.round(num * 100) / 100;
}

export function isValidAmount(value: string): boolean {
  return normalizeAmount(value) !== null;
}
