// WhatsApp contextual overlay — shows contact info + quick actions
// Runs on web.whatsapp.com, injects non-intrusive floating panel

import { SELECTORS, querySelectorWithFallback } from "../shared/selectors";

const AUTH_KEY = "micronest_auth_session";
const API_BASE = "http://localhost:3000";

interface OverlayContact {
  id: string;
  customer_name: string;
  phone_number: string;
  due_amount: number | null;
  due_date: string | null;
  workflow_status: string;
}

interface OverlayCandidate {
  id: string;
  contact_id: string;
  priority: string;
  candidate_status: string;
}

interface OverlayData {
  contact: OverlayContact | null;
  candidate: OverlayCandidate | null;
}

let overlayEl: HTMLDivElement | null = null;
let shadowRoot: ShadowRoot | null = null;
let currentData: OverlayData | null = null;
let currentPhone = "";
let isMinimized = false;

function getAuthToken(): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(AUTH_KEY, (result) => {
      try {
        const data = JSON.parse(result[AUTH_KEY] ?? "null");
        resolve(data?.access_token ?? null);
      } catch {
        resolve(null);
      }
    });
  });
}

async function apiGet<T>(path: string): Promise<T | null> {
  const token = await getAuthToken();
  if (!token) return null;
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

async function apiPost(path: string, body: Record<string, unknown>): Promise<boolean> {
  const token = await getAuthToken();
  if (!token) return false;
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function extractPhoneNumber(): Promise<string | null> {
  const url = window.location.href;
  const sendMatch = url.match(/[?&]phone=(\d+)/);
  if (sendMatch) return sendMatch[1];

  const chatMatch = url.match(/\/c\/([^/?]+)/);
  if (chatMatch) return chatMatch[1];

  const header = querySelectorWithFallback(SELECTORS.chatHeader);
  if (header) {
    const text = header.textContent ?? "";
    const phoneMatch = text.match(/[\+]?[\d\s\-\(\)]{7,15}/);
    if (phoneMatch) return phoneMatch[0].replace(/\D/g, "");
  }

  const title = document.querySelector("title");
  if (title) {
    const phoneMatch = title.textContent?.match(/[\+]?[\d\s\-\(\)]{7,15}/);
    if (phoneMatch) return phoneMatch[0].replace(/\D/g, "");
  }

  return null;
}

async function lookupContact(phone: string): Promise<OverlayData | null> {
  const result = await apiGet<{ contact: OverlayContact | null; candidate: OverlayCandidate | null }>(
    `/api/contacts/lookup?phone=${encodeURIComponent(phone)}`
  );
  return result ?? null;
}

async function handleAction(action: string) {
  if (!currentData?.candidate || !currentData?.contact) return;

  if (action === "whatsapp") {
    const phone = currentData.contact.phone_number.replace(/\D/g, "");
    window.open(`https://wa.me/${phone}`, "_blank");
    return;
  }

  if (action === "note") {
    const note = prompt("Add a note:");
    if (note && note.trim()) {
      await apiPost(`/api/notes/${currentData.contact.id}`, { note: note.trim() });
      showToast("Note added");
    }
    return;
  }

  if (action === "open-panel") {
    chrome.runtime.sendMessage({ type: "OPEN_SIDE_PANEL" });
    return;
  }

  const validStatuses = ["responded", "promised", "resolved", "dismissed", "contacted"];
  if (validStatuses.includes(action)) {
    const ok = await apiPost("/api/status", {
      candidateId: currentData.candidate.id,
      contactId: currentData.contact.id,
      status: action,
    });
    if (ok) {
      showToast(`Marked as ${action}`);
      renderOverlay(currentData);
    } else {
      showToast("Failed to update");
    }
  }
}

// --- UI ---

function createOverlayContainer(): ShadowRoot {
  if (overlayEl) overlayEl.remove();

  overlayEl = document.createElement("div");
  overlayEl.id = "micronest-overlay";
  overlayEl.style.cssText = `
    all: initial;
    position: fixed;
    bottom: 80px;
    right: 20px;
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 13px;
    line-height: 1.4;
    color: #111827;
    cursor: move;
  `;

  document.body.appendChild(overlayEl);

  const shadow = overlayEl.attachShadow({ mode: "closed" });
  shadowRoot = shadow;

  const styles = document.createElement("style");
  styles.textContent = getOverlayCSS();
  shadow.appendChild(styles);

  const container = document.createElement("div");
  container.id = "container";
  shadow.appendChild(container);

  // Drag handling
  let isDragging = false;
  let startX = 0, startY = 0, origX = 0, origY = 0;

  overlayEl.addEventListener("mousedown", (e) => {
    const target = e.target as HTMLElement;
    if (target.closest("button, textarea, input")) return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    origX = overlayEl!.offsetLeft;
    origY = overlayEl!.offsetTop;
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    overlayEl!.style.left = `${Math.max(0, origX + dx)}px`;
    overlayEl!.style.top = `${Math.max(0, origY + dy)}px`;
    overlayEl!.style.right = "auto";
    overlayEl!.style.bottom = "auto";
  });

  document.addEventListener("mouseup", () => {
    isDragging = false;
  });

  return shadow;
}

function renderOverlay(data: OverlayData) {
  currentData = data;
  if (!shadowRoot) return;

  const container = shadowRoot.getElementById("container");
  if (!container) return;

  if (isMinimized) {
    container.innerHTML = `
      <div class="minimized">
        <span>${data.contact?.customer_name ?? "Contact"}</span>
        <button class="btn-icon" id="expandBtn">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><polyline points="10 4 10 16 4 10"/><polyline points="10 16 10 4 16 10"/></svg>
        </button>
      </div>
    `;
    container.querySelector("#expandBtn")?.addEventListener("click", () => {
      isMinimized = false;
      renderOverlay(data);
    });
    return;
  }

  const contact = data.contact;
  const candidate = data.candidate;

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: "#6b7280", contacted: "#2563eb", responded: "#7c3aed",
      promised: "#ca8a04", resolved: "#16a34a",
    };
    return `<span class="badge" style="background:${colors[status] ?? '#6b7280'}20;color:${colors[status] ?? '#6b7280'};border:1px solid ${colors[status] ?? '#6b7280'}30">${status}</span>`;
  };

  container.innerHTML = `
    <div class="panel">
      <div class="header">
        <div class="header-info">
          <div class="name">${contact?.customer_name ?? "Unknown"} ${candidate ? statusBadge(candidate.candidate_status) : ""}</div>
          <div class="phone">${contact?.phone_number ?? ""}</div>
        </div>
        <div class="header-actions">
          <button class="btn-icon" id="minimizeBtn">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="10" x2="16" y2="10"/></svg>
          </button>
          <button class="btn-icon" id="closeBtn">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="4" x2="16" y2="16"/><line x1="16" y1="4" x2="4" y2="16"/></svg>
          </button>
        </div>
      </div>
      ${contact ? `
      <div class="amount-row">
        ${contact.due_amount != null ? `<span class="amount">₹${Number(contact.due_amount).toLocaleString("en-IN")}</span>` : ""}
        ${contact.due_date ? `<span class="due-date">Due: ${new Date(contact.due_date).toLocaleDateString("en-IN")}</span>` : ""}
      </div>` : ""}
      ${!contact ? '<div class="no-contact">No matching contact found</div>' : ""}
      <div class="actions">
        <button class="btn btn-sm btn-primary" data-action="whatsapp">WhatsApp</button>
        <button class="btn btn-sm" data-action="responded">Responded</button>
        <button class="btn btn-sm" data-action="promised">Promised</button>
        <button class="btn btn-sm btn-success-outline" data-action="resolved">Resolved</button>
      </div>
      <div class="actions secondary">
        <button class="btn btn-sm btn-ghost" data-action="note">+ Note</button>
        <button class="btn btn-sm btn-ghost" data-action="dismissed">Dismiss</button>
        <button class="btn btn-sm btn-ghost" data-action="open-panel">Open Panel</button>
      </div>
    </div>
  `;

  container.querySelector("#minimizeBtn")?.addEventListener("click", () => {
    isMinimized = true;
    renderOverlay(data);
  });
  container.querySelector("#closeBtn")?.addEventListener("click", () => {
    destroyOverlay();
  });
  container.querySelectorAll("[data-action]").forEach((el) => {
    el.addEventListener("click", () => {
      const action = (el as HTMLElement).dataset.action!;
      handleAction(action);
    });
  });
}

function destroyOverlay() {
  if (overlayEl) {
    overlayEl.remove();
    overlayEl = null;
    shadowRoot = null;
  }
  currentData = null;
  currentPhone = "";
}

function showToast(msg: string) {
  if (!shadowRoot) return;
  const toast = document.createElement("div");
  toast.textContent = msg;
  toast.style.cssText = `
    position: absolute; bottom: -30px; left: 50%; transform: translateX(-50%);
    background: #111827; color: white; padding: 4px 12px; border-radius: 4px;
    font-size: 12px; opacity: 0; transition: opacity 0.2s;
  `;
  shadowRoot.appendChild(toast);
  requestAnimationFrame(() => { toast.style.opacity = "1"; });
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 200);
  }, 2000);
}

let checkInterval: ReturnType<typeof setInterval> | null = null;

async function checkChat() {
  const header = querySelectorWithFallback(SELECTORS.chatHeader);
  const app = querySelectorWithFallback(SELECTORS.appRoot);

  if (!header || !app) {
    destroyOverlay();
    return;
  }

  const phone = await extractPhoneNumber();
  if (!phone || phone === currentPhone) return;

  currentPhone = phone;
  const data = await lookupContact(phone);

  if (data?.contact || data?.candidate) {
    createOverlayContainer();
    renderOverlay(data);
  } else {
    destroyOverlay();
  }
}

function initOverlay() {
  const app = querySelectorWithFallback(SELECTORS.appRoot);
  if (!app || app.children.length === 0) {
    setTimeout(initOverlay, 1000);
    return;
  }

  checkChat();
  checkInterval = setInterval(checkChat, 3000);
}

initOverlay();

// Listen for tab URL changes (SPA navigation within WhatsApp)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    setTimeout(() => {
      checkChat();
    }, 1500);
  }
}).observe(document, { subtree: true, childList: true });

// Clean up on page unload
window.addEventListener("beforeunload", () => {
  if (checkInterval) clearInterval(checkInterval);
  destroyOverlay();
});

function getOverlayCSS(): string {
  return `
    .panel {
      width: 280px; background: white; border-radius: 10px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.15), 0 1px 4px rgba(0,0,0,0.08);
      overflow: hidden; border: 1px solid rgba(0,0,0,0.06);
    }
    .header {
      display: flex; align-items: flex-start; justify-content: space-between;
      padding: 10px 12px 6px; gap: 8px;
    }
    .header-info { flex: 1; min-width: 0; }
    .name { font-weight: 600; font-size: 14px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .phone { font-size: 12px; color: #6b7280; margin-top: 1px; }
    .header-actions { display: flex; gap: 2px; flex-shrink: 0; }
    .badge { display: inline-block; padding: 1px 6px; border-radius: 8px; font-size: 10px; font-weight: 500; }
    .amount-row {
      display: flex; align-items: center; gap: 12px;
      padding: 4px 12px 8px; font-size: 13px;
    }
    .amount { font-weight: 600; font-family: "SF Mono", monospace; color: #dc2626; }
    .due-date { font-size: 11px; color: #6b7280; }
    .no-contact { padding: 8px 12px; font-size: 12px; color: #9ca3af; text-align: center; }
    .actions {
      display: flex; gap: 4px; padding: 4px 10px 6px; flex-wrap: wrap;
    }
    .actions.secondary { padding-top: 0; padding-bottom: 8px; }
    .btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 4px;
      padding: 5px 10px; border: 1px solid #e5e7eb; border-radius: 6px;
      background: white; font-size: 12px; cursor: pointer; color: #111827;
      white-space: nowrap; font-family: inherit; line-height: 1.3;
    }
    .btn:hover { background: #f8f9fa; }
    .btn-sm { padding: 3px 8px; font-size: 11px; }
    .btn-primary { background: #3b82f6; color: white; border-color: #3b82f6; }
    .btn-primary:hover { background: #2563eb; }
    .btn-success-outline { color: #16a34a; border-color: #16a34a; }
    .btn-success-outline:hover { background: #f0fdf4; }
    .btn-ghost { border-color: transparent; color: #6b7280; }
    .btn-ghost:hover { background: #f3f4f6; color: #111827; }
    .btn-icon {
      display: inline-flex; align-items: center; justify-content: center;
      width: 24px; height: 24px; border: none; background: transparent;
      cursor: pointer; border-radius: 4px; color: #9ca3af; padding: 0;
    }
    .btn-icon:hover { background: #f3f4f6; color: #374151; }
    .btn-icon svg { width: 16px; height: 16px; }
    .minimized {
      display: flex; align-items: center; gap: 6px;
      background: white; border-radius: 8px; padding: 6px 10px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.15); font-size: 13px; font-weight: 500;
      border: 1px solid rgba(0,0,0,0.06); cursor: move;
    }
  `;
}
