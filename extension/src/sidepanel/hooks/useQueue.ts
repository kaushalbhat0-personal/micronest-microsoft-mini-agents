import { useState, useEffect, useCallback } from "react";
import type { OperationalQueueItem } from "../../shared/types";
import { fetchOperationalQueue, cacheQueue, getCachedQueue, getCurrentSession } from "../../shared/api";

export function useQueue() {
  const [items, setItems] = useState<OperationalQueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!getCurrentSession()) return;
      setLoading(true);
      try {
        const data = await fetchOperationalQueue();
        if (!cancelled) {
          setItems(data);
          await cacheQueue(data);
        }
      } catch {
        if (!cancelled) {
          const cached = await getCachedQueue();
          if (cached) setItems(cached);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const refresh = useCallback(() => {
    let cancelled = false;
    (async () => {
      if (!getCurrentSession()) return;
      setLoading(true);
      try {
        const data = await fetchOperationalQueue();
        if (!cancelled) {
          setItems(data);
          await cacheQueue(data);
        }
      } catch {
        if (!cancelled) {
          const cached = await getCachedQueue();
          if (cached) setItems(cached);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { items, loading, refresh };
}
