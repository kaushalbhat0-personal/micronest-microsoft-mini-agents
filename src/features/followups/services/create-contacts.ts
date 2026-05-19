import type { SupabaseClient } from "@supabase/supabase-js";
import type { Contact } from "@/features/followups/types";
import type { NormalizedContactRow } from "@/features/upload/types/normalized-row";

export interface ContactInsert {
  user_id: string;
  upload_id: string;
  customer_name: string;
  phone_number: string;
  total_amount: number | null;
  paid_amount: number | null;
  due_amount: number | null;
  due_date: string | null;
  workflow_status: "active";
  raw_data: Record<string, string>;
}

export interface CreateContactInput {
  normalized: NormalizedContactRow;
  raw: Record<string, string>;
}

export async function createContacts(
  supabase: SupabaseClient,
  userId: string,
  uploadId: string,
  inputs: CreateContactInput[]
): Promise<Contact[]> {
  if (inputs.length === 0) return [];

  const rows: ContactInsert[] = inputs.map(({ normalized, raw }) => ({
    user_id: userId,
    upload_id: uploadId,
    customer_name: normalized.customerName,
    phone_number: normalized.phoneNumber,
    total_amount: normalized.totalAmount,
    paid_amount: normalized.paidAmount,
    due_amount: normalized.dueAmount,
    due_date: normalized.dueDate,
    workflow_status: "active",
    raw_data: raw,
  }));

  const chunkSize = 100;
  const allContacts: Contact[] = [];

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from("contacts")
      .insert(chunk)
      .select();

    if (error) {
      throw new Error(`Failed to insert contacts: ${error.message}`);
    }

    if (data) {
      allContacts.push(...(data as unknown as Contact[]));
    }
  }

  return allContacts;
}
