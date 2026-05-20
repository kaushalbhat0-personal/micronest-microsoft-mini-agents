import type { LogLevel, LogNamespace, LogEntry, LogContext } from "../../../src/shared/logger/types";

export type { LogLevel, LogNamespace, LogEntry, LogContext };

const LOG_KEY = "micronest_extension_logs";
const MAX_PERSISTED = 200;

let minLevel: LogLevel = "debug";
const memoryBuffer: LogEntry[] = [];
const MAX_MEMORY = 500;

export function setLogLevel(level: LogLevel): void {
  minLevel = level;
}

export function getLogLevel(): LogLevel {
  return minLevel;
}

export function getRecentLogs(count = 100): LogEntry[] {
  return memoryBuffer.slice(-count);
}

export function clearLogs(): void {
  memoryBuffer.length = 0;
  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    chrome.storage.local.remove(LOG_KEY).catch(() => {});
  }
}

async function persistToStorage(): Promise<void> {
  if (typeof chrome === "undefined" || !chrome.storage?.local) return;
  try {
    const existing = await chrome.storage.local.get(LOG_KEY);
    const stored: LogEntry[] = (existing[LOG_KEY] as LogEntry[]) ?? [];
    const merged = [...stored, ...memoryBuffer].slice(-MAX_PERSISTED);
    await chrome.storage.local.set({ [LOG_KEY]: merged });
    memoryBuffer.length = 0;
  } catch {
    // Best effort persistence
  }
}

export async function loadPersistedLogs(): Promise<LogEntry[]> {
  if (typeof chrome === "undefined" || !chrome.storage?.local) return [];
  try {
    const result = await chrome.storage.local.get(LOG_KEY);
    return (result[LOG_KEY] as LogEntry[]) ?? [];
  } catch {
    return [];
  }
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[minLevel];
}

function addEntry(entry: LogEntry): void {
  if (!shouldLog(entry.level)) return;
  memoryBuffer.push(entry);
  if (memoryBuffer.length >= MAX_MEMORY) {
    persistToStorage();
  }
}

export function log(
  level: LogLevel,
  namespace: LogNamespace,
  message: string,
  context?: LogContext,
  data?: unknown
): void {
  addEntry({ timestamp: Date.now(), level, namespace, message, context, data });
}

export function createExtensionLogger(namespace: LogNamespace) {
  return {
    debug: (message: string, context?: LogContext, data?: unknown) => log("debug", namespace, message, context, data),
    info: (message: string, context?: LogContext, data?: unknown) => log("info", namespace, message, context, data),
    warn: (message: string, context?: LogContext, data?: unknown) => log("warn", namespace, message, context, data),
    error: (message: string, context?: LogContext, data?: unknown) => log("error", namespace, message, context, data),
  };
}
