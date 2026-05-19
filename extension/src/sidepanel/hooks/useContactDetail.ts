import { useState, useEffect, useCallback } from "react";
import type { ContactEvent } from "../../shared/types";
import { fetchContactTimeline, cacheTimeline, getCachedTimeline } from "../../shared/api";

export function useContactDetail(contactId: string | null) {
  const [timeline, setTimeline] = useState<ContactEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!contactId) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    (async () => {
      try {
        const events = await fetchContactTimeline(contactId);
        if (!cancelled) {
          setTimeline(events);
          await cacheTimeline(contactId, events);
        }
      } catch {
        if (!cancelled) {
          const cached = await getCachedTimeline(contactId);
          if (cached) setTimeline(cached);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [contactId]);

  const refresh = useCallback(() => {
    if (!contactId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const events = await fetchContactTimeline(contactId);
        if (!cancelled) {
          setTimeline(events);
          await cacheTimeline(contactId, events);
        }
      } catch {
        if (!cancelled) {
          const cached = await getCachedTimeline(contactId);
          if (cached) setTimeline(cached);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [contactId]);

  return { timeline, loading, refresh };
}
