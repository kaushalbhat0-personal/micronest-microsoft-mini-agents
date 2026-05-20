import { describe, it, expect, beforeEach } from "vitest";

interface TestUser {
  id: string;
  email: string;
}

function createStore() {
  const tokens = new Map<string, TestUser>();

  return {
    addToken(token: string, user: TestUser) {
      tokens.set(token, user);
    },
    clear() {
      tokens.clear();
    },
    validateAuth(headers: Record<string, string>): { user: TestUser } | null {
      const authHeader = headers["authorization"];
      if (!authHeader?.startsWith("Bearer ")) return null;
      const token = authHeader.slice(7);
      if (!token) return null;
      const user = tokens.get(token);
      if (!user) return null;
      return { user };
    },
  };
}

function handleStatusGet(
  headers: Record<string, string>,
  store: ReturnType<typeof createStore>
): { status: number; body: unknown } {
  const auth = store.validateAuth(headers);
  if (!auth) return { status: 401, body: { error: "Unauthorized" } };

  return {
    status: 200,
    body: {
      user: { id: auth.user.id, email: auth.user.email },
      timestamp: new Date().toISOString(),
    },
  };
}

const user: TestUser = { id: "user-1", email: "test@test.com" };
const token = "valid-token";

function baseHeaders(): Record<string, string> {
  return { authorization: `Bearer ${token}` };
}

describe("api status", () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
    store.clear();
    store.addToken(token, user);
  });

  describe("GET", () => {
    it("returns current status info", () => {
      const before = Date.now();
      const res = handleStatusGet(baseHeaders(), store);
      const after = Date.now();

      expect(res.status).toBe(200);
      const body = res.body as Record<string, unknown>;
      expect(body).toHaveProperty("user");
      expect(body).toHaveProperty("timestamp");

      const userInfo = body.user as Record<string, unknown>;
      expect(userInfo.id).toBe("user-1");
      expect(userInfo.email).toBe("test@test.com");

      const ts = new Date(body.timestamp as string).getTime();
      expect(ts).toBeGreaterThanOrEqual(before);
      expect(ts).toBeLessThanOrEqual(after);
    });

    it("returns 401 without auth", () => {
      const res = handleStatusGet({}, store);
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: "Unauthorized" });
    });
  });
});
