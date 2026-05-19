export function normalizePhone(value: string): string {
  const cleaned = value.replace(/[\s\-\(\)\.\+]/g, "");

  if (/^\+?\d{10,15}$/.test(cleaned)) {
    const digits = cleaned.replace(/\D/g, "");
    if (digits.length === 10) {
      return digits;
    }
    if (digits.length === 12 && digits.startsWith("91")) {
      return digits.slice(2);
    }
    if (digits.length === 11 && digits.startsWith("0")) {
      return digits.slice(1);
    }
    return digits;
  }

  if (/^\d{10}$/.test(cleaned)) {
    return cleaned;
  }

  return cleaned;
}

export function isValidPhone(value: string): boolean {
  return /^\d{10}$/.test(value);
}

export function formatPhoneForWhatsApp(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) {
    return `91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits;
  }
  return digits;
}
