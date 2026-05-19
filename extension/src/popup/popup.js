// Popup script for MicroNest WhatsApp extension
// Shows WhatsApp connection status + active session controls

const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const sessionArea = document.getElementById("sessionArea");

async function checkStatus() {
  try {
    const response = await chrome.runtime.sendMessage({ type: "GET_WHATSAPP_TAB" });
    if (response?.tab) {
      statusDot.className = "dot connected";
      statusText.textContent = "WhatsApp Web connected";
    } else {
      statusDot.className = "dot disconnected";
      statusText.textContent = "WhatsApp Web not open";
    }
  } catch {
    statusDot.className = "dot disconnected";
    statusText.textContent = "Unable to check status";
  }
}

function sendAction(type, sessionId) {
  chrome.runtime.sendMessage({ type, payload: { sessionId } });
}

function renderSession(session) {
  if (!session) {
    sessionArea.innerHTML = '<div class="no-session">No active session</div>';
    return;
  }

  const progress = session.totalCount > 0
    ? Math.round((session.currentIndex / session.totalCount) * 100)
    : 0;

  const isRunning = session.state === "sending";
  const isPaused = session.state === "paused";
  const isDone = session.state === "completed" || session.state === "stopped";

  if (isRunning) {
    statusDot.className = "dot sending";
    statusText.textContent = `Sending (${session.currentIndex}/${session.totalCount})`;
  } else if (isDone) {
    statusDot.className = "dot connected";
    statusText.textContent = `Session ${session.state}`;
  }

  const currentContactHtml = session.currentContactName
    ? `<div style="font-size:11px;color:#666;margin-bottom:4px">Current: ${session.currentContactName}</div>`
    : "";

  const delayHtml = session.delayRemainingMs > 0
    ? `<div style="font-size:11px;color:#666;margin-bottom:8px">Next send in ${Math.round(session.delayRemainingMs / 1000)}s</div>`
    : "";

  const controlsHtml = !isDone ? `
    <div class="btn-group">
      ${isRunning ? '<button class="danger" id="btnPause">Pause</button>' : ""}
      ${isPaused ? '<button class="primary" id="btnResume">Resume</button>' : ""}
      <button class="danger" id="btnStop">Stop</button>
      <button id="btnSkip">Skip</button>
    </div>
  ` : "";

  sessionArea.innerHTML = `
    <div class="session-card">
      <h3>Sequential Send</h3>
      <div class="progress-bar">
        <div class="progress-fill" style="width:${progress}%"></div>
      </div>
      <div class="stat-grid">
        <div class="stat">
          <div class="stat-value sent">${session.counters.sent}</div>
          <div class="stat-label">Sent</div>
        </div>
        <div class="stat">
          <div class="stat-value skipped">${session.counters.skipped}</div>
          <div class="stat-label">Skipped</div>
        </div>
        <div class="stat">
          <div class="stat-value failed">${session.counters.failed}</div>
          <div class="stat-label">Failed</div>
        </div>
      </div>
      ${currentContactHtml}
      ${delayHtml}
      ${controlsHtml}
    </div>
  `;

  document.getElementById("btnPause")?.addEventListener("click", () => sendAction("PAUSE_SEQUENCE", session.id));
  document.getElementById("btnResume")?.addEventListener("click", () => sendAction("RESUME_SEQUENCE", session.id));
  document.getElementById("btnStop")?.addEventListener("click", () => sendAction("STOP_SEQUENCE", session.id));
  document.getElementById("btnSkip")?.addEventListener("click", () => sendAction("SKIP_CURRENT", session.id));
}

async function getActiveSession() {
  try {
    const response = await chrome.runtime.sendMessage({
      type: "GET_SESSION_STATUS",
      payload: {},
    });
    if (response?.sessions && response.sessions.length > 0) {
      return response.sessions[0];
    }
  } catch {
    // Background not available
  }
  return null;
}

async function refresh() {
  await checkStatus();
  const session = await getActiveSession();
  renderSession(session);
}

refresh();
setInterval(refresh, 2000);
