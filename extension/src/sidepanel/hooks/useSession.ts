import { useState, useEffect, useCallback } from "react";
import type { SequentialSessionInfo } from "../../shared/types";
import { getRecoveryStatus, listenForSessionStatus, sendSessionAction } from "../../shared/api";

export function useSession() {
  const [session, setSession] = useState<SequentialSessionInfo | null>(null);
  const [whatsappConnected, setWhatsappConnected] = useState(false);
  const [extensionConnected, setExtensionConnected] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const status = await getRecoveryStatus();
        if (status) {
          setSession(status.session);
          setWhatsappConnected(status.whatsappConnected);
          setExtensionConnected(true);
        }
      } catch {
        setExtensionConnected(false);
      }
    }
    init();

    const poll = setInterval(init, 10000);
    return () => clearInterval(poll);
  }, []);

  useEffect(() => {
    const unsub = listenForSessionStatus((s) => {
      setSession(s);
      setExtensionConnected(true);
    });
    return unsub;
  }, []);

  const pause = useCallback(async () => {
    if (session) await sendSessionAction("PAUSE_SEQUENCE", session.id);
  }, [session]);

  const resume = useCallback(async () => {
    if (session) await sendSessionAction("RESUME_SEQUENCE", session.id);
  }, [session]);

  const stop = useCallback(async () => {
    if (session) await sendSessionAction("STOP_SEQUENCE", session.id);
  }, [session]);

  const skip = useCallback(async () => {
    if (session) await sendSessionAction("SKIP_CURRENT", session.id);
  }, [session]);

  return { session, whatsappConnected, extensionConnected, pause, resume, stop, skip };
}
