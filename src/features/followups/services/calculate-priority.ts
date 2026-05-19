import type { Contact, CandidatePriority } from "@/features/followups/types";

export interface PriorityResult {
  priority: CandidatePriority | null;
  reason: string;
}

export function calculatePriority(contact: Contact): PriorityResult {
  if (!contact.phone_number) {
    return { priority: null, reason: "" };
  }

  if (
    contact.total_amount !== null &&
    contact.paid_amount !== null &&
    contact.paid_amount >= contact.total_amount
  ) {
    return { priority: null, reason: "" };
  }

  if (contact.due_amount === null || contact.due_amount <= 0) {
    return { priority: null, reason: "" };
  }

  if (contact.due_amount > 10000) {
    return {
      priority: "high",
      reason: `High amount due: ₹${Number(contact.due_amount).toLocaleString("en-IN")}`,
    };
  }

  if (contact.due_date) {
    const dueDate = new Date(contact.due_date);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    if (dueDate < thirtyDaysAgo) {
      return {
        priority: "high",
        reason: `Overdue by more than 30 days (due: ${contact.due_date})`,
      };
    }
  }

  return {
    priority: "medium",
    reason: `Outstanding balance: ₹${Number(contact.due_amount).toLocaleString("en-IN")}`,
  };
}
