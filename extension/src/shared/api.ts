// API layer for extension — direct Supabase client calls

import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import type {
  Contact,
  ContactEvent,
  ContactNote,
  OperationalQueueItem,
  RecoveryStatus,
  SequentialSessionInfo,
} from "./types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

let client: SupabaseClient | null = null;
let currentSession: Session | null = null;

function getClient(): SupabaseClient {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return client;
}

export function setSession(session: Session | null): void {
  currentSession = session;
}

export function getCurrentSession(): Session | null {
  return currentSession;
}

export async function signIn(email: string, password: string): Promise<{ session: Session | null; error: string | null }> {
  const { data, error } = await getClient().auth.signInWithPassword({ email, password });
  if (error) return { session: null, error: error.message };
  currentSession = data.session;
  return { session: data.session, error: null };
}

export async function signOut(): Promise<void> {
  await getClient().auth.signOut();
  currentSession = null;
}

// --- Queue ---

export async function fetchOperationalQueue(): Promise<OperationalQueueItem[]> {
  const supabase = getClient();
  const session = currentSession;
  if (!session?.user) return [];

  const { data: rawCandidates, error } = await supabase
    .from("followup_candidates")
    .select("*, contact:contact_id(*)")
    .eq("user_id", session.user.id)
    .in("candidate_status", ["pending", "opened", "contacted", "responded", "promised"])
    .order("priority", { ascending: false });

  if (error || !rawCandidates) return [];

  const candidateIds = rawCandidates.map((c: Record<string, unknown>) => c.id as string);
  const lastAttempts = new Map<string, unknown>();

  if (candidateIds.length > 0) {
    const { data: attempts } = await supabase
      .from("followup_attempts")
      .select("*")
      .in("candidate_id", candidateIds)
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (attempts) {
      for (const attempt of attempts as Array<Record<string, unknown>>) {
        if (!lastAttempts.has(attempt.candidate_id as string)) {
          lastAttempts.set(attempt.candidate_id as string, attempt);
        }
      }
    }
  }

  return rawCandidates.map((c: Record<string, unknown>) => ({
    candidate: c as unknown as OperationalQueueItem["candidate"],
    contact: (c as unknown as { contact: Contact }).contact,
    lastAttempt: lastAttempts.get(c.id as string) as OperationalQueueItem["lastAttempt"],
  }));
}

// --- Contact Detail ---

export async function fetchContactTimeline(contactId: string): Promise<ContactEvent[]> {
  const supabase = getClient();
  const session = currentSession;
  if (!session?.user) return [];

  const { data, error } = await supabase
    .from("contact_events")
    .select("*")
    .eq("contact_id", contactId)
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as unknown as ContactEvent[];
}

// --- Status Updates ---

export async function updateFollowupStatus(
  candidateId: string,
  contactId: string,
  newStatus: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getClient();
  const session = currentSession;
  if (!session?.user) return { success: false, error: "Not authenticated" };

  const { data: candidate } = await supabase
    .from("followup_candidates")
    .select("candidate_status")
    .eq("id", candidateId)
    .eq("user_id", session.user.id)
    .single();

  if (!candidate) return { success: false, error: "Candidate not found" };

  const { error: updateError } = await supabase
    .from("followup_candidates")
    .update({ candidate_status: newStatus })
    .eq("id", candidateId)
    .eq("user_id", session.user.id);

  if (updateError) return { success: false, error: updateError.message };

  if (newStatus === "resolved" || newStatus === "ignored") {
    const contactStatus = newStatus === "resolved" ? "resolved" : "ignored";
    await supabase
      .from("contacts")
      .update({ workflow_status: contactStatus, updated_at: new Date().toISOString() })
      .eq("id", contactId)
      .eq("user_id", session.user.id);
  }

  const eventType = getEventTypeForStatus(newStatus);
  if (eventType) {
    await supabase.from("contact_events").insert({
      user_id: session.user.id,
      contact_id: contactId,
      event_type: eventType,
      metadata: { new_status: newStatus, source: "extension" },
    });
  }

  return { success: true };
}

function getEventTypeForStatus(status: string): string | null {
  switch (status) {
    case "opened": return "whatsapp_opened";
    case "contacted": return "followup_contacted";
    case "responded": return "customer_responded";
    case "promised": return "payment_promised";
    case "resolved": return "marked_resolved";
    case "dismissed": return "followup_dismissed";
    case "ignored": return "marked_ignored";
    default: return null;
  }
}

// --- Notes ---

export async function addNote(contactId: string, note: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getClient();
  const session = currentSession;
  if (!session?.user) return { success: false, error: "Not authenticated" };

  const { error } = await supabase.from("contact_notes").insert({
    user_id: session.user.id,
    contact_id: contactId,
    note,
  });

  if (error) return { success: false, error: error.message };

  await supabase.from("contact_events").insert({
    user_id: session.user.id,
    contact_id: contactId,
    event_type: "note_added",
    metadata: { note, source: "extension" },
  });

  return { success: true };
}

export async function fetchNotes(contactId: string): Promise<ContactNote[]> {
  const supabase = getClient();
  const session = currentSession;
  if (!session?.user) return [];

  const { data, error } = await supabase
    .from("contact_notes")
    .select("*")
    .eq("contact_id", contactId)
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as unknown as ContactNote[];
}

// --- Session ---

export async function getRecoveryStatus(): Promise<RecoveryStatus | null> {
  try {
    const response = await chrome.runtime.sendMessage({ type: "GET_RECOVERY_STATUS" });
    return response ?? null;
  } catch {
    return null;
  }
}

export async function sendSessionAction(type: string, sessionId: string): Promise<boolean> {
  try {
    const response = await chrome.runtime.sendMessage({ type, payload: { sessionId } });
    return response?.success ?? false;
  } catch {
    return false;
  }
}

export function listenForSessionStatus(
  callback: (status: SequentialSessionInfo) => void
): () => void {
  function handler(message: { type: string; payload?: Record<string, unknown> }) {
    if (message.type === "MICRONEST_SEQUENCE_STATUS" && message.payload) {
      callback(message.payload as unknown as SequentialSessionInfo);
    }
  }
  chrome.runtime.onMessage.addListener(handler);
  return () => chrome.runtime.onMessage.removeListener(handler);
}

// --- Cache ---

const CACHE_KEYS = {
  QUEUE: "micronest_queue_cache",
  CONTACT_PREFIX: "micronest_contact_",
  TIMELINE_PREFIX: "micronest_timeline_",
  NOTES_PREFIX: "micronest_notes_",
} as const;

export async function cacheQueue(items: OperationalQueueItem[]): Promise<void> {
  await chrome.storage.local.set({ [CACHE_KEYS.QUEUE]: items });
}

export async function getCachedQueue(): Promise<OperationalQueueItem[] | null> {
  const result = await chrome.storage.local.get(CACHE_KEYS.QUEUE);
  return (result[CACHE_KEYS.QUEUE] as OperationalQueueItem[]) ?? null;
}

export async function cacheContactDetail(contactId: string, item: OperationalQueueItem): Promise<void> {
  await chrome.storage.local.set({ [`${CACHE_KEYS.CONTACT_PREFIX}${contactId}`]: item });
}

export async function getCachedContactDetail(contactId: string): Promise<OperationalQueueItem | null> {
  const result = await chrome.storage.local.get(`${CACHE_KEYS.CONTACT_PREFIX}${contactId}`);
  return (result[`${CACHE_KEYS.CONTACT_PREFIX}${contactId}`] as OperationalQueueItem) ?? null;
}

export async function cacheTimeline(contactId: string, events: ContactEvent[]): Promise<void> {
  await chrome.storage.local.set({ [`${CACHE_KEYS.TIMELINE_PREFIX}${contactId}`]: events });
}

export async function getCachedTimeline(contactId: string): Promise<ContactEvent[] | null> {
  const result = await chrome.storage.local.get(`${CACHE_KEYS.TIMELINE_PREFIX}${contactId}`);
  return (result[`${CACHE_KEYS.TIMELINE_PREFIX}${contactId}`] as ContactEvent[]) ?? null;
}

export async function cacheNotes(contactId: string, notes: ContactNote[]): Promise<void> {
  await chrome.storage.local.set({ [`${CACHE_KEYS.NOTES_PREFIX}${contactId}`]: notes });
}

export async function getCachedNotes(contactId: string): Promise<ContactNote[] | null> {
  const result = await chrome.storage.local.get(`${CACHE_KEYS.NOTES_PREFIX}${contactId}`);
  return (result[`${CACHE_KEYS.NOTES_PREFIX}${contactId}`] as ContactNote[]) ?? null;
}
