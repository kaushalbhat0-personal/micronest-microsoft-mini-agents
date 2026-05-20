import { describe, it, expect } from "vitest";
import {
  classifyFailure,
  isRetryable,
  FailureCategory,
  MAX_RETRIES,
} from "@extension/shared/failure-types";

describe("failure-types", () => {
  describe("classifyFailure", () => {
    it("classifies INVALID_NUMBER when phone is too short", () => {
      const result = classifyFailure("send failed", "12345");
      expect(result.category).toBe(FailureCategory.INVALID_NUMBER);
      expect(result.retryable).toBe(false);
    });

    it("classifies INVALID_NUMBER when phone has non-digit characters", () => {
      const result = classifyFailure("send failed", "abc-def-ghij");
      expect(result.category).toBe(FailureCategory.INVALID_NUMBER);
      expect(result.retryable).toBe(false);
    });

    it("classifies WHATSAPP_DISCONNECTED from disconnect message", () => {
      const result = classifyFailure("Disconnected from WhatsApp");
      expect(result.category).toBe(FailureCategory.WHATSAPP_DISCONNECTED);
      expect(result.retryable).toBe(false);
    });

    it("classifies WHATSAPP_DISCONNECTED from 'not connected'", () => {
      const result = classifyFailure("not connected");
      expect(result.category).toBe(FailureCategory.WHATSAPP_DISCONNECTED);
    });

    it("classifies DOM_NOT_FOUND from 'input not found'", () => {
      const result = classifyFailure("input not found");
      expect(result.category).toBe(FailureCategory.DOM_NOT_FOUND);
      expect(result.retryable).toBe(true);
    });

    it("classifies DOM_NOT_FOUND from 'DOM'", () => {
      const result = classifyFailure("DOM element missing");
      expect(result.category).toBe(FailureCategory.DOM_NOT_FOUND);
    });

    it("classifies SEND_TIMEOUT from timeout", () => {
      const result = classifyFailure("timed out waiting for response");
      expect(result.category).toBe(FailureCategory.SEND_TIMEOUT);
      expect(result.retryable).toBe(true);
    });

    it("classifies TAB_CLOSED from closed tab", () => {
      const result = classifyFailure("tab was closed");
      expect(result.category).toBe(FailureCategory.TAB_CLOSED);
      expect(result.retryable).toBe(false);
    });

    it("classifies MESSAGE_INJECTION_FAILED from injection failure", () => {
      const result = classifyFailure("inject failed");
      expect(result.category).toBe(FailureCategory.MESSAGE_INJECTION_FAILED);
      expect(result.retryable).toBe(true);
    });

    it("classifies RATE_LIMITED from rate limit", () => {
      const result = classifyFailure("rate limited");
      expect(result.category).toBe(FailureCategory.RATE_LIMITED);
      expect(result.retryable).toBe(false);
    });

    it("classifies RATE_LIMITED from blocked", () => {
      const result = classifyFailure("blocked by WhatsApp");
      expect(result.category).toBe(FailureCategory.RATE_LIMITED);
    });

    it("classifies UNKNOWN for unrecognized error", () => {
      const result = classifyFailure("some random error");
      expect(result.category).toBe(FailureCategory.UNKNOWN);
      expect(result.retryable).toBe(false);
    });

    it("sets timestamp to current time", () => {
      const before = Date.now();
      const result = classifyFailure("timeout");
      const after = Date.now();
      expect(result.timestamp).toBeGreaterThanOrEqual(before);
      expect(result.timestamp).toBeLessThanOrEqual(after);
    });

    it("includes error message in result", () => {
      const result = classifyFailure("custom error message");
      expect(result.message).toBe("custom error message");
    });
  });

  describe("isRetryable", () => {
    const retryableCategories = [
      FailureCategory.DOM_NOT_FOUND,
      FailureCategory.SEND_TIMEOUT,
      FailureCategory.MESSAGE_INJECTION_FAILED,
    ];

    const nonRetryableCategories = [
      FailureCategory.INVALID_NUMBER,
      FailureCategory.WHATSAPP_DISCONNECTED,
      FailureCategory.TAB_CLOSED,
      FailureCategory.RATE_LIMITED,
      FailureCategory.UNKNOWN,
    ];

    for (const cat of retryableCategories) {
      it(`returns true for ${cat}`, () => {
        expect(isRetryable(cat)).toBe(true);
      });
    }

    for (const cat of nonRetryableCategories) {
      it(`returns false for ${cat}`, () => {
        expect(isRetryable(cat)).toBe(false);
      });
    }
  });

  describe("MAX_RETRIES", () => {
    it("is exactly 3", () => {
      expect(MAX_RETRIES).toBe(3);
    });
  });
});
