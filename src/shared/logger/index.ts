import type { Logger, LogLevel, LogNamespace, LogEntry, LogContext } from "./types";
import { LOG_LEVELS } from "./types";

export type { Logger, LogLevel, LogNamespace, LogEntry, LogContext };

let minLevel: LogLevel = "debug";
const listeners: Array<(entry: LogEntry) => void> = [];

export function setLogLevel(level: LogLevel): void {
  minLevel = level;
}

export function getLogLevel(): LogLevel {
  return minLevel;
}

export function onLog(listener: (entry: LogEntry) => void): () => void {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

const recentEntries: LogEntry[] = [];
const MAX_ENTRIES = 500;

export function getRecentLogs(count = 100): LogEntry[] {
  return recentEntries.slice(-count);
}

export function clearLogs(): void {
  recentEntries.length = 0;
}

function addEntry(entry: LogEntry): void {
  if (LOG_LEVELS[entry.level] < LOG_LEVELS[minLevel]) return;
  recentEntries.push(entry);
  if (recentEntries.length > MAX_ENTRIES) recentEntries.shift();
  for (const listener of listeners) listener(entry);
}

function formatLog(entry: LogEntry): string {
  const ts = new Date(entry.timestamp).toISOString();
  const ctx = entry.context ? ` [${JSON.stringify(entry.context)}]` : "";
  const data = entry.data !== undefined ? ` ${JSON.stringify(entry.data)}` : "";
  return `[${ts}] [${entry.level.toUpperCase()}] [${entry.namespace}] ${entry.message}${ctx}${data}`;
}

function createLogger(namespace: LogNamespace): Logger {
  return {
    debug(message, context, data) {
      addEntry({ timestamp: Date.now(), level: "debug", namespace, message, context, data });
    },
    info(message, context, data) {
      addEntry({ timestamp: Date.now(), level: "info", namespace, message, context, data });
    },
    warn(message, context, data) {
      addEntry({ timestamp: Date.now(), level: "warn", namespace, message, context, data });
    },
    error(message, context, data) {
      addEntry({ timestamp: Date.now(), level: "error", namespace, message, context, data });
    },
  };
}

const loggers = new Map<LogNamespace, Logger>();

export function getLogger(namespace: LogNamespace): Logger {
  let logger = loggers.get(namespace);
  if (!logger) {
    logger = createLogger(namespace);
    loggers.set(namespace, logger);
  }
  return logger;
}

export { formatLog };
