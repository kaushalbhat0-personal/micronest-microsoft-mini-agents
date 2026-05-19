// Shared utilities for MicroNest WhatsApp extension
// Future: shared message types, URL builders, etc.

export const WHATSAPP_BASE_URL = "https://web.whatsapp.com";

export interface ExtensionMessage {
  type: string;
  payload?: unknown;
}
