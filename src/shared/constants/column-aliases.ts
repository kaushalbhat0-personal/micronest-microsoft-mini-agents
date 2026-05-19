import type { MappedField } from "@/features/upload/types/normalized-row";

interface ColumnAliasEntry {
  field: MappedField;
  aliases: string[];
}

export const COLUMN_ALIASES: ColumnAliasEntry[] = [
  {
    field: "customerName",
    aliases: [
      "name",
      "customer name",
      "customer",
      "client name",
      "client",
      "student name",
      "student",
      "patient name",
      "patient",
      "contact name",
      "full name",
      "candidate name",
      "member name",
      "lead name",
    ],
  },
  {
    field: "phoneNumber",
    aliases: [
      "phone",
      "phone number",
      "mobile",
      "mobile number",
      "contact",
      "contact number",
      "whatsapp",
      "whatsapp number",
      "cell",
      "cell number",
      "tel",
      "telephone",
      "mobile no",
      "phone no",
    ],
  },
  {
    field: "totalAmount",
    aliases: [
      "total amount",
      "total fees",
      "total",
      "course fee",
      "course fees",
      "program fee",
      "tuition fee",
      "fee amount",
      "invoice amount",
      "total invoice",
      "total payable",
      "original amount",
    ],
  },
  {
    field: "paidAmount",
    aliases: [
      "paid",
      "amount paid",
      "paid amount",
      "received",
      "amount received",
      "received amount",
      "payment received",
      "installment",
      "amount paid so far",
      "total paid",
    ],
  },
  {
    field: "dueAmount",
    aliases: [
      "due amount",
      "amount due",
      "pending payment",
      "pending amount",
      "balance payment",
      "balance",
      "outstanding",
      "outstanding amount",
      "remaining",
      "fees due",
      "due payment",
      "dues",
    ],
  },
  {
    field: "dueDate",
    aliases: [
      "due date",
      "date",
      "date due",
      "deadline",
      "due on",
      "payment date",
      "payment due",
      "last date",
      "expiry",
      "expiry date",
      "followup date",
      "follow-up date",
    ],
  },
  {
    field: "status",
    aliases: [
      "status",
      "payment status",
      "followup status",
      "follow-up status",
      "state",
      "current status",
      "stage",
    ],
  },
  {
    field: "notes",
    aliases: [
      "notes",
      "remarks",
      "comments",
      "note",
      "remark",
      "comment",
      "description",
      "additional notes",
      "followup notes",
    ],
  },
];

export type ConfidenceLevel = "high" | "medium" | "low" | null;

export interface AliasMatch {
  field: MappedField | null;
  matchedAlias: string | null;
  confidence: ConfidenceLevel;
}

export function findFieldByHeader(header: string): AliasMatch {
  const normalized = header.trim().toLowerCase();

  for (const entry of COLUMN_ALIASES) {
    for (const alias of entry.aliases) {
      if (normalized === alias) {
        return { field: entry.field, matchedAlias: alias, confidence: "high" };
      }
    }
  }

  // Partial match: check if the normalized header contains an alias or vice versa
  for (const entry of COLUMN_ALIASES) {
    for (const alias of entry.aliases) {
      if (normalized.includes(alias) || alias.includes(normalized)) {
        return {
          field: entry.field,
          matchedAlias: alias,
          confidence: "medium",
        };
      }
    }
  }

  return { field: null, matchedAlias: null, confidence: null };
}
