import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

const LOCK_DURATION_MS = 30000;

interface TestContactLock {
  id: string;
  contact_id: string;
  locked_by: string;
  workspace_id: string;
  acquired_at: string;
  expires_at: string;
  locked_by_name?: string;
}

interface TestUser {
  id: string;
  email: string;
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

function createLockStore() {
  const locks = new Map<string, TestContactLock>();
  let nextId = 1;
  return {
    add(lock: TestContactLock) {
      locks.set(lock.id, { ...lock });
    },
    getAll() {
      return Array.from(locks.values());
    },
    findActiveByContact(contactId: string) {
      for (const lock of locks.values()) {
        if (lock.contact_id === contactId && new Date(lock.expires_at) > new Date()) {
          return lock;
        }
      }
      return null;
    },
    findAnyByContact(contactId: string) {
      for (const lock of locks.values()) {
        if (lock.contact_id === contactId) return lock;
      }
      return null;
    },
    delete(id: string) {
      locks.delete(id);
    },
    deleteByContactAndUser(contactId: string, userId: string) {
      for (const [id, lock] of locks.entries()) {
        if (lock.contact_id === contactId && lock.locked_by === userId) {
          locks.delete(id);
        }
      }
    },
    nextId() {
      return `lock-${nextId++}`;
    },
    clear() {
      locks.clear();
      nextId = 1;
    },
  };
}

function acquireLock(
  currentUser: TestUser | null,
  contactId: string,
  workspaceId: string,
  lockStore: ReturnType<typeof createLockStore>
): { success: boolean; lock?: TestContactLock; error?: string } {
  if (!currentUser) return { success: false, error: "Unauthorized" };

  const existing = lockStore.findActiveByContact(contactId);

  if (existing && existing.locked_by !== currentUser.id) {
    return { success: false, error: "Contact is currently being handled by another operator" };
  }

  if (existing && existing.locked_by === currentUser.id) {
    const renewed: TestContactLock = {
      ...existing,
      expires_at: new Date(Date.now() + LOCK_DURATION_MS).toISOString(),
    };
    lockStore.add(renewed);
    return { success: true, lock: renewed };
  }

  const lock: TestContactLock = {
    id: lockStore.nextId(),
    contact_id: contactId,
    locked_by: currentUser.id,
    workspace_id: workspaceId,
    acquired_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + LOCK_DURATION_MS).toISOString(),
  };
  lockStore.add(lock);
  return { success: true, lock };
}

function releaseLock(
  currentUser: TestUser | null,
  contactId: string,
  lockStore: ReturnType<typeof createLockStore>
): void {
  if (!currentUser) return;
  lockStore.deleteByContactAndUser(contactId, currentUser.id);
}

function checkLock(
  contactId: string,
  lockStore: ReturnType<typeof createLockStore>,
  userStore: ReturnType<typeof createUserStore>
): TestContactLock | null {
  const lock = lockStore.findActiveByContact(contactId);
  if (!lock) return null;
  const user = userStore.get(lock.locked_by);
  return { ...lock, locked_by_name: user?.email ?? "Unknown" };
}

function renewLock(
  currentUser: TestUser | null,
  contactId: string,
  lockStore: ReturnType<typeof createLockStore>
): boolean {
  if (!currentUser) return false;
  const lock = lockStore.findAnyByContact(contactId);
  if (!lock) return false;
  if (lock.locked_by !== currentUser.id) return false;
  const updated = { ...lock, expires_at: new Date(Date.now() + LOCK_DURATION_MS).toISOString() };
  lockStore.add(updated);
  return true;
}

function cleanupExpiredLocks(
  workspaceId: string,
  lockStore: ReturnType<typeof createLockStore>
): void {
  for (const lock of lockStore.getAll()) {
    if (lock.workspace_id === workspaceId && new Date(lock.expires_at) <= new Date()) {
      lockStore.delete(lock.id);
    }
  }
}

const user1: TestUser = { id: "user-1", email: "alice@test.com" };
const user2: TestUser = { id: "user-2", email: "bob@test.com" };

describe("contact-lock", () => {
  let lockStore: ReturnType<typeof createLockStore>;
  let userStore: ReturnType<typeof createUserStore>;

  beforeEach(() => {
    vi.useFakeTimers();
    lockStore = createLockStore();
    lockStore.clear();
    userStore = createUserStore();
    userStore.add(user1.id, user1.email);
    userStore.add(user2.id, user2.email);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("acquireLock", () => {
    it("returns lock with 30s TTL when contact is not locked", () => {
      const before = Date.now();
      const result = acquireLock(user1, "contact-1", "ws-1", lockStore);
      const after = Date.now();

      expect(result.success).toBe(true);
      expect(result.lock).toBeDefined();
      expect(result.lock!.contact_id).toBe("contact-1");
      expect(result.lock!.locked_by).toBe("user-1");
      expect(result.lock!.workspace_id).toBe("ws-1");
      const expiresAt = new Date(result.lock!.expires_at).getTime();
      expect(expiresAt - before).toBeGreaterThanOrEqual(25000);
      expect(expiresAt - after).toBeLessThanOrEqual(35000);
    });

    it("returns error when contact is locked by another user", () => {
      acquireLock(user1, "contact-1", "ws-1", lockStore);
      const result = acquireLock(user2, "contact-1", "ws-1", lockStore);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Contact is currently being handled by another operator");
    });

    it("renews lock when same user re-acquires", () => {
      const first = acquireLock(user1, "contact-1", "ws-1", lockStore);
      const originalExpiresAt = first.lock!.expires_at;

      vi.advanceTimersByTime(5000);
      const result = acquireLock(user1, "contact-1", "ws-1", lockStore);

      expect(result.success).toBe(true);
      expect(result.lock!.id).toBe(first.lock!.id);
      expect(result.lock!.expires_at).not.toBe(originalExpiresAt);
      expect(new Date(result.lock!.expires_at).getTime()).toBeGreaterThan(new Date(originalExpiresAt).getTime());
    });
  });

  describe("releaseLock", () => {
    it("removes only the caller's lock for the contact", () => {
      acquireLock(user1, "contact-1", "ws-1", lockStore);
      acquireLock(user2, "contact-2", "ws-1", lockStore);

      releaseLock(user1, "contact-1", lockStore);

      expect(lockStore.findActiveByContact("contact-1")).toBeNull();
      expect(lockStore.findActiveByContact("contact-2")).not.toBeNull();
    });
  });

  describe("checkLock", () => {
    it("returns lock info when contact is locked", () => {
      acquireLock(user1, "contact-1", "ws-1", lockStore);

      const result = checkLock("contact-1", lockStore, userStore);

      expect(result).not.toBeNull();
      expect(result!.contact_id).toBe("contact-1");
      expect(result!.locked_by).toBe("user-1");
    });

    it("returns null when contact is not locked", () => {
      const result = checkLock("contact-nonexistent", lockStore, userStore);
      expect(result).toBeNull();
    });

    it("returns locked_by_name from user email", () => {
      acquireLock(user1, "contact-1", "ws-1", lockStore);

      const result = checkLock("contact-1", lockStore, userStore);

      expect(result!.locked_by_name).toBe("alice@test.com");
    });

    it("returns null for expired lock", () => {
      lockStore.add({
        id: "expired-lock",
        contact_id: "contact-expired",
        locked_by: user1.id,
        workspace_id: "ws-1",
        acquired_at: new Date(Date.now() - 60000).toISOString(),
        expires_at: new Date(Date.now() - 1000).toISOString(),
      });

      const result = checkLock("contact-expired", lockStore, userStore);
      expect(result).toBeNull();
    });
  });

  describe("renewLock", () => {
    it("extends expires_at by 30s", () => {
      acquireLock(user1, "contact-1", "ws-1", lockStore);
      const before = Date.now();

      const result = renewLock(user1, "contact-1", lockStore);

      expect(result).toBe(true);
      const lock = lockStore.findActiveByContact("contact-1");
      expect(new Date(lock!.expires_at).getTime() - before).toBeGreaterThanOrEqual(25000);
    });

    it("returns false for non-existent lock", () => {
      const result = renewLock(user1, "contact-nonexistent", lockStore);
      expect(result).toBe(false);
    });
  });

  describe("cleanupExpiredLocks", () => {
    it("removes all expired locks for the workspace", () => {
      lockStore.add({
        id: "expired-1",
        contact_id: "c1",
        locked_by: user1.id,
        workspace_id: "ws-1",
        acquired_at: new Date(Date.now() - 60000).toISOString(),
        expires_at: new Date(Date.now() - 1000).toISOString(),
      });
      lockStore.add({
        id: "expired-2",
        contact_id: "c2",
        locked_by: user2.id,
        workspace_id: "ws-1",
        acquired_at: new Date(Date.now() - 60000).toISOString(),
        expires_at: new Date(Date.now() - 1000).toISOString(),
      });
      acquireLock(user1, "contact-active", "ws-1", lockStore);

      cleanupExpiredLocks("ws-1", lockStore);

      expect(lockStore.findAnyByContact("c1")).toBeNull();
      expect(lockStore.findAnyByContact("c2")).toBeNull();
      expect(lockStore.findActiveByContact("contact-active")).not.toBeNull();
    });
  });

  describe("Edge cases", () => {
    it("releaseLock for non-existent lock does nothing", () => {
      expect(() => releaseLock(user1, "nonexistent", lockStore)).not.toThrow();
    });

    it("acquireLock for expired lock succeeds (old lock cleaned up)", () => {
      lockStore.add({
        id: "old-expired",
        contact_id: "contact-expired",
        locked_by: user2.id,
        workspace_id: "ws-1",
        acquired_at: new Date(Date.now() - 60000).toISOString(),
        expires_at: new Date(Date.now() - 1000).toISOString(),
      });

      const result = acquireLock(user1, "contact-expired", "ws-1", lockStore);

      expect(result.success).toBe(true);
      expect(result.lock!.locked_by).toBe("user-1");
    });
  });
});
