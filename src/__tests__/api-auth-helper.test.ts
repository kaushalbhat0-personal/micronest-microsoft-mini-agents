import { describe, it, expect, beforeAll } from "vitest";

interface TestUser {
  id: string;
  email: string;
}

function validateApiRouteAuth(
  headers: Record<string, string>,
  validTokens: Map<string, TestUser>
): { user: TestUser } | null {
  const authHeader = headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  if (!token) return null;

  const user = validTokens.get(token);
  if (!user) return null;

  return { user };
}

describe("api auth helper", () => {
  const validTokens = new Map<string, TestUser>();
  const user: TestUser = { id: "user-1", email: "test@test.com" };

  beforeAll(() => {
    validTokens.set("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.valid-token", user);
  });

  describe("validateApiRouteAuth", () => {
    it("valid Bearer token is accepted", () => {
      const result = validateApiRouteAuth(
        { authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.valid-token" },
        validTokens
      );
      expect(result).not.toBeNull();
      expect(result!.user.id).toBe("user-1");
      expect(result!.user.email).toBe("test@test.com");
    });

    it("missing Authorization header returns null", () => {
      const result = validateApiRouteAuth({}, validTokens);
      expect(result).toBeNull();
    });

    it("invalid token format (not Bearer) returns null", () => {
      const result = validateApiRouteAuth(
        { authorization: "Basic dXNlcjpwYXNz" },
        validTokens
      );
      expect(result).toBeNull();
    });

    it("empty token returns null", () => {
      const result = validateApiRouteAuth(
        { authorization: "Bearer " },
        validTokens
      );
      expect(result).toBeNull();
    });

    it("malformed token is rejected", () => {
      const result = validateApiRouteAuth(
        { authorization: "Bearer " },
        validTokens
      );
      expect(result).toBeNull();
    });

    it("Bearer in wrong case is rejected", () => {
      const result = validateApiRouteAuth(
        { authorization: "bearer some-token" },
        validTokens
      );
      expect(result).toBeNull();
    });

    it("unknown token is rejected", () => {
      const result = validateApiRouteAuth(
        { authorization: "Bearer unknown-token" },
        validTokens
      );
      expect(result).toBeNull();
    });
  });
});
