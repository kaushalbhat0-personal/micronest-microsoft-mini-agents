import { formatPhoneForWhatsApp } from "@/shared/utils/phone";

export function buildWhatsAppUrl(
  phone: string,
  message: string
): string | null {
  const normalized = formatPhoneForWhatsApp(phone);
  if (!normalized || normalized.length < 12) return null;
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${normalized}?text=${encoded}`;
}
