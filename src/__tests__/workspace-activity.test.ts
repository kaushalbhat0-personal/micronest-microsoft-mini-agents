import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

interface TestWorkspaceActivity {
  id: string;
  workspace_id: string;
  actor_id: string;
  activity_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
  actor_name?: string;
}

interface TestUser {
  id: string;
  email: string;
}

function createActivityStore() {
  const activities = new Map<string, TestWorkspaceActivity>();
  let nextId = 1;

  return {
    add(a: TestWorkspaceActivity) {
      activities.set(a.id, { ...a });
    },
    getAll() {
      return Array.from(activities.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
    nextId() {
      return `activity-${nextId++}`;
    },
    clear() {
      activities.clear();
      nextId = 1;
    },
  };
}

function createUserStore() {
  const users = new Map<string, TestUser>();
  return {
    add(id: string, email: string) {
      users.set(id, { id, email });
    },
    get(id: string) {
      return users.get(id) ?? null;
    },
  };
}

function logActivity(
  currentUser: TestUser | null,
  workspaceId: string,
  activityType: string,
  metadata: Record<string, unknown>,
  activityStore: ReturnType<typeof createActivityStore>
): void {
  if (!currentUser) return;

  activityStore.add({
    id: activityStore.nextId(),
    workspace_id: workspaceId,
    actor_id: currentUser.id,
    activity_type: activityType,
    metadata,
    created_at: new Date().toISOString(),
  });
}

function getWorkspaceFeed(
  workspaceId: string,
  limit: number,
  activityStore: ReturnType<typeof createActivityStore>,
  userStore: ReturnType<typeof createUserStore>
): TestWorkspaceActivity[] {
  const filtered = activityStore
    .getAll()
    .filter((a) => a.workspace_id === workspaceId)
    .slice(0, limit);

  return filtered.map((a) => {
    const user = userStore.get(a.actor_id);
    return { ...a, actor_name: user?.email ?? "Unknown" };
  });
}

const userA: TestUser = { id: "actor-1", email: "op1@test.com" };
const userB: TestUser = { id: "actor-2", email: "op2@test.com" };

describe("workspace-activity", () => {
  let activityStore: ReturnType<typeof createActivityStore>;
  let userStore: ReturnType<typeof createUserStore>;

  beforeEach(() => {
    vi.useFakeTimers();
    activityStore = createActivityStore();
    activityStore.clear();
    userStore = createUserStore();
    userStore.add(userA.id, userA.email);
    userStore.add(userB.id, userB.email);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("logActivity", () => {
    it("creates activity entry with correct fields", () => {
      const before = Date.now();

      logActivity(userA, "ws-1", "contact_assigned", { contactId: "ct-1" }, activityStore);

      const all = activityStore.getAll();
      expect(all).toHaveLength(1);
      const entry = all[0];
      expect(entry.id).toBeTruthy();
      expect(entry.workspace_id).toBe("ws-1");
      expect(entry.actor_id).toBe("actor-1");
      expect(entry.activity_type).toBe("contact_assigned");
      expect(entry.metadata).toEqual({ contactId: "ct-1" });
      const createdAt = new Date(entry.created_at).getTime();
      expect(createdAt).toBeGreaterThanOrEqual(before);
      expect(createdAt).toBeLessThanOrEqual(Date.now());
    });

    it("stores actor_id, workspace_id, activity_type, metadata", () => {
      const metadata = { foo: "bar", count: 42 };

      logActivity(userA, "ws-1", "member_invited", metadata, activityStore);

      const entry = activityStore.getAll()[0];
      expect(entry.actor_id).toBe("actor-1");
      expect(entry.workspace_id).toBe("ws-1");
      expect(entry.activity_type).toBe("member_invited");
      expect(entry.metadata).toEqual(metadata);
    });

    it("handles missing user (no actor)", () => {
      logActivity(null, "ws-1", "some_event", {}, activityStore);

      expect(activityStore.getAll()).toHaveLength(0);
    });
  });

  describe("getWorkspaceFeed", () => {
    it("returns activities in reverse chronological order", () => {
      logActivity(userA, "ws-1", "first", {}, activityStore);
      vi.advanceTimersByTime(1000);
      logActivity(userB, "ws-1", "second", {}, activityStore);
      vi.advanceTimersByTime(1000);
      logActivity(userA, "ws-1", "third", {}, activityStore);

      const feed = getWorkspaceFeed("ws-1", 10, activityStore, userStore);

      expect(feed).toHaveLength(3);
      expect(feed[0].activity_type).toBe("third");
      expect(feed[1].activity_type).toBe("second");
      expect(feed[2].activity_type).toBe("first");
    });

    it("respects limit parameter", () => {
      for (let i = 0; i < 10; i++) {
        logActivity(userA, "ws-1", `event-${i}`, {}, activityStore);
      }

      const feed = getWorkspaceFeed("ws-1", 3, activityStore, userStore);

      expect(feed).toHaveLength(3);
    });

    it("returns empty array for empty workspace", () => {
      const feed = getWorkspaceFeed("ws-empty", 10, activityStore, userStore);
      expect(feed).toEqual([]);
    });

    it("populates actor_name from user email", () => {
      logActivity(userA, "ws-1", "test", {}, activityStore);

      const feed = getWorkspaceFeed("ws-1", 10, activityStore, userStore);

      expect(feed[0].actor_name).toBe("op1@test.com");
    });

    it("uses Unknown for missing actor in user store", () => {
      activityStore.add({
        id: "orphan",
        workspace_id: "ws-1",
        actor_id: "nonexistent",
        activity_type: "test",
        metadata: {},
        created_at: new Date().toISOString(),
      });

      const feed = getWorkspaceFeed("ws-1", 10, activityStore, userStore);

      expect(feed[0].actor_name).toBe("Unknown");
    });
  });
});
