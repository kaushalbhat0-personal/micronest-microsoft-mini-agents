// Centralized WhatsApp DOM selectors
// All WhatsApp selectors must be defined here to maintain reliability

export const SELECTORS = {
  // Main app root
  appRoot: "#app",

  // Message input field (contenteditable div)
  messageInput: [
    'div[contenteditable="true"][data-tab="10"]',
    'div[contenteditable="true"][spellcheck="true"]',
    'div.copyable-text.selectable-text',
    'div[contenteditable="true"]',
  ],

  // Send button
  sendButton: [
    'button[data-tab="11"] span[data-icon="send"]',
    'button[aria-label="Send"]',
    'span[data-icon="send"]',
    'button[data-testid="compose-btn-send"]',
  ],

  // Chat pane
  chatHeader: [
    'header[data-tab="1"]',
    '#main header',
    'div[data-testid="conversation-header"]',
  ],

  // Last message in chat (for delivery verification)
  lastMessage: [
    'div.message-in:last-child div.copyable-text',
    'div.message-out:last-child div.copyable-text',
    'div[data-testid="conversation-panel-messages"] div:last-child div.copyable-text',
  ],

  // Loading indicator
  loadingIndicator: [
    'div[data-testid="loading-state"]',
    'div[aria-label="Loading..."]',
    '#app div[role="progressbar"]',
  ],

  // Pane list / conversation list loaded
  paneList: [
    'div[data-testid="pane-header"]',
    '#side header',
    'div[data-testid="chat-list"]',
  ],
} as const;

export function querySelectorWithFallback(selectors: readonly string[]): Element | null {
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) return el;
  }
  return null;
}

export function waitForElement(
  selectors: readonly string[],
  timeoutMs = 10000,
  _intervalMs?: number
): Promise<Element | null> {
  return new Promise((resolve) => {
    const existing = querySelectorWithFallback(selectors);
    if (existing) {
      resolve(existing);
      return;
    }

    const observer = new MutationObserver(() => {
      const el = querySelectorWithFallback(selectors);
      if (el) {
        observer.disconnect();
        resolve(el);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeoutMs);
  });
}
