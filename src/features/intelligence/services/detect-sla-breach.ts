import type { Contact } from "@/features/followups/types";

export function detectSlaBreach(contact: Contact): { breached: boolean; level: number } {
  if (!contact.sla_due_at) return { breached: false, level: 0 };
  const due = new Date(contact.sla_due_at).getTime();
  const now = Date.now();
  if (now > due) {
    const hoursOverdue = (now - due) / (1000 * 60 * 60);
    if (hoursOverdue > 24 * 3) return { breached: true, level: 3 };
    if (hoursOverdue > 24) return { breached: true, level: 2 };
    return { breached: true, level: 1 };
  }
  return { breached: false, level: 0 };
}
