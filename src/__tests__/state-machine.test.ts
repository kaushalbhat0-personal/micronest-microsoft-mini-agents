import { describe, it, expect } from "vitest";
import { canTransition, getAvailableTransitions, getEventTypeForTransition } from "@/features/followups/services/state-machine";
import type { LifecycleStatus } from "@/features/followups/types";

const ALL_STATUSES: LifecycleStatus[] = ["pending", "opened", "contacted", "responded", "promised", "resolved", "dismissed", "ignored"];

describe("state-machine", () => {
  describe("canTransition", () => {
    it("allows pending → opened", () => {
      expect(canTransition("pending", "opened")).toBe(true);
    });

    it("allows pending → contacted", () => {
      expect(canTransition("pending", "contacted")).toBe(true);
    });

    it("allows pending → dismissed", () => {
      expect(canTransition("pending", "dismissed")).toBe(true);
    });

    it("allows pending → ignored", () => {
      expect(canTransition("pending", "ignored")).toBe(true);
    });

    it("allows opened → contacted", () => {
      expect(canTransition("opened", "contacted")).toBe(true);
    });

    it("allows opened → responded", () => {
      expect(canTransition("opened", "responded")).toBe(true);
    });

    it("allows opened → promised", () => {
      expect(canTransition("opened", "promised")).toBe(true);
    });

    it("allows opened → resolved", () => {
      expect(canTransition("opened", "resolved")).toBe(true);
    });

    it("allows opened → dismissed", () => {
      expect(canTransition("opened", "dismissed")).toBe(true);
    });

    it("allows opened → ignored", () => {
      expect(canTransition("opened", "ignored")).toBe(true);
    });

    it("allows contacted → responded", () => {
      expect(canTransition("contacted", "responded")).toBe(true);
    });

    it("allows contacted → promised", () => {
      expect(canTransition("contacted", "promised")).toBe(true);
    });

    it("allows contacted → resolved", () => {
      expect(canTransition("contacted", "resolved")).toBe(true);
    });

    it("allows contacted → dismissed", () => {
      expect(canTransition("contacted", "dismissed")).toBe(true);
    });

    it("allows contacted → ignored", () => {
      expect(canTransition("contacted", "ignored")).toBe(true);
    });

    it("allows responded → promised", () => {
      expect(canTransition("responded", "promised")).toBe(true);
    });

    it("allows responded → resolved", () => {
      expect(canTransition("responded", "resolved")).toBe(true);
    });

    it("allows responded → dismissed", () => {
      expect(canTransition("responded", "dismissed")).toBe(true);
    });

    it("allows responded → ignored", () => {
      expect(canTransition("responded", "ignored")).toBe(true);
    });

    it("allows promised → resolved", () => {
      expect(canTransition("promised", "resolved")).toBe(true);
    });

    it("allows promised → dismissed", () => {
      expect(canTransition("promised", "dismissed")).toBe(true);
    });

    it("allows promised → ignored", () => {
      expect(canTransition("promised", "ignored")).toBe(true);
    });

    it("prevents all transitions from resolved terminal state", () => {
      for (const status of ALL_STATUSES) {
        expect(canTransition("resolved", status)).toBe(false);
      }
    });

    it("prevents all transitions from dismissed terminal state", () => {
      for (const status of ALL_STATUSES) {
        expect(canTransition("dismissed", status)).toBe(false);
      }
    });

    it("prevents all transitions from ignored terminal state", () => {
      for (const status of ALL_STATUSES) {
        expect(canTransition("ignored", status)).toBe(false);
      }
    });

    it("prevents jumping to resolved from pending", () => {
      expect(canTransition("pending", "resolved")).toBe(false);
    });

    it("prevents jumping to promised from pending", () => {
      expect(canTransition("pending", "promised")).toBe(false);
    });

    it("prevents jumping to responded from pending", () => {
      expect(canTransition("pending", "responded")).toBe(false);
    });

    it("prevents moving backward from terminal states", () => {
      expect(canTransition("resolved", "promised")).toBe(false);
      expect(canTransition("dismissed", "contacted")).toBe(false);
      expect(canTransition("ignored", "pending")).toBe(false);
    });

    it("prevents self-transitions from every state", () => {
      for (const status of ALL_STATUSES) {
        expect(canTransition(status, status)).toBe(false);
      }
    });

    it("rejects unknown status values", () => {
      expect(canTransition("invalid" as LifecycleStatus, "resolved" as LifecycleStatus)).toBe(false);
      expect(canTransition("pending" as LifecycleStatus, "invalid" as LifecycleStatus)).toBe(false);
    });

    it("returns false for undefined/null transitions", () => {
      expect(canTransition(undefined as unknown as LifecycleStatus, "resolved")).toBe(false);
      expect(canTransition("pending", undefined as unknown as LifecycleStatus)).toBe(false);
    });
  });

  describe("getAvailableTransitions", () => {
    it("returns correct transitions for pending", () => {
      const transitions = getAvailableTransitions("pending");
      expect(transitions).toEqual(["opened", "contacted", "dismissed", "ignored"]);
    });

    it("returns correct transitions for opened", () => {
      const transitions = getAvailableTransitions("opened");
      expect(transitions).toEqual(["contacted", "responded", "promised", "resolved", "dismissed", "ignored"]);
    });

    it("returns correct transitions for contacted", () => {
      const transitions = getAvailableTransitions("contacted");
      expect(transitions).toEqual(["responded", "promised", "resolved", "dismissed", "ignored"]);
    });

    it("returns correct transitions for responded", () => {
      const transitions = getAvailableTransitions("responded");
      expect(transitions).toEqual(["promised", "resolved", "dismissed", "ignored"]);
    });

    it("returns correct transitions for promised", () => {
      const transitions = getAvailableTransitions("promised");
      expect(transitions).toEqual(["resolved", "dismissed", "ignored"]);
    });

    it("returns empty array for resolved terminal state", () => {
      expect(getAvailableTransitions("resolved")).toEqual([]);
    });

    it("returns empty array for dismissed terminal state", () => {
      expect(getAvailableTransitions("dismissed")).toEqual([]);
    });

    it("returns empty array for ignored terminal state", () => {
      expect(getAvailableTransitions("ignored")).toEqual([]);
    });

    it("returns empty array for unknown status", () => {
      expect(getAvailableTransitions("invalid" as LifecycleStatus)).toEqual([]);
    });
  });

  describe("getEventTypeForTransition", () => {
    it("returns followup_dismissed for → dismissed", () => {
      expect(getEventTypeForTransition("pending", "dismissed")).toBe("followup_dismissed");
      expect(getEventTypeForTransition("contacted", "dismissed")).toBe("followup_dismissed");
    });

    it("returns marked_ignored for → ignored", () => {
      expect(getEventTypeForTransition("pending", "ignored")).toBe("marked_ignored");
      expect(getEventTypeForTransition("opened", "ignored")).toBe("marked_ignored");
    });

    it("returns marked_resolved for → resolved", () => {
      expect(getEventTypeForTransition("contacted", "resolved")).toBe("marked_resolved");
      expect(getEventTypeForTransition("promised", "resolved")).toBe("marked_resolved");
    });

    it("returns followup_contacted for → contacted", () => {
      expect(getEventTypeForTransition("pending", "contacted")).toBe("followup_contacted");
      expect(getEventTypeForTransition("opened", "contacted")).toBe("followup_contacted");
    });

    it("returns customer_responded for → responded", () => {
      expect(getEventTypeForTransition("contacted", "responded")).toBe("customer_responded");
      expect(getEventTypeForTransition("opened", "responded")).toBe("customer_responded");
    });

    it("returns payment_promised for → promised", () => {
      expect(getEventTypeForTransition("contacted", "promised")).toBe("payment_promised");
      expect(getEventTypeForTransition("responded", "promised")).toBe("payment_promised");
    });

    it("returns whatsapp_opened for → opened", () => {
      expect(getEventTypeForTransition("pending", "opened")).toBe("whatsapp_opened");
    });

    it("returns null for invalid transitions", () => {
      expect(getEventTypeForTransition("pending", "pending")).toBeNull();
      expect(getEventTypeForTransition("invalid" as LifecycleStatus, "resolved")).toBeNull();
    });

    it("returns null for transitions that don't map to events", () => {
      expect(getEventTypeForTransition("pending", "pending")).toBeNull();
    });
  });
});
