interface DebugState {
  runtimePhase: string;
  sessionState: string;
  extensionConnected: boolean;
  lockState: string;
  retryCount: number;
  currentIndex: number;
  totalCount: number;
}

let overlayEl: HTMLDivElement | null = null;
let shadowRoot: ShadowRoot | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;
let state: DebugState = {
  runtimePhase: "unknown",
  sessionState: "inactive",
  extensionConnected: false,
  lockState: "none",
  retryCount: 0,
  currentIndex: 0,
  totalCount: 0,
};
let expanded = false;

function isDebugActive(): boolean {
  try {
    return localStorage.getItem("micronest_debug_mode") === "true";
  } catch {
    return false;
  }
}

async function fetchState(): Promise<void> {
  try {
    const recovery = await chrome.runtime.sendMessage({ type: "GET_RECOVERY_STATUS" });
    if (recovery) {
      state.extensionConnected = true;
      state.sessionState = recovery.session?.state ?? "inactive";
      state.currentIndex = recovery.session?.currentIndex ?? 0;
      state.totalCount = recovery.session?.totalCount ?? 0;
      state.lockState = state.sessionState === "sending" ? "active" : "idle";
    } else {
      state.extensionConnected = false;
    }
  } catch {
    state.extensionConnected = false;
  }

  try {
    const heartbeat = await chrome.runtime.sendMessage({ type: "GET_HEARTBEAT" });
    if (heartbeat) {
      state.runtimePhase = heartbeat.isStale ? "stale" : "alive";
    }
  } catch {
    state.runtimePhase = "offline";
  }

  render();
}

function createOverlay(): void {
  if (overlayEl) return;

  overlayEl = document.createElement("div");
  overlayEl.id = "micronest-devtools";
  overlayEl.style.cssText = `
    all: initial;
    position: fixed;
    top: 60px;
    right: 10px;
    z-index: 999999;
    font-family: 'SF Mono', 'Cascadia Code', 'Consolas', monospace;
    font-size: 11px;
    line-height: 1.4;
    color: #e2e8f0;
    cursor: move;
    transition: opacity 0.2s;
  `;

  document.body.appendChild(overlayEl);

  const shadow = overlayEl.attachShadow({ mode: "closed" });
  shadowRoot = shadow;

  const style = document.createElement("style");
  style.textContent = getStyles();
  shadow.appendChild(style);

  const container = document.createElement("div");
  container.id = "container";
  shadow.appendChild(container);

  makeDraggable(overlayEl);

  overlayEl.addEventListener("mouseenter", () => {
    if (hideTimer) clearTimeout(hideTimer);
    overlayEl!.style.opacity = "1";
  });

  overlayEl.addEventListener("mouseleave", () => {
    scheduleHide();
  });

  render();
  scheduleHide();
}

function scheduleHide(): void {
  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    if (overlayEl) overlayEl.style.opacity = "0.15";
  }, 10000);
}

function makeDraggable(el: HTMLDivElement): void {
  let isDragging = false;
  let startX = 0, startY = 0, origX = 0, origY = 0;

  el.addEventListener("mousedown", (e) => {
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    origX = el.offsetLeft;
    origY = el.offsetTop;
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    el.style.left = `${Math.max(0, origX + dx)}px`;
    el.style.top = `${Math.max(0, origY + dy)}px`;
    el.style.right = "auto";
  });

  document.addEventListener("mouseup", () => {
    isDragging = false;
  });
}

function render(): void {
  if (!shadowRoot) return;
  const container = shadowRoot.getElementById("container");
  if (!container) return;

  if (!expanded) {
    container.innerHTML = `
      <div class="badge" id="expandBtn">
        <svg viewBox="0 0 16 16" fill="currentColor" width="10" height="10" style="margin-right:4px">
          <path d="M6 0a6 6 0 110 12A6 6 0 016 0zm.5 2.5v3h3v1h-3v3h-1v-3h-3v-1h3v-3h1z" transform="rotate(45 8 8)"/>
        </svg>
        μ Debug
      </div>
    `;
    container.querySelector("#expandBtn")?.addEventListener("click", () => {
      expanded = true;
      render();
    });
    return;
  }

  const phaseColor = (p: string) =>
    p === "alive" ? "#22c55e" : p === "stale" ? "#f59e0b" : "#ef4444";
  const sessionColor = (s: string) =>
    s === "sending" ? "#3b82f6" : s === "paused" ? "#f59e0b" : s === "completed" ? "#22c55e" : "#6b7280";

  container.innerHTML = `
    <div class="panel">
      <div class="panel-header" id="dragHandle">
        <span>μ Debug</span>
        <button class="btn-icon" id="closeBtn">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">
            <line x1="4" y1="4" x2="12" y2="12"/><line x1="12" y1="4" x2="4" y2="12"/>
          </svg>
        </button>
      </div>
      <div class="panel-body">
        <div class="row">
          <span class="label">Runtime</span>
          <span class="badge-sm" style="background:${phaseColor(state.runtimePhase)}22;color:${phaseColor(state.runtimePhase)}">${state.runtimePhase}</span>
        </div>
        <div class="row">
          <span class="label">Session</span>
          <span class="badge-sm" style="background:${sessionColor(state.sessionState)}22;color:${sessionColor(state.sessionState)}">${state.sessionState}</span>
        </div>
        <div class="row">
          <span class="label">Extension</span>
          <span class="badge-sm" style="background:${state.extensionConnected ? "#22c55e" : "#ef4444"}22;color:${state.extensionConnected ? "#22c55e" : "#ef4444"}">${state.extensionConnected ? "connected" : "disconnected"}</span>
        </div>
        <div class="row">
          <span class="label">Lock</span>
          <span>${state.lockState}</span>
        </div>
        <div class="row">
          <span class="label">Progress</span>
          <span>${state.currentIndex}/${state.totalCount}</span>
        </div>
        <div class="row">
          <span class="label">Retries</span>
          <span>${state.retryCount}</span>
        </div>
      </div>
      <div class="panel-footer">
        <button class="btn-refresh" id="refreshBtn">Refresh</button>
        <button class="btn-refresh" id="collapseBtn">Minimize</button>
      </div>
    </div>
  `;

  container.querySelector("#closeBtn")?.addEventListener("click", () => {
    destroy();
  });

  container.querySelector("#refreshBtn")?.addEventListener("click", () => {
    fetchState();
  });

  container.querySelector("#collapseBtn")?.addEventListener("click", () => {
    expanded = false;
    render();
  });
}

function destroy(): void {
  if (overlayEl) {
    overlayEl.remove();
    overlayEl = null;
    shadowRoot = null;
  }
  if (hideTimer) clearTimeout(hideTimer);
}

function getStyles(): string {
  return `
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 4px 10px;
      border-radius: 12px;
      background: rgba(15,23,42,0.9);
      border: 1px solid rgba(217,119,6,0.3);
      color: #d97706;
      font-size: 10px;
      font-weight: 600;
      cursor: pointer;
      backdrop-filter: blur(4px);
      user-select: none;
    }
    .badge:hover { background: rgba(15,23,42,0.95); }
    .panel {
      width: 200px;
      background: rgba(15,23,42,0.92);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 8px;
      overflow: hidden;
      backdrop-filter: blur(8px);
    }
    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 8px;
      background: rgba(217,119,6,0.1);
      font-size: 10px;
      font-weight: 600;
      color: #d97706;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      cursor: move;
      user-select: none;
    }
    .panel-body { padding: 6px 8px; }
    .panel-footer {
      display: flex;
      gap: 4px;
      padding: 4px 8px 6px;
      border-top: 1px solid rgba(255,255,255,0.06);
    }
    .row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 2px 0;
      font-size: 10px;
    }
    .label { color: #94a3b8; }
    .badge-sm {
      display: inline-block;
      padding: 0 5px;
      border-radius: 4px;
      font-size: 9px;
      font-weight: 600;
    }
    .btn-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      border: none;
      background: transparent;
      cursor: pointer;
      border-radius: 4px;
      color: #64748b;
      padding: 0;
    }
    .btn-icon:hover { background: rgba(255,255,255,0.08); color: #e2e8f0; }
    .btn-refresh {
      flex: 1;
      padding: 3px 6px;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 4px;
      background: transparent;
      color: #94a3b8;
      font-size: 9px;
      font-family: inherit;
      cursor: pointer;
    }
    .btn-refresh:hover { background: rgba(255,255,255,0.06); color: #e2e8f0; }
  `;
}

function init(): void {
  if (!isDebugActive()) return;
  createOverlay();
  fetchState();
  setInterval(fetchState, 5000);
}

init();
