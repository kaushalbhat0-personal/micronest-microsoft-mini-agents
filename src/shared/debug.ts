const DEBUG_KEY = "micronest_debug_mode";

export function isDebugMode(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get("debug") === "true") return true;
  try {
    return localStorage.getItem(DEBUG_KEY) === "true";
  } catch {
    return false;
  }
}

export function enableDebugMode(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DEBUG_KEY, "true");
  } catch {
    // ignore
  }
}

export function disableDebugMode(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(DEBUG_KEY);
  } catch {
    // ignore
  }
}

export function toggleDebugMode(): boolean {
  const next = !isDebugMode();
  if (next) enableDebugMode();
  else disableDebugMode();
  return next;
}
