import { vi } from "vitest";

export function createMockSupabase() {
  const chainableMock = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    then: vi.fn(),
  };

  const mockClient = {
    from: vi.fn(() => chainableMock),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "test-user" } }, error: null }),
      getSession: vi.fn(),
    },
    rpc: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
  };

  return { mockClient, chainableMock };
}

export function setupSupabaseMockResolvedValue(chainableMock: ReturnType<typeof createMockSupabase>["chainableMock"], value: unknown) {
  chainableMock.then.mockImplementation((cb: (v: unknown) => void) => {
    return Promise.resolve(cb({ data: value, error: null }));
  });
}

export function setupSupabaseMockError(chainableMock: ReturnType<typeof createMockSupabase>["chainableMock"], error: string) {
  chainableMock.then.mockImplementation(() => {
    return Promise.reject(new Error(error));
  });
}
