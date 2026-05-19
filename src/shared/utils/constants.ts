export const APP_NAME = "MicroNest";

export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  REGISTER: "/register",
  DASHBOARD: "/dashboard",
  UPLOAD: "/upload",
  FOLLOWUPS: "/followups",
  SETTINGS: "/settings",
} as const;

export const API_ROUTES = {
  UPLOAD: "/api/upload",
  AI_GENERATE: "/api/ai/generate",
} as const;

export const FILE = {
  MAX_SIZE_MB: 10,
  MAX_SIZE_BYTES: 10 * 1024 * 1024,
  ACCEPTED_TYPES: [
    "text/csv",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
  ] as const,
} as const;

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 25,
  PAGE_SIZES: [10, 25, 50, 100] as const,
} as const;

export const FOLLOWUP_STATUS = {
  PENDING: "pending",
  DRAFTED: "drafted",
  SENT: "sent",
  RESPONDED: "responded",
  CLOSED: "closed",
} as const;

export type FollowupStatus = (typeof FOLLOWUP_STATUS)[keyof typeof FOLLOWUP_STATUS];
