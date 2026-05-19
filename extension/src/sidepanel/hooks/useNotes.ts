import { useState, useEffect, useCallback } from "react";
import type { ContactNote } from "../../shared/types";
import { fetchNotes, addNote as apiAddNote, cacheNotes, getCachedNotes } from "../../shared/api";

export function useNotes(contactId: string | null) {
  const [notes, setNotes] = useState<ContactNote[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!contactId) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    (async () => {
      try {
        const data = await fetchNotes(contactId);
        if (!cancelled) {
          setNotes(data);
          await cacheNotes(contactId, data);
        }
      } catch {
        if (!cancelled) {
          const cached = await getCachedNotes(contactId);
          if (cached) setNotes(cached);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [contactId]);

  const addNote = useCallback(async (text: string): Promise<boolean> => {
    if (!contactId) return false;
    const result = await apiAddNote(contactId, text);
    if (result.success) {
      const data = await fetchNotes(contactId);
      setNotes(data);
      return true;
    }
    return false;
  }, [contactId]);

  const refresh = useCallback(() => {
    if (!contactId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const data = await fetchNotes(contactId);
        if (!cancelled) {
          setNotes(data);
          await cacheNotes(contactId, data);
        }
      } catch {
        if (!cancelled) {
          const cached = await getCachedNotes(contactId);
          if (cached) setNotes(cached);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [contactId]);

  return { notes, loading, addNote, refresh };
}
