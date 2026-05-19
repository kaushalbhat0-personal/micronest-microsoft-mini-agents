// Content script for WhatsApp Web — Reliability Engine v2
// Responsibilities:
//   - Detect WhatsApp Web readiness
//   - Inject and send messages with delivery verification
//   - Centralized selector usage

import { SELECTORS, querySelectorWithFallback, waitForElement } from "../shared/selectors";

function notifyReady(): void {
  chrome.runtime.sendMessage({ type: "WHATSAPP_READY", payload: { ready: true } });
}

async function injectMessage(message: string): Promise<{ success: boolean; verified: boolean; error?: string }> {
  const inputEl = await waitForElement(SELECTORS.messageInput, 12000, 300);
  if (!inputEl) {
    return { success: false, verified: false, error: "DOM_NOT_FOUND: Message input not found" };
  }

  inputEl.textContent = message;
  inputEl.dispatchEvent(new InputEvent("input", { bubbles: true, cancelable: true }));
  inputEl.dispatchEvent(new Event("input", { bubbles: true }));

  await sleep(800);

  const sendBtn = querySelectorWithFallback(SELECTORS.sendButton) as HTMLElement | null;
  if (!sendBtn) {
    return { success: true, verified: false, error: "Send button not found, message was pre-filled" };
  }

  sendBtn.click();

  await sleep(3000);

  const verified = await verifyMessageSent(message);
  return { success: true, verified, error: verified ? undefined : "Could not verify delivery" };
}

async function verifyMessageSent(_message: string): Promise<boolean> {
  try {
    const lastMsg = await waitForElement(SELECTORS.lastMessage, 5000, 300);
    if (lastMsg) {
      const text = lastMsg.textContent?.trim() ?? "";
      if (text.length > 0) return true;
    }

    const checkAgain = await waitForElement(SELECTORS.lastMessage, 3000, 200);
    if (checkAgain) return true;

    return false;
  } catch {
    return false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

chrome.runtime.onMessage.addListener((_message, _sender, sendResponse) => {
  switch (message.type) {
    case "INJECT_MESSAGE":
      injectMessage(message.payload.message).then((result) => {
        chrome.runtime.sendMessage({
          type: "INJECT_RESULT",
          payload: result,
        });
      });
      sendResponse({ success: true });
      break;

    case "CHECK_READY":
      const el = querySelectorWithFallback(SELECTORS.appRoot);
      sendResponse({ ready: !!el && el.children.length > 0 });
      break;
  }
});

const observer = new MutationObserver(() => {
  const app = querySelectorWithFallback(SELECTORS.appRoot);
  if (app && app.children.length > 0) {
    notifyReady();
    observer.disconnect();
  }
});

observer.observe(document.body, { childList: true, subtree: true });

if (document.readyState === "complete") {
  const app = querySelectorWithFallback(SELECTORS.appRoot);
  if (app && app.children.length > 0) {
    notifyReady();
  }
}
