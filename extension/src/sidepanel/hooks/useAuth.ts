import { useState, useEffect, useCallback } from "react";
import type { Session } from "@supabase/supabase-js";
import { signIn as apiSignIn, signOut as apiSignOut, setSession as apiSetSession } from "../../shared/api";

const AUTH_KEY = "micronest_auth_session";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function restore() {
      try {
        const stored = await chrome.storage.local.get(AUTH_KEY);
        const data = stored[AUTH_KEY] as string | undefined;
        if (data) {
          const parsed: Session = JSON.parse(data);
          const expiresAt = parsed.expires_at ? parsed.expires_at * 1000 : 0;
          if (Date.now() < expiresAt) {
            setSession(parsed);
            apiSetSession(parsed);
          } else {
            await chrome.storage.local.remove(AUTH_KEY);
          }
        }
      } catch {
        // Session invalid
      } finally {
        setLoading(false);
      }
    }
    restore();
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<string | null> => {
    setError(null);
    const result = await apiSignIn(email, password);
    if (result.error) {
      setError(result.error);
      return result.error;
    }
    if (result.session) {
      setSession(result.session);
      apiSetSession(result.session);
      await chrome.storage.local.set({ [AUTH_KEY]: JSON.stringify(result.session) });
    }
    return null;
  }, []);

  const signOut = useCallback(async () => {
    await apiSignOut();
    setSession(null);
    await chrome.storage.local.remove(AUTH_KEY);
  }, []);

  return { session, loading, error, signIn, signOut };
}
