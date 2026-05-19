import type { Contact } from "@/features/followups/types";
import { renderTemplate } from "./render-template";

export const DEFAULT_TEMPLATE =
  "Hi {{name}}, your pending amount is ₹{{due_amount}}. Please clear the payment at the earliest.";

export function buildFollowupMessage(
  contact: Contact,
  template?: string
): string {
  const tpl = template ?? DEFAULT_TEMPLATE;

  return renderTemplate(tpl, {
    name: contact.customer_name || "Customer",
    due_amount:
      contact.due_amount !== null
        ? Number(contact.due_amount).toLocaleString("en-IN")
        : "N/A",
    due_date: contact.due_date ?? "N/A",
  });
}
