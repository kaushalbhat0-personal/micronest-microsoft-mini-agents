"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { CandidateWithContact, OperationalQueueItem } from "@/features/followups/types";
import type { FollowupAttempt } from "@/features/messages/types";

export async function getOperationalQueue(): Promise<OperationalQueueItem[]> {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("followup_candidates")
    .select("*, contact:contact_id(*)")
    .eq("user_id", user.id)
    .in("candidate_status", ["pending", "opened", "contacted", "responded", "promised"])
    .order("priority", { ascending: false });

  if (error || !data) {
    return [];
  }

  const rawCandidates = data as unknown as CandidateWithContact[];
  const candidateIds = rawCandidates.map((c) => c.id);

  const lastAttempts = new Map<string, FollowupAttempt>();
  if (candidateIds.length > 0) {
    const { data: attempts } = await supabase
      .from("followup_attempts")
      .select("*")
      .in("candidate_id", candidateIds)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (attempts) {
      for (const attempt of attempts as unknown as FollowupAttempt[]) {
        if (!lastAttempts.has(attempt.candidate_id)) {
          lastAttempts.set(attempt.candidate_id, attempt);
        }
      }
    }
  }

  return rawCandidates.map((c) => ({
    candidate: c,
    contact: c.contact,
    lastAttempt: lastAttempts.get(c.id),
  }));
}
