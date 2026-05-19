// Persistent runtime session storage using chrome.storage.local

const STORAGE_KEYS = {
  ACTIVE_SESSION: "micronest_active_session",
  SESSION_HISTORY: "micronest_session_history",
  HEARTBEAT: "micronest_heartbeat",
} as const;

export interface PersistedSession {
  id: string;
  contacts: Array<{
    candidateId: string;
    contactId: string;
    phoneNumber: string;
    customerName: string;
    message: string;
  }>;
  currentIndex: number;
  state: "queued" | "sending" | "paused" | "completed" | "stopped" | "failed";
  counters: { sent: number; skipped: number; failed: number; retries: number };
  createdAt: number;
  updatedAt: number;
  failedContacts: Array<{
    index: number;
    category: string;
    message: string;
    retryable: boolean;
    candidateId?: string;
    contactId?: string;
  }>;
  heartbeatTimestamps: number[];
}

export interface HeartbeatRecord {
  lastHeartbeat: number;
  whatsappTabId: number | null;
  currentIndex: number;
  sessionId: string | null;
}

export async function persistSession(session: PersistedSession): Promise<void> {
  session.updatedAt = Date.now();
  await chrome.storage.local.set({ [STORAGE_KEYS.ACTIVE_SESSION]: session });
}

export async function loadSession(): Promise<PersistedSession | null> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.ACTIVE_SESSION);
  return (result[STORAGE_KEYS.ACTIVE_SESSION] as PersistedSession) ?? null;
}

export async function clearSession(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEYS.ACTIVE_SESSION);
}

export async function persistHeartbeat(heartbeat: HeartbeatRecord): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.HEARTBEAT]: heartbeat });
}

export async function loadHeartbeat(): Promise<HeartbeatRecord | null> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.HEARTBEAT);
  return (result[STORAGE_KEYS.HEARTBEAT] as HeartbeatRecord) ?? null;
}

export async function pushSessionHistory(session: PersistedSession): Promise<void> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.SESSION_HISTORY);
  const history = (result[STORAGE_KEYS.SESSION_HISTORY] as PersistedSession[]) ?? [];
  history.push(session);
  const trimmed = history.slice(-20);
  await chrome.storage.local.set({ [STORAGE_KEYS.SESSION_HISTORY]: trimmed });
}
