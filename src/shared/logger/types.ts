export type LogLevel = "debug" | "info" | "warn" | "error";

export const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export type LogNamespace =
  | "runtime"
  | "workspace"
  | "queue"
  | "extension"
  | "overlay"
  | "recovery"
  | "realtime"
  | "locking"
  | "messaging"
  | "api";

export interface LogContext {
  sessionId?: string;
  workspaceId?: string;
  operatorId?: string;
  contactId?: string;
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  namespace: LogNamespace;
  message: string;
  context?: LogContext;
  data?: unknown;
}

export interface Logger {
  debug(message: string, context?: LogContext, data?: unknown): void;
  info(message: string, context?: LogContext, data?: unknown): void;
  warn(message: string, context?: LogContext, data?: unknown): void;
  error(message: string, context?: LogContext, data?: unknown): void;
}
