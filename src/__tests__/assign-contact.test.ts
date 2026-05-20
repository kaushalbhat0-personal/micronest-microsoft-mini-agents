import { describe, it, expect, beforeEach } from "vitest";

interface TestFollowupCandidate {
  id: string;
  user_id: string;
  workspace_id: string;
  assigned_to: string | null;
}

interface TestContact {
  id: string;
  user_id: string;
  assigned_to: string | null;
  updated_at: string;
}

interface TestContactEvent {
  user_id: string;
  contact_id: string;
  event_type: string;
  metadata: Record<string, unknown>;
}

interface TestUser {
  id: string;
}

function createStore() {
  const candidates = new Map<string, TestFollowupCandidate>();
  const contacts = new Map<string, TestContact>();
  const events: TestContactEvent[] = [];
  let currentUser: TestUser | null = null;

  return {
    setCurrentUser(user: TestUser | null) {
      currentUser = user;
    },
    getCurrentUser() {
      return currentUser;
    },
    addCandidate(c: TestFollowupCandidate) {
      candidates.set(c.id, { ...c });
    },
    getCandidate(id: string) {
      return candidates.get(id) ?? null;
    },
    updateCandidate(id: string, updates: Partial<TestFollowupCandidate>) {
      const c = candidates.get(id);
      if (c) candidates.set(id, { ...c, ...updates });
    },
    addContact(c: TestContact) {
      contacts.set(c.id, { ...c });
    },
    getContact(id: string) {
      return contacts.get(id) ?? null;
    },
    updateContact(id: string, updates: Partial<TestContact>) {
      const c = contacts.get(id);
      if (c) contacts.set(id, { ...c, ...updates });
    },
    addEvent(e: TestContactEvent) {
      events.push({ ...e });
    },
    getEvents() {
      return [...events];
    },
    getAllCandidates() {
      return Array.from(candidates.values());
    },
    getAllContacts() {
      return Array.from(contacts.values());
    },
    clear() {
      candidates.clear();
      contacts.clear();
      events.length = 0;
      currentUser = null;
    },
  };
}

function assignContact(
  candidateId: string,
  contactId: string,
  assigneeId: string | null,
  store: ReturnType<typeof createStore>
): { success: boolean; error?: string } {
  const user = store.getCurrentUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const candidate = store.getCandidate(candidateId);
  if (!candidate || candidate.user_id !== user.id) {
    return { success: false, error: "candidate not found" };
  }

  const contact = store.getContact(contactId);
  if (!contact || contact.user_id !== user.id) {
    return { success: false, error: "contact not found" };
  }

  store.updateCandidate(candidateId, { assigned_to: assigneeId });
  store.updateContact(contactId, { assigned_to: assigneeId, updated_at: new Date().toISOString() });
  store.addEvent({
    user_id: user.id,
    contact_id: contactId,
    event_type: "followup_scheduled",
    metadata: {
      action: assigneeId ? "assigned" : "unassigned",
      assignee_id: assigneeId,
      actor_id: user.id,
    },
  });

  return { success: true };
}

function selfAssignContact(
  candidateId: string,
  contactId: string,
  store: ReturnType<typeof createStore>
): { success: boolean; error?: string } {
  const user = store.getCurrentUser();
  if (!user) return { success: false, error: "Unauthorized" };
  return assignContact(candidateId, contactId, user.id, store);
}

function bulkAssignContacts(
  assignments: Array<{ candidateId: string; contactId: string }>,
  assigneeId: string | null,
  store: ReturnType<typeof createStore>
): { success: boolean; error?: string } {
  const user = store.getCurrentUser();
  if (!user) return { success: false, error: "Unauthorized" };

  for (const a of assignments) {
    const candidate = store.getCandidate(a.candidateId);
    if (!candidate || candidate.user_id !== user.id) {
      return { success: false, error: "candidate not found for " + a.candidateId };
    }
    const contact = store.getContact(a.contactId);
    if (!contact || contact.user_id !== user.id) {
      return { success: false, error: "contact not found for " + a.contactId };
    }
    store.updateCandidate(a.candidateId, { assigned_to: assigneeId });
    store.updateContact(a.contactId, { assigned_to: assigneeId, updated_at: new Date().toISOString() });
  }

  return { success: true };
}

const userA: TestUser = { id: "user-a" };
const userB: TestUser = { id: "user-b" };

describe("assign-contact", () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
    store.clear();
    store.setCurrentUser(userA);
    store.addCandidate({ id: "cand-1", user_id: userA.id, workspace_id: "ws-1", assigned_to: null });
    store.addContact({ id: "ct-1", user_id: userA.id, assigned_to: null, updated_at: "" });
  });

  describe("assignContact", () => {
    it("updates both followup_candidates and contacts tables", () => {
      const result = assignContact("cand-1", "ct-1", "user-b", store);

      expect(result.success).toBe(true);
      expect(store.getCandidate("cand-1")!.assigned_to).toBe("user-b");
      expect(store.getContact("ct-1")!.assigned_to).toBe("user-b");
      expect(store.getContact("ct-1")!.updated_at).not.toBe("");
    });

    it("creates a contact_events entry with metadata", () => {
      assignContact("cand-1", "ct-1", "user-b", store);

      const events = store.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].user_id).toBe("user-a");
      expect(events[0].contact_id).toBe("ct-1");
      expect(events[0].event_type).toBe("followup_scheduled");
      expect(events[0].metadata).toEqual({
        action: "assigned",
        assignee_id: "user-b",
        actor_id: "user-a",
      });
    });

    it("returns error when unauthorized (no user)", () => {
      store.setCurrentUser(null);

      const result = assignContact("cand-1", "ct-1", "user-b", store);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });

    it("with null assignee unassigns the contact", () => {
      store.updateCandidate("cand-1", { assigned_to: "user-b" });
      store.updateContact("ct-1", { assigned_to: "user-b", updated_at: new Date().toISOString() });

      const result = assignContact("cand-1", "ct-1", null, store);

      expect(result.success).toBe(true);
      expect(store.getCandidate("cand-1")!.assigned_to).toBeNull();
      expect(store.getContact("ct-1")!.assigned_to).toBeNull();
    });
  });

  describe("selfAssignContact", () => {
    it("assigns to current user", () => {
      const result = selfAssignContact("cand-1", "ct-1", store);

      expect(result.success).toBe(true);
      expect(store.getCandidate("cand-1")!.assigned_to).toBe("user-a");
      expect(store.getContact("ct-1")!.assigned_to).toBe("user-a");
    });
  });

  describe("bulkAssignContacts", () => {
    it("updates multiple contacts at once", () => {
      store.addCandidate({ id: "cand-2", user_id: userA.id, workspace_id: "ws-1", assigned_to: null });
      store.addContact({ id: "ct-2", user_id: userA.id, assigned_to: null, updated_at: "" });

      const result = bulkAssignContacts(
        [
          { candidateId: "cand-1", contactId: "ct-1" },
          { candidateId: "cand-2", contactId: "ct-2" },
        ],
        "user-b",
        store
      );

      expect(result.success).toBe(true);
      expect(store.getCandidate("cand-1")!.assigned_to).toBe("user-b");
      expect(store.getCandidate("cand-2")!.assigned_to).toBe("user-b");
      expect(store.getContact("ct-1")!.assigned_to).toBe("user-b");
      expect(store.getContact("ct-2")!.assigned_to).toBe("user-b");
    });

    it("returns error on failure", () => {
      const result = bulkAssignContacts(
        [{ candidateId: "nonexistent", contactId: "ct-1" }],
        "user-b",
        store
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });
});
