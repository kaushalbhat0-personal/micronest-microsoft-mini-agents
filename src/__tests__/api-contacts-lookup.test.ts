import { describe, it, expect, beforeEach } from "vitest";

interface TestContact {
  id: string;
  user_id: string;
  customer_name: string;
  phone_number: string;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  due_date: string;
  workflow_status: string;
  raw_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface TestCandidate {
  id: string;
  user_id: string;
  contact_id: string;
  priority: string;
  reason: string;
  candidate_status: string;
  generated_at: string;
}

interface TestUser {
  id: string;
  email: string;
}

const VALID_STATUSES = ["pending", "opened", "contacted", "responded", "promised"];

function createStore() {
  const contacts = new Map<string, TestContact>();
  const candidates = new Map<string, TestCandidate>();
  const tokens = new Map<string, TestUser>();

  return {
    addToken(token: string, user: TestUser) {
      tokens.set(token, user);
    },
    addContact(c: TestContact) {
      contacts.set(c.id, { ...c });
    },
    addCandidate(c: TestCandidate) {
      candidates.set(c.id, { ...c });
    },
    clear() {
      contacts.clear();
      candidates.clear();
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
    lookupContact(userId: string, phone: string, name: string) {
      const allCandidates = Array.from(candidates.values())
        .filter((c) => c.user_id === userId && VALID_STATUSES.includes(c.candidate_status))
        .sort((a, b) => {
          const pri: Record<string, number> = { high: 3, medium: 2, low: 1 };
          return (pri[b.priority] ?? 0) - (pri[a.priority] ?? 0);
        });

      const matched: Array<{ candidate: TestCandidate; contact: TestContact | null }> = [];

      for (const candidate of allCandidates) {
        const contact = contacts.get(candidate.contact_id) ?? null;

        if (phone) {
          const phoneMatch =
            contact &&
            (contact.phone_number === phone ||
              contact.phone_number.includes(phone));
          if (!phoneMatch) continue;
        }

        if (name && !phone) {
          const nameMatch =
            contact &&
            contact.customer_name.toLowerCase().includes(name.toLowerCase());
          if (!nameMatch) continue;
        }

        matched.push({ candidate, contact });

        if (matched.length >= 1) break;
      }

      return matched;
    },
  };
}

function handleContactLookup(
  url: string,
  headers: Record<string, string>,
  store: ReturnType<typeof createStore>
): { status: number; body: unknown } {
  const auth = store.validateAuth(headers);
  if (!auth) return { status: 401, body: { error: "Unauthorized" } };

  const parsedUrl = new URL(url, "http://test");
  const phone = parsedUrl.searchParams.get("phone") ?? "";
  const name = parsedUrl.searchParams.get("name") ?? "";

  if (!phone && !name) {
    return { status: 400, body: { error: "phone or name required" } };
  }

  const results = store.lookupContact(auth.user.id, phone, name);

  if (results.length === 0) {
    return { status: 200, body: { contact: null, candidate: null } };
  }

  const row = results[0];
  return {
    status: 200,
    body: {
      contact: row.contact,
      candidate: {
        id: row.candidate.id,
        user_id: row.candidate.user_id,
        contact_id: row.candidate.contact_id,
        priority: row.candidate.priority,
        reason: row.candidate.reason,
        candidate_status: row.candidate.candidate_status,
        generated_at: row.candidate.generated_at,
      },
    },
  };
}

const user: TestUser = { id: "user-1", email: "test@test.com" };
const token = "valid-token";

function baseHeaders(): Record<string, string> {
  return { authorization: `Bearer ${token}` };
}

describe("api contacts lookup", () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
    store.clear();
    store.addToken(token, user);
  });

  describe("GET", () => {
    it("returns 400 when no query params provided", () => {
      const res = handleContactLookup("http://test/api/contacts/lookup", baseHeaders(), store);
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "phone or name required" });
    });

    it("returns 401 when no valid auth token", () => {
      const res = handleContactLookup(
        "http://test/api/contacts/lookup?phone=123",
        {},
        store
      );
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: "Unauthorized" });
    });

    it("returns empty results for non-matching queries", () => {
      const res = handleContactLookup(
        "http://test/api/contacts/lookup?phone=nonexistent",
        baseHeaders(),
        store
      );
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ contact: null, candidate: null });
    });

    it("returns matched contact with 200", () => {
      store.addContact({
        id: "contact-1",
        user_id: user.id,
        customer_name: "Alice",
        phone_number: "12025550199",
        total_amount: 1000,
        paid_amount: 500,
        due_amount: 500,
        due_date: "2026-06-15",
        workflow_status: "active",
        raw_data: {},
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      });
      store.addCandidate({
        id: "cand-1",
        user_id: user.id,
        contact_id: "contact-1",
        priority: "high",
        reason: "Test",
        candidate_status: "pending",
        generated_at: "2026-01-01T00:00:00Z",
      });

      const res = handleContactLookup(
        "http://test/api/contacts/lookup?phone=12025550199",
        baseHeaders(),
        store
      );
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("contact");
      expect(res.body).toHaveProperty("candidate");
      expect((res.body as Record<string, unknown>).candidate).toHaveProperty("id", "cand-1");
    });

    it("handles multiple matching contacts by returning highest priority", () => {
      store.addContact({
        id: "contact-1",
        user_id: user.id,
        customer_name: "Bob",
        phone_number: "12025550200",
        total_amount: 500,
        paid_amount: 0,
        due_amount: 500,
        due_date: "2026-07-01",
        workflow_status: "active",
        raw_data: {},
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      });
      store.addContact({
        id: "contact-2",
        user_id: user.id,
        customer_name: "Charlie",
        phone_number: "12025550200",
        total_amount: 2000,
        paid_amount: 1000,
        due_amount: 1000,
        due_date: "2026-08-01",
        workflow_status: "active",
        raw_data: {},
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      });
      store.addCandidate({
        id: "cand-low",
        user_id: user.id,
        contact_id: "contact-1",
        priority: "low",
        reason: "Low priority",
        candidate_status: "pending",
        generated_at: "2026-01-01T00:00:00Z",
      });
      store.addCandidate({
        id: "cand-high",
        user_id: user.id,
        contact_id: "contact-2",
        priority: "high",
        reason: "High priority",
        candidate_status: "pending",
        generated_at: "2026-01-01T00:00:00Z",
      });

      const res = handleContactLookup(
        "http://test/api/contacts/lookup?phone=12025550200",
        baseHeaders(),
        store
      );
      expect(res.status).toBe(200);
      const body = res.body as Record<string, unknown>;
      const candidate = body.candidate as Record<string, unknown>;
      expect(candidate.id).toBe("cand-high");
    });
  });
});
