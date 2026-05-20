import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "micronest_debug_mode";

function getDebugFromURL(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get("debug") === "true";
  } catch {
    return false;
  }
}

function getDebugFromStorage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function setDebugStorage(value: boolean): void {
  try {
    if (value) {
      localStorage.setItem(STORAGE_KEY, "true");
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {}
}

declare global {
  interface Window {
    __MICRONEST_DEBUG__?: boolean;
  }
}

export function useDebugMode() {
  const [isDebug, setIsDebug] = useState(() => {
    return getDebugFromURL() || getDebugFromStorage();
  });

  useEffect(() => {
    window.__MICRONEST_DEBUG__ = isDebug;
  }, [isDebug]);

  useEffect(() => {
    function handler(e: CustomEvent<{ enabled: boolean }>) {
      setIsDebug(e.detail?.enabled ?? false);
    }
    window.addEventListener("micronest:debug-toggle", handler as EventListener);
    return () => window.removeEventListener("micronest:debug-toggle", handler as EventListener);
  }, []);

  const toggleDebug = useCallback(() => {
    setIsDebug(prev => {
      const next = !prev;
      setDebugStorage(next);
      window.__MICRONEST_DEBUG__ = next;
      return next;
    });
  }, []);

  return { isDebug, toggleDebug };
}
