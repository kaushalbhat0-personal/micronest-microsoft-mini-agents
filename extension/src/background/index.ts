// Background service worker for MicroNest WhatsApp extension
// Reliability Engine v2 — persistent storage, recovery, retry, heartbeat

import { PACING_CONFIG, RETRY_CONFIG, HEARTBEAT_INTERVAL_MS } from "../shared/heartbeat";
import { classifyFailure, FailureCategory, type SendFailure, MAX_RETRIES } from "../shared/failure-types";
import {
  persistSession,
  loadSession,
  clearSession,
  persistHeartbeat,
  pushSessionHistory,
  type PersistedSession,
} from "../shared/storage";

const WHATSAPP_URL = "https://web.whatsapp.com";

interface SessionState {
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
  timerId?: ReturnType<typeof setTimeout>;
  intervalId?: ReturnType<typeof setInterval>;
  tabId?: number;
  failedContacts: SendFailure[];
  retryCount: number;
}

const sessions = new Map<string, SessionState>();
let whatsappTabId: number | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

function formatSessionForPopup(session: SessionState) {
  const contact = session.contacts[session.currentIndex];
  return {
    id: session.id,
    state: session.state,
    currentIndex: session.currentIndex,
    totalCount: session.contacts.length,
    currentContactName: contact?.customerName ?? "",
    counters: { ...session.counters },
    delayRemainingMs: 0,
  };
}

function getRandomDelay(): number {
  return (
    Math.floor(Math.random() * (PACING_CONFIG.maxDelayMs - PACING_CONFIG.minDelayMs + 1)) +
    PACING_CONFIG.minDelayMs
  );
}

function postToWebApp(message: Record<string, unknown>): void {
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (!tab.id || !tab.url) continue;
      if (tab.url.startsWith("http://localhost:3000") || tab.url.includes("micronest.app")) {
        chrome.tabs
          .sendMessage(tab.id, { type: "MICRONEST_SEQUENCE_STATUS", payload: message })
          .catch(() => {});
      }
    }
  });
}

function broadcastStatus(session: SessionState, delayRemainingMs = 0): void {
  const contact = session.contacts[session.currentIndex];
  postToWebApp({
    sessionId: session.id,
    state: session.state,
    currentIndex: session.currentIndex,
    totalCount: session.contacts.length,
    delayRemainingMs,
    currentContactName: contact?.customerName ?? "",
    counters: { ...session.counters },
    failedCount: session.failedContacts.length,
  });
}

async function persistSessionState(session: SessionState): Promise<void> {
  const persisted: PersistedSession = {
    id: session.id,
    contacts: session.contacts,
    currentIndex: session.currentIndex,
    state: session.state,
    counters: { ...session.counters },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    failedContacts: session.failedContacts.map((f) => ({
      index: f.contactIndex ?? 0,
      category: f.category,
      message: f.message,
      retryable: f.retryable,
      candidateId: f.candidateId,
      contactId: f.contactId,
    })),
    heartbeatTimestamps: [Date.now()],
  };
  await persistSession(persisted);
}

async function persistHeartbeatState(session: SessionState): Promise<void> {
  await persistHeartbeat({
    lastHeartbeat: Date.now(),
    whatsappTabId,
    currentIndex: session.currentIndex,
    sessionId: session.id,
  });
}

function updateHeartbeat(): void {
  for (const [, session] of sessions) {
    persistHeartbeatState(session);
  }
}

async function tryRecovery(): Promise<boolean> {
  const persisted = await loadSession();
  if (!persisted) return false;

  if (persisted.state === "completed" || persisted.state === "stopped") {
    await clearSession();
    return false;
  }

  const session: SessionState = {
    id: persisted.id,
    contacts: persisted.contacts,
    currentIndex: persisted.currentIndex,
    state: "paused",
    counters: { ...persisted.counters },
    failedContacts: persisted.failedContacts.map((f) => ({
      category: f.category as FailureCategory,
      message: f.message,
      retryable: f.retryable,
      timestamp: Date.now(),
      contactIndex: f.index,
      candidateId: f.candidateId,
      contactId: f.contactId,
    })),
    retryCount: 0,
  };

  sessions.set(persisted.id, session);
  broadcastStatus(session);
  return true;
}

async function ensureWhatsAppTab(): Promise<number | null> {
  if (whatsappTabId) {
    try {
      const tab = await chrome.tabs.get(whatsappTabId);
      if (tab?.url?.startsWith(WHATSAPP_URL)) return whatsappTabId;
    } catch {
      whatsappTabId = null;
    }
  }

  const tabs = await chrome.tabs.query({ url: `${WHATSAPP_URL}/*` });
  if (tabs.length > 0 && tabs[0].id) {
    whatsappTabId = tabs[0].id;
    return whatsappTabId;
  }

  const tab = await chrome.tabs.create({ url: WHATSAPP_URL, active: true });
  if (tab.id) {
    whatsappTabId = tab.id;
    return whatsappTabId;
  }
  return null;
}

async function sendToWhatsApp(
  phoneNumber: string,
  message: string,
  onPhaseChange?: (phase: string) => void
): Promise<{ success: boolean; verified: boolean; error?: string }> {
  onPhaseChange?.("preparing");
  const tabId = await ensureWhatsAppTab();
  if (!tabId) {
    return { success: false, verified: false, error: "No WhatsApp tab available" };
  }

  const encoded = encodeURIComponent(message);
  const sendUrl = `https://web.whatsapp.com/send?phone=${phoneNumber}&text=${encoded}`;

  onPhaseChange?.("navigating");
  await chrome.tabs.update(tabId, { url: sendUrl, active: true });
  await waitForPageLoad(tabId);

  onPhaseChange?.("injecting");

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({ success: false, verified: false, error: "SEND_TIMEOUT: No response from content script" });
    }, 20000);

    function handleMessage(
      msg: { type: string; payload: { success: boolean; verified?: boolean; error?: string } }
    ) {
      if (msg.type === "INJECT_RESULT") {
        clearTimeout(timeout);
        chrome.runtime.onMessage.removeListener(handleMessage);
        onPhaseChange?.(msg.payload.verified ? "verified" : msg.payload.success ? "sent" : "failed");
        resolve({
          success: msg.payload.success,
          verified: msg.payload.verified ?? false,
          error: msg.payload.error,
        });
      }
    }

    chrome.runtime.onMessage.addListener(handleMessage);

    chrome.tabs.sendMessage(tabId, { type: "INJECT_MESSAGE", payload: { message } }).catch(() => {
      clearTimeout(timeout);
      chrome.runtime.onMessage.removeListener(handleMessage);
      resolve({ success: false, verified: false, error: "DOM_NOT_FOUND: Content script not responding" });
    });
  });
}

function waitForPageLoad(tabId: number): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      chrome.tabs.onUpdated.removeListener(listener);
      setTimeout(resolve, 2000);
    };

    function listener(id: number, info: { status?: string }) {
      if (id === tabId && info.status === "complete") done();
    }

    chrome.tabs.onUpdated.addListener(listener);

    setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    }, 20000);
  });
}

async function processNextContact(session: SessionState): Promise<void> {
  if (session.state === "stopped" || session.state === "completed") return;

  if (session.currentIndex >= session.contacts.length) {
    session.state = "completed";
    broadcastStatus(session);
    pushSessionHistory({
      id: session.id,
      contacts: session.contacts,
      currentIndex: session.currentIndex,
      state: "completed",
      counters: { ...session.counters },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      failedContacts: session.failedContacts.map((f) => ({
        index: f.contactIndex ?? 0,
        category: f.category,
        message: f.message,
        retryable: f.retryable,
        candidateId: f.candidateId,
        contactId: f.contactId,
      })),
      heartbeatTimestamps: [],
    });
    sessions.delete(session.id);
    clearSession();
    return;
  }

  const contact = session.contacts[session.currentIndex];

  if (session.state !== "paused") {
    const result = await sendToWhatsApp(contact.phoneNumber, contact.message, (phase) => {
      sendPhase = phase;
    });

    if (session.state === "stopped") return;

    if (result.success && result.verified) {
      session.counters.sent++;
      session.retryCount = 0;
    } else if (result.success && !result.verified) {
      session.counters.sent++;
    } else {
      const failure = classifyFailure(result.error ?? "UNKNOWN", contact.phoneNumber);
      failure.contactIndex = session.currentIndex;
      failure.candidateId = contact.candidateId;
      failure.contactId = contact.contactId;
      session.failedContacts.push(failure);

      if (failure.retryable && session.retryCount < MAX_RETRIES) {
        session.retryCount++;
        session.counters.retries = (session.counters.retries ?? 0) + 1;
        broadcastStatus(session);
        await persistSessionState(session);

        const retryDelay = RETRY_CONFIG.retryDelayMs;
        session.timerId = setTimeout(() => processNextContact(session), retryDelay);
        return;
      }

      session.counters.failed++;
      session.retryCount = 0;
    }
  }

  if (session.state === "stopped") return;

  session.currentIndex++;
  broadcastStatus(session);
  await persistSessionState(session);

  if (session.currentIndex >= session.contacts.length) {
    session.state = "completed";
    broadcastStatus(session);
    await persistSessionState(session);
    pushSessionHistory({
      id: session.id,
      contacts: session.contacts,
      currentIndex: session.currentIndex,
      state: "completed",
      counters: { ...session.counters },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      failedContacts: session.failedContacts.map((f) => ({
        index: f.contactIndex ?? 0,
        category: f.category,
        message: f.message,
        retryable: f.retryable,
        candidateId: f.candidateId,
        contactId: f.contactId,
      })),
      heartbeatTimestamps: [],
    });
    sessions.delete(session.id);
    clearSession();
    return;
  }

  if (session.state !== "paused") {
    let delay = getRandomDelay();

    const totalSent =
      session.counters.sent + session.counters.skipped + session.counters.failed;
    if (
      PACING_CONFIG.cooldownAfterSends > 0 &&
      totalSent > 0 &&
      totalSent % PACING_CONFIG.cooldownAfterSends === 0
    ) {
      delay += PACING_CONFIG.cooldownExtraDelayMs;
    }

    startDelayCountdown(session, delay);
    broadcastStatus(session, delay);
  }
}

function startDelayCountdown(session: SessionState, delay: number): void {
  if (session.intervalId) clearInterval(session.intervalId);

  let remaining = delay;
  session.intervalId = setInterval(() => {
    remaining -= 1000;
    if (session.state === "paused" || session.state === "stopped") {
      if (session.intervalId) clearInterval(session.intervalId);
      session.intervalId = undefined;
      return;
    }
    broadcastStatus(session, Math.max(0, remaining));
    if (remaining <= 0) {
      if (session.intervalId) clearInterval(session.intervalId);
      session.intervalId = undefined;
    }
  }, 1000);

  session.timerId = setTimeout(() => {
    processNextContact(session);
  }, delay);
}

async function startHeartbeat(): Promise<void> {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = setInterval(updateHeartbeat, HEARTBEAT_INTERVAL_MS);

  const recovered = await tryRecovery();
  if (recovered) {
    for (const [, session] of sessions) {
      broadcastStatus(session);
    }
  }
}

// --- Message Handlers ---

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {
    case "START_SEQUENCE": {
      const payload = message.payload as {
        sessionId: string;
        contacts: Array<{
          candidateId: string;
          contactId: string;
          phoneNumber: string;
          customerName: string;
          message: string;
        }>;
      };

      if (sessions.has(payload.sessionId)) {
        sendResponse({ success: false, error: "Session already exists" });
        return;
      }

      const session: SessionState = {
        id: payload.sessionId,
        contacts: payload.contacts,
        currentIndex: 0,
        state: "sending",
        counters: { sent: 0, skipped: 0, failed: 0, retries: 0 },
        failedContacts: [],
        retryCount: 0,
      };

      sessions.set(payload.sessionId, session);
      broadcastStatus(session);
      persistSessionState(session);
      persistHeartbeatState(session);
      processNextContact(session);
      sendResponse({ success: true });
      break;
    }

    case "PAUSE_SEQUENCE": {
      const session = sessions.get(message.payload.sessionId);
      if (session) {
        session.state = "paused";
        if (session.timerId) clearTimeout(session.timerId);
        if (session.intervalId) clearInterval(session.intervalId);
        session.timerId = undefined;
        session.intervalId = undefined;
        broadcastStatus(session);
        persistSessionState(session);
      }
      sendResponse({ success: !!session });
      break;
    }

    case "RESUME_SEQUENCE": {
      const session = sessions.get(message.payload.sessionId);
      if (session && session.state === "paused") {
        session.state = "sending";
        broadcastStatus(session);
        persistSessionState(session);
        processNextContact(session);
      }
      sendResponse({ success: !!session });
      break;
    }

    case "STOP_SEQUENCE": {
      const session = sessions.get(message.payload.sessionId);
      if (session) {
        session.state = "stopped";
        if (session.timerId) clearTimeout(session.timerId);
        if (session.intervalId) clearInterval(session.intervalId);
        session.timerId = undefined;
        session.intervalId = undefined;
        broadcastStatus(session);
        persistSessionState(session);
        pushSessionHistory({
          id: session.id,
          contacts: session.contacts,
          currentIndex: session.currentIndex,
          state: "stopped",
          counters: { ...session.counters },
          createdAt: Date.now(),
          updatedAt: Date.now(),
          failedContacts: session.failedContacts.map((f) => ({
            index: f.contactIndex ?? 0,
            category: f.category,
            message: f.message,
            retryable: f.retryable,
            candidateId: f.candidateId,
            contactId: f.contactId,
          })),
          heartbeatTimestamps: [],
        });
        sessions.delete(session.id);
        clearSession();
      }
      sendResponse({ success: !!session });
      break;
    }

    case "SKIP_CURRENT": {
      const session = sessions.get(message.payload.sessionId);
      if (session) {
        session.counters.skipped++;
        session.retryCount = 0;
        if (session.timerId) clearTimeout(session.timerId);
        if (session.intervalId) clearInterval(session.intervalId);
        session.timerId = undefined;
        session.intervalId = undefined;
        session.currentIndex++;
        broadcastStatus(session);
        persistSessionState(session);
        processNextContact(session);
      }
      sendResponse({ success: !!session });
      break;
    }

    case "EDIT_MESSAGE": {
      const { sessionId, index, msg } = message.payload;
      const session = sessions.get(sessionId);
      if (session && session.contacts[index]) {
        session.contacts[index].message = msg;
        persistSessionState(session);
      }
      sendResponse({ success: !!session });
      break;
    }

    case "GET_SESSION_STATUS": {
      const sessionId = message.payload?.sessionId;
      if (sessionId) {
        const session = sessions.get(sessionId);
        sendResponse({ session: session ? formatSessionForPopup(session) : null });
      } else {
        const allSessions = Array.from(sessions.values()).map(formatSessionForPopup);
        sendResponse({ sessions: allSessions });
      }
      break;
    }

    case "GET_WHATSAPP_TAB":
      sendResponse({ tab: whatsappTabId ? { tabId: whatsappTabId, isReady: true } : null });
      break;

    case "RECOVER_SESSION":
      tryRecovery().then((recovered) => {
        sendResponse({ recovered });
      });
      return true;

    case "GET_RECOVERY_STATUS": {
      const session = sessions.values().next().value;
      sendResponse({
        hasRecoveredSession: !!session,
        session: session ? formatSessionForPopup(session) : null,
        whatsappConnected: !!whatsappTabId,
      });
      break;
    }

    case "DISCARD_RECOVERED_SESSION": {
      const sessionId = message.payload?.sessionId;
      if (sessionId) {
        sessions.delete(sessionId);
        clearSession();
      } else {
        sessions.clear();
        clearSession();
      }
      sendResponse({ success: true });
      break;
    }

    case "GET_HEARTBEAT": {
      sendResponse({ timestamp: Date.now(), isStale: false });
      break;
    }

    case "OPEN_SIDE_PANEL":
      if (typeof chrome.sidePanel !== 'undefined' && chrome.sidePanel.open) {
        chrome.sidePanel.open().catch(() => {});
      }
      sendResponse({ success: true });
      break;

    default:
      sendResponse({ error: "Unknown message type" });
  }

  return true;
});

// --- Tab Lifecycle ---

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.url?.startsWith(WHATSAPP_URL) && changeInfo.status === "complete") {
    whatsappTabId = tabId;
    if (sessions.size > 0) {
      const session = sessions.values().next().value;
      if (session && session.state === "sending") {
        broadcastStatus(session);
      }
    }
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (whatsappTabId === tabId) {
    whatsappTabId = null;
  }
});

// --- Extension Lifecycle ---

chrome.runtime.onStartup.addListener(() => {
  startHeartbeat();
});

chrome.runtime.onInstalled.addListener(() => {
  startHeartbeat();
});

startHeartbeat();
