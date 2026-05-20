import { describe, it, expect, vi, beforeEach } from "vitest";
import { SELECTORS, querySelectorWithFallback, waitForElement } from "@extension/shared/selectors";

describe("SELECTORS", () => {
  it("has appRoot defined", () => {
    expect(SELECTORS.appRoot).toBe("#app");
  });

  it("has messageInput as non-empty array", () => {
    expect(SELECTORS.messageInput).toBeInstanceOf(Array);
    expect(SELECTORS.messageInput.length).toBeGreaterThan(0);
  });

  it("has sendButton as non-empty array", () => {
    expect(SELECTORS.sendButton).toBeInstanceOf(Array);
    expect(SELECTORS.sendButton.length).toBeGreaterThan(0);
  });

  it("has chatHeader as non-empty array", () => {
    expect(SELECTORS.chatHeader).toBeInstanceOf(Array);
    expect(SELECTORS.chatHeader.length).toBeGreaterThan(0);
  });

  it("has lastMessage as non-empty array", () => {
    expect(SELECTORS.lastMessage).toBeInstanceOf(Array);
    expect(SELECTORS.lastMessage.length).toBeGreaterThan(0);
  });

  it("has loadingIndicator as non-empty array", () => {
    expect(SELECTORS.loadingIndicator).toBeInstanceOf(Array);
    expect(SELECTORS.loadingIndicator.length).toBeGreaterThan(0);
  });

  it("has paneList as non-empty array", () => {
    expect(SELECTORS.paneList).toBeInstanceOf(Array);
    expect(SELECTORS.paneList.length).toBeGreaterThan(0);
  });

  it("contains no empty selector arrays", () => {
    for (const [key, value] of Object.entries(SELECTORS)) {
      if (Array.isArray(value)) {
        expect(value.length, `Selector "${key}" should not be empty`).toBeGreaterThan(0);
      }
    }
  });
});

describe("querySelectorWithFallback", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("returns first matching element from selector list", () => {
    document.body.innerHTML = `<div id="first"></div><div id="second"></div>`;
    const result = querySelectorWithFallback(["#first", "#second"]);
    expect(result).not.toBeNull();
    expect(result!.id).toBe("first");
  });

  it("falls through to next selector when first does not match", () => {
    document.body.innerHTML = `<div id="second"></div>`;
    const result = querySelectorWithFallback(["#first", "#second"]);
    expect(result).not.toBeNull();
    expect(result!.id).toBe("second");
  });

  it("returns null when no selectors match", () => {
    document.body.innerHTML = `<div id="other"></div>`;
    const result = querySelectorWithFallback(["#first", "#second"]);
    expect(result).toBeNull();
  });

  it("returns null for empty selector list", () => {
    const result = querySelectorWithFallback([]);
    expect(result).toBeNull();
  });

  it("returns first match even when multiple selectors match", () => {
    document.body.innerHTML = `<div class="a"></div><div class="b"></div>`;
    const result = querySelectorWithFallback([".a", ".b"]);
    expect(result).not.toBeNull();
    expect(result!.className).toBe("a");
  });

  it("handles complex selectors", () => {
    document.body.innerHTML = `
      <div id="app">
        <div contenteditable="true" data-tab="10">edit</div>
      </div>
    `;
    const result = querySelectorWithFallback([
      'div[contenteditable="true"][data-tab="10"]',
      'div[contenteditable="true"]',
    ]);
    expect(result).not.toBeNull();
  });
});

describe("waitForElement", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("resolves immediately when element already exists", async () => {
    document.body.innerHTML = `<div id="existing"></div>`;
    const result = await waitForElement(["#existing"], 500);
    expect(result).not.toBeNull();
    expect(result!.id).toBe("existing");
  });

  it("resolves when element appears in DOM", async () => {
    const promise = waitForElement(["#dynamic"], 500);

    setTimeout(() => {
      const el = document.createElement("div");
      el.id = "dynamic";
      document.body.appendChild(el);
    }, 50);

    const result = await promise;
    expect(result).not.toBeNull();
    expect(result!.id).toBe("dynamic");
  });

  it("resolves with first matching selector when multiple match", async () => {
    document.body.innerHTML = `<div id="first"></div>`;
    const result = await waitForElement(["#first", "#second"], 500);
    expect(result).not.toBeNull();
    expect(result!.id).toBe("first");
  });

  it("returns null when timeout expires", async () => {
    vi.useFakeTimers();
    const promise = waitForElement(["#never"], 100);
    vi.advanceTimersByTime(100);
    const result = await promise;
    expect(result).toBeNull();
    vi.useRealTimers();
  });

  it("returns null on timeout even if element appears after", async () => {
    vi.useFakeTimers();
    const promise = waitForElement(["#late"], 50);

    setTimeout(() => {
      const el = document.createElement("div");
      el.id = "late";
      document.body.appendChild(el);
    }, 200);

    vi.advanceTimersByTime(50);
    const result = await promise;
    expect(result).toBeNull();
    vi.useRealTimers();
  });

  it("uses default timeout of 10000ms when not specified", async () => {
    vi.useFakeTimers();
    const promise = waitForElement(["#never"]);
    expect(promise).toBeInstanceOf(Promise);
    vi.advanceTimersByTime(10000);
    const result = await promise;
    expect(result).toBeNull();
    vi.useRealTimers();
  });

  it("handles selector fallback by trying each selector in order", async () => {
    document.body.innerHTML = `<div class="fallback"></div>`;
    const result = await waitForElement([".missing", ".fallback"], 500);
    expect(result).not.toBeNull();
    expect(result!.className).toBe("fallback");
  });
});
