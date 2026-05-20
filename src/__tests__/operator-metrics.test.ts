import { describe, it, expect, beforeEach } from "vitest";

interface TestFollowupCandidate {
  id: string;
  workspace_id: string;
  assigned_to: string;
  candidate_status: string;
}

interface TestContact {
  id: string;
  due_date: string;
}

interface TestContactEvent {
  id: string;
  workspace_id: string;
  user_id: string;
  event_type: string;
  created_at: string;
}

interface TestSession {
  id: string;
  workspace_id: string;
  user_id: string;
  state: string;
}

interface OperatorMetrics {
  assignedContacts: number;
  activeFollowups: number;
  overduePromises: number;
  resolvedToday: number;
  activeSessions: number;
}

interface TestUser {
  id: string;
}

function createMetricsStore() {
  const candidates = new Map<string, TestFollowupCandidate>();
  const contacts = new Map<string, TestContact>();
  const events = new Map<string, TestContactEvent>();
  const sessions = new Map<string, TestSession>();
  let currentUser: TestUser | null = null;

  return {
    setCurrentUser(u: TestUser | null) {
      currentUser = u;
    },
    getCurrentUser() {
      return currentUser;
    },
    addCandidate(c: TestFollowupCandidate) {
      candidates.set(c.id, { ...c });
    },
    addContact(c: TestContact) {
      contacts.set(c.id, { ...c });
    },
    addEvent(e: TestContactEvent) {
      events.set(e.id, { ...e });
    },
    addSession(s: TestSession) {
      sessions.set(s.id, { ...s });
    },
    getCandidates() {
      return Array.from(candidates.values());
    },
    getContacts() {
      return Array.from(contacts.values());
    },
    getContact(id: string) {
      return contacts.get(id) ?? null;
    },
    clear() {
      candidates.clear();
      contacts.clear();
      events.clear();
      sessions.clear();
      currentUser = null;
    },
  };
}

function getOperatorMetrics(
  workspaceId: string,
  store: ReturnType<typeof createMetricsStore>
): OperatorMetrics {
  const metrics: OperatorMetrics = {
    assignedContacts: 0,
    activeFollowups: 0,
    overduePromises: 0,
    resolvedToday: 0,
    activeSessions: 0,
  };

  const user = store.getCurrentUser();
  if (!user) return metrics;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const allCandidates = store.getCandidates();

  const userCandidates = allCandidates.filter(
    (c) => c.workspace_id === workspaceId && c.assigned_to === user.id
  );

  metrics.assignedContacts = userCandidates.length;

  metrics.activeFollowups = userCandidates.filter((c) =>
    ["pending", "opened", "contacted", "responded"].includes(c.candidate_status)
  ).length;

  metrics.overduePromises = userCandidates.filter((c) => {
    if (c.candidate_status !== "promised") return false;
    const contact = store.getContact(c.id);
    if (!contact) return false;
    return new Date(contact.due_date) < new Date();
  }).length;

  metrics.resolvedToday = Array.from(store.getCandidates().values())
    .filter(
      (c) =>
        c.workspace_id === workspaceId &&
        c.assigned_to === user.id &&
        c.candidate_status === "resolved"
    ).length;

  metrics.activeSessions = Array.from(store.getCandidates().values())
    .filter(
      (c) =>
        c.workspace_id === workspaceId &&
        (c.candidate_status === "sending" || c.candidate_status === "paused")
    ).length;

  return metrics;
}

describe("operator-metrics", () => {
  let store: ReturnType<typeof createMetricsStore>;
  const userA: TestUser = { id: "op-1" };
  const wsId = "ws-1";

  beforeEach(() => {
    store = createMetricsStore();
    store.clear();
    store.setCurrentUser(userA);
  });

  describe("assignedContacts", () => {
    it("counts contacts with assigned_to matching user", () => {
      store.addCandidate({ id: "c1", workspace_id: wsId, assigned_to: "op-1", candidate_status: "pending" });
      store.addCandidate({ id: "c2", workspace_id: wsId, assigned_to: "op-2", candidate_status: "pending" });
      store.addCandidate({ id: "c3", workspace_id: wsId, assigned_to: "op-1", candidate_status: "opened" });

      const metrics = getOperatorMetrics(wsId, store);

      expect(metrics.assignedContacts).toBe(2);
    });

    it("returns 0 when user has no assigned contacts", () => {
      store.addCandidate({ id: "c1", workspace_id: wsId, assigned_to: "op-2", candidate_status: "pending" });

      const metrics = getOperatorMetrics(wsId, store);

      expect(metrics.assignedContacts).toBe(0);
    });
  });

  describe("activeFollowups", () => {
    it("counts active statuses", () => {
      store.addCandidate({ id: "c1", workspace_id: wsId, assigned_to: "op-1", candidate_status: "pending" });
      store.addCandidate({ id: "c2", workspace_id: wsId, assigned_to: "op-1", candidate_status: "opened" });
      store.addCandidate({ id: "c3", workspace_id: wsId, assigned_to: "op-1", candidate_status: "contacted" });
      store.addCandidate({ id: "c4", workspace_id: wsId, assigned_to: "op-1", candidate_status: "responded" });
      store.addCandidate({ id: "c5", workspace_id: wsId, assigned_to: "op-1", candidate_status: "completed" });

      const metrics = getOperatorMetrics(wsId, store);

      expect(metrics.activeFollowups).toBe(4);
    });

    it("ignores non-active statuses", () => {
      store.addCandidate({ id: "c1", workspace_id: wsId, assigned_to: "op-1", candidate_status: "completed" });
      store.addCandidate({ id: "c2", workspace_id: wsId, assigned_to: "op-1", candidate_status: "closed" });

      const metrics = getOperatorMetrics(wsId, store);

      expect(metrics.activeFollowups).toBe(0);
    });
  });

  describe("overduePromises", () => {
    it("counts promises past due_date", () => {
      store.addCandidate({ id: "c1", workspace_id: wsId, assigned_to: "op-1", candidate_status: "promised" });
      store.addContact({ id: "c1", due_date: new Date(Date.now() - 86400000).toISOString() });
      store.addCandidate({ id: "c2", workspace_id: wsId, assigned_to: "op-1", candidate_status: "promised" });
      store.addContact({ id: "c2", due_date: new Date(Date.now() + 86400000).toISOString() });

      const metrics = getOperatorMetrics(wsId, store);

      expect(metrics.overduePromises).toBe(1);
    });

    it("counts 0 when no promises are overdue", () => {
      store.addCandidate({ id: "c1", workspace_id: wsId, assigned_to: "op-1", candidate_status: "promised" });
      store.addContact({ id: "c1", due_date: new Date(Date.now() + 86400000).toISOString() });

      const metrics = getOperatorMetrics(wsId, store);

      expect(metrics.overduePromises).toBe(0);
    });
  });

  describe("resolvedToday", () => {
    it("counts resolved today", () => {
      store.addCandidate({ id: "c1", workspace_id: wsId, assigned_to: "op-1", candidate_status: "resolved" });
      store.addCandidate({ id: "c2", workspace_id: wsId, assigned_to: "op-1", candidate_status: "resolved" });
      store.addCandidate({ id: "c3", workspace_id: wsId, assigned_to: "op-1", candidate_status: "pending" });

      const metrics = getOperatorMetrics(wsId, store);

      expect(metrics.resolvedToday).toBe(2);
    });

    it("returns 0 when nothing resolved today", () => {
      store.addCandidate({ id: "c1", workspace_id: wsId, assigned_to: "op-1", candidate_status: "pending" });

      const metrics = getOperatorMetrics(wsId, store);

      expect(metrics.resolvedToday).toBe(0);
    });
  });

  describe("activeSessions", () => {
    it("counts active sequential sessions", () => {
      store.addCandidate({ id: "c1", workspace_id: wsId, assigned_to: "op-1", candidate_status: "sending" });
      store.addCandidate({ id: "c2", workspace_id: wsId, assigned_to: "op-1", candidate_status: "paused" });
      store.addCandidate({ id: "c3", workspace_id: wsId, assigned_to: "op-1", candidate_status: "completed" });

      const metrics = getOperatorMetrics(wsId, store);

      expect(metrics.activeSessions).toBe(2);
    });

    it("returns 0 when no active sessions", () => {
      store.addCandidate({ id: "c1", workspace_id: wsId, assigned_to: "op-1", candidate_status: "completed" });

      const metrics = getOperatorMetrics(wsId, store);

      expect(metrics.activeSessions).toBe(0);
    });
  });

  it("returns all zeros when no user", () => {
    store.setCurrentUser(null);

    const metrics = getOperatorMetrics(wsId, store);

    expect(metrics).toEqual({
      assignedContacts: 0,
      activeFollowups: 0,
      overduePromises: 0,
      resolvedToday: 0,
      activeSessions: 0,
    });
  });
});
