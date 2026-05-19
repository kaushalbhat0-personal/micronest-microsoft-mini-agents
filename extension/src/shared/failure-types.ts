// Failure classification for sequential send engine

export const FailureCategory = {
  INVALID_NUMBER: "INVALID_NUMBER",
  WHATSAPP_DISCONNECTED: "WHATSAPP_DISCONNECTED",
  DOM_NOT_FOUND: "DOM_NOT_FOUND",
  SEND_TIMEOUT: "SEND_TIMEOUT",
  TAB_CLOSED: "TAB_CLOSED",
  MESSAGE_INJECTION_FAILED: "MESSAGE_INJECTION_FAILED",
  RATE_LIMITED: "RATE_LIMITED",
  UNKNOWN: "UNKNOWN",
} as const;

export type FailureCategory = (typeof FailureCategory)[keyof typeof FailureCategory];

export interface SendFailure {
  category: FailureCategory;
  message: string;
  retryable: boolean;
  timestamp: number;
  contactIndex?: number;
  candidateId?: string;
  contactId?: string;
}

export function isRetryable(category: FailureCategory): boolean {
  return [
    FailureCategory.DOM_NOT_FOUND,
    FailureCategory.SEND_TIMEOUT,
    FailureCategory.MESSAGE_INJECTION_FAILED,
  ].includes(category);
}

export const MAX_RETRIES = 3;

export function classifyFailure(error: string, phoneNumber?: string): SendFailure {
  const category = detectCategory(error, phoneNumber);
  return {
    category,
    message: error,
    retryable: isRetryable(category),
    timestamp: Date.now(),
  };
}

function detectCategory(error: string, phoneNumber?: string): FailureCategory {
  const lower = error.toLowerCase();

  if (phoneNumber && (phoneNumber.length < 10 || !/^\d+$/.test(phoneNumber.replace(/\D/g, "")))) {
    return FailureCategory.INVALID_NUMBER;
  }
  if (lower.includes("disconnect") || lower.includes("not connected")) {
    return FailureCategory.WHATSAPP_DISCONNECTED;
  }
  if (lower.includes("input not found") || lower.includes("not found") || lower.includes("dom")) {
    return FailureCategory.DOM_NOT_FOUND;
  }
  if (lower.includes("timeout") || lower.includes("timed out")) {
    return FailureCategory.SEND_TIMEOUT;
  }
  if (lower.includes("tab") || lower.includes("closed")) {
    return FailureCategory.TAB_CLOSED;
  }
  if (lower.includes("inject") || lower.includes("injection")) {
    return FailureCategory.MESSAGE_INJECTION_FAILED;
  }
  if (lower.includes("rate") || lower.includes("limit") || lower.includes("blocked")) {
    return FailureCategory.RATE_LIMITED;
  }
  return FailureCategory.UNKNOWN;
}
