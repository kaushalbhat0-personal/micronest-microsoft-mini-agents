import { describe, it, expect } from "vitest";

type WorkspaceRole = "admin" | "operator" | "viewer";

type WorkspaceAction =
  | "view"
  | "update"
  | "manage_team"
  | "delete_workspace"
  | "invite_member"
  | "remove_member"
  | "rename_workspace";

const ROLE_PERMISSIONS: Record<WorkspaceRole, WorkspaceAction[]> = {
  admin: ["view", "update", "manage_team", "delete_workspace", "invite_member", "remove_member", "rename_workspace"],
  operator: ["view", "update"],
  viewer: ["view"],
};

function canPerformAction(role: WorkspaceRole | null, action: WorkspaceAction): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role].includes(action);
}

function isAdmin(role: WorkspaceRole | null): boolean {
  return role === "admin";
}

function getRolePermissions(role: WorkspaceRole | null): WorkspaceAction[] {
  if (!role) return [];
  return ROLE_PERMISSIONS[role];
}

describe("workspace-permissions", () => {
  describe("Admin can perform any action", () => {
    const actions: WorkspaceAction[] = [
      "view",
      "update",
      "manage_team",
      "delete_workspace",
      "invite_member",
      "remove_member",
      "rename_workspace",
    ];

    for (const action of actions) {
      it(`allows admin to ${action}`, () => {
        expect(canPerformAction("admin", action)).toBe(true);
      });
    }
  });

  describe("Operator can view and update but not manage team", () => {
    it("allows operator to view", () => {
      expect(canPerformAction("operator", "view")).toBe(true);
    });

    it("allows operator to update", () => {
      expect(canPerformAction("operator", "update")).toBe(true);
    });

    it("denies operator to manage_team", () => {
      expect(canPerformAction("operator", "manage_team")).toBe(false);
    });

    it("denies operator to invite_member", () => {
      expect(canPerformAction("operator", "invite_member")).toBe(false);
    });

    it("denies operator to remove_member", () => {
      expect(canPerformAction("operator", "remove_member")).toBe(false);
    });

    it("denies operator to delete_workspace", () => {
      expect(canPerformAction("operator", "delete_workspace")).toBe(false);
    });
  });

  describe("Viewer can only view", () => {
    it("allows viewer to view", () => {
      expect(canPerformAction("viewer", "view")).toBe(true);
    });

    it("denies viewer to update", () => {
      expect(canPerformAction("viewer", "update")).toBe(false);
    });

    it("denies viewer to manage_team", () => {
      expect(canPerformAction("viewer", "manage_team")).toBe(false);
    });
  });

  describe("isAdmin", () => {
    it("returns true for admin role", () => {
      expect(isAdmin("admin")).toBe(true);
    });

    it("returns false for operator role", () => {
      expect(isAdmin("operator")).toBe(false);
    });

    it("returns false for viewer role", () => {
      expect(isAdmin("viewer")).toBe(false);
    });
  });

  describe("Unauthorized user has no permissions", () => {
    const actions: WorkspaceAction[] = [
      "view",
      "update",
      "manage_team",
      "delete_workspace",
      "invite_member",
      "remove_member",
      "rename_workspace",
    ];

    for (const action of actions) {
      it(`denies null role to ${action}`, () => {
        expect(canPerformAction(null, action)).toBe(false);
      });
    }

    it("isAdmin returns false for null role", () => {
      expect(isAdmin(null)).toBe(false);
    });

    it("getRolePermissions returns empty array for null role", () => {
      expect(getRolePermissions(null)).toEqual([]);
    });
  });
});
