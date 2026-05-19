import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { FollowupAttempt } from "@/features/messages/types";

export async function getContactAttempts(
  contactId: string
): Promise<FollowupAttempt[]> {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("followup_attempts")
    .select("*")
    .eq("contact_id", contactId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data as unknown as FollowupAttempt[];
}

export async function getCandidateAttempts(
  candidateId: string
): Promise<FollowupAttempt[]> {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("followup_attempts")
    .select("*")
    .eq("candidate_id", candidateId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error || !data) return [];

  return data as unknown as FollowupAttempt[];
}
