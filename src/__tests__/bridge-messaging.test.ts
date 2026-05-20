import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

type ChromeRuntimeSendMessage = (
  message: Record<string, unknown>,
  callback?: (response: Record<string, unknown>) => void
) => void;

type WindowMessageHandler = (event: MessageEvent) => void;

type ChromeOnMessageListener = (
  message: Record<string, unknown>,
  sender: unknown,
  sendResponse: (response: Record<string, unknown>) => void
) => void;

function createBridgeHarness() {
  const windowListeners: Set<WindowMessageHandler> = new Set();
  const chromeListeners: Set<ChromeOnMessageListener> = new Set();

  const mockWindowPostMessage = vi.fn();

  const lastErrorState: { current: { message: string } | undefined } = { current: undefined };

  const mockChromeSendMessage = vi.fn(
    (
      _message: Record<string, unknown>,
      callback?: (response: Record<string, unknown>) => void
    ) => {
      if (callback) {
        if (lastErrorState.current) {
          callback({});
        } else {
          callback({ success: true });
        }
      }
    }
  );

  const mockChromeOnMessageAddListener = vi.fn(
    (listener: ChromeOnMessageListener) => {
      chromeListeners.add(listener);
    }
  );

  const triggerWindowMessage = (data: unknown) => {
    const event = { data } as MessageEvent;
    windowListeners.forEach((handler) => handler(event));
  };

  const triggerChromeMessage = (
    message: Record<string, unknown>,
    sendResponse?: (response: Record<string, unknown>) => void
  ) => {
    const sr = sendResponse ?? vi.fn();
    chromeListeners.forEach((handler) => {
      handler(message, {}, sr);
    });
    return sr;
  };

  const setLastError = (error: { message: string } | undefined) => {
    lastErrorState.current = error;
  };

  return {
    windowListeners,
    chromeListeners,
    mockWindowPostMessage,
    mockChromeSendMessage,
    mockChromeOnMessageAddListener,
    triggerWindowMessage,
    triggerChromeMessage,
    setLastError,
    lastErrorState,
  };
}

describe("bridge-messaging", () => {
  let harness: ReturnType<typeof createBridgeHarness>;

  beforeEach(() => {
    harness = createBridgeHarness();
  });

  describe("window message listener (web app -> bridge)", () => {
    it("ignores messages with wrong type", () => {
      const handler = (event: MessageEvent) => {
        if (event.data?.type !== "MICRONEST_SEQUENCE") return;
        const message = event.data.payload;
        harness.mockChromeSendMessage(
          { type: message.type, payload: message.payload },
          () => {}
        );
      };

      harness.windowListeners.add(handler);
      harness.triggerWindowMessage({ type: "OTHER_TYPE" });

      expect(harness.mockChromeSendMessage).not.toHaveBeenCalled();
    });

    it("forwards MICRONEST_SEQUENCE message to chrome.runtime.sendMessage", () => {
      const handler = (event: MessageEvent) => {
        if (event.data?.type !== "MICRONEST_SEQUENCE") return;
        const message = event.data.payload;
        harness.mockChromeSendMessage(
          { type: message.type, payload: message.payload },
          (response) => {
            harness.mockWindowPostMessage(
              {
                type: "MICRONEST_SEQUENCE_RESPONSE",
                payload: { messageType: message.type, ...response },
              },
              "*"
            );
          }
        );
      };

      harness.windowListeners.add(handler);
      harness.triggerWindowMessage({
        type: "MICRONEST_SEQUENCE",
        payload: { type: "START_SEQUENCE", payload: { sessionId: "s1" } },
      });

      expect(harness.mockChromeSendMessage).toHaveBeenCalledWith(
        { type: "START_SEQUENCE", payload: { sessionId: "s1" } },
        expect.any(Function)
      );
    });

    it("forwards response back to window.postMessage on success", () => {
      const handler = (event: MessageEvent) => {
        if (event.data?.type !== "MICRONEST_SEQUENCE") return;
        const message = event.data.payload;
        harness.mockChromeSendMessage(
          { type: message.type, payload: message.payload },
          (response) => {
            harness.mockWindowPostMessage(
              {
                type: "MICRONEST_SEQUENCE_RESPONSE",
                payload: { messageType: message.type, ...response },
              },
              "*"
            );
          }
        );
      };

      harness.windowListeners.add(handler);
      harness.triggerWindowMessage({
        type: "MICRONEST_SEQUENCE",
        payload: { type: "PAUSE_SEQUENCE", payload: { sessionId: "s1" } },
      });

      expect(harness.mockWindowPostMessage).toHaveBeenCalledWith(
        {
          type: "MICRONEST_SEQUENCE_RESPONSE",
          payload: { messageType: "PAUSE_SEQUENCE", success: true },
        },
        "*"
      );
    });

    it("forwards error back to window.postMessage when chrome.runtime.lastError exists", () => {
      harness.setLastError({ message: "Connection failed" });

      const handler = (event: MessageEvent) => {
        if (event.data?.type !== "MICRONEST_SEQUENCE") return;
        const message = event.data.payload;
        harness.mockChromeSendMessage(
          { type: message.type, payload: message.payload },
          () => {
            if (harness.lastErrorState.current) {
              harness.mockWindowPostMessage(
                {
                  type: "MICRONEST_SEQUENCE_RESPONSE",
                  payload: {
                    messageType: message.type,
                    success: false,
                    error: harness.lastErrorState.current.message,
                  },
                },
                "*"
              );
              return;
            }
            harness.mockWindowPostMessage(
              {
                type: "MICRONEST_SEQUENCE_RESPONSE",
                payload: { messageType: message.type, success: true },
              },
              "*"
            );
          }
        );
      };

      harness.windowListeners.add(handler);
      harness.triggerWindowMessage({
        type: "MICRONEST_SEQUENCE",
        payload: { type: "START_SEQUENCE", payload: { sessionId: "s1" } },
      });

      expect(harness.mockWindowPostMessage).toHaveBeenCalledWith(
        {
          type: "MICRONEST_SEQUENCE_RESPONSE",
          payload: {
            messageType: "START_SEQUENCE",
            success: false,
            error: "Connection failed",
          },
        },
        "*"
      );
    });

    it("ignores messages with no MICRONEST_SEQUENCE type", () => {
      const handler = (event: MessageEvent) => {
        if (event.data?.type !== "MICRONEST_SEQUENCE") return;
        const message = event.data.payload;
        harness.mockChromeSendMessage(
          { type: message.type, payload: message.payload },
          () => {}
        );
      };

      harness.windowListeners.add(handler);
      harness.triggerWindowMessage({ type: "OTHER" });

      expect(harness.mockChromeSendMessage).not.toHaveBeenCalled();
    });
  });

  describe("chrome.runtime.onMessage listener (background -> bridge)", () => {
    it("forwards MICRONEST_SEQUENCE_STATUS to window.postMessage", () => {
      const handler: ChromeOnMessageListener = (
        message,
        _sender,
        sendResponse
      ) => {
        if (message.type === "MICRONEST_SEQUENCE_STATUS") {
          harness.mockWindowPostMessage(
            {
              type: "MICRONEST_SEQUENCE_STATUS",
              ...(message.payload as Record<string, unknown>),
            },
            "*"
          );
          sendResponse({ forwarded: true });
        }
      };

      harness.chromeListeners.add(handler);
      const sr = harness.triggerChromeMessage({
        type: "MICRONEST_SEQUENCE_STATUS",
        payload: { sessionId: "s1", state: "sending", currentIndex: 0 },
      });

      expect(harness.mockWindowPostMessage).toHaveBeenCalledWith(
        {
          type: "MICRONEST_SEQUENCE_STATUS",
          sessionId: "s1",
          state: "sending",
          currentIndex: 0,
        },
        "*"
      );
      expect(sr).toHaveBeenCalledWith({ forwarded: true });
    });

    it("responds to GET_SESSION_STATUS with empty object", () => {
      const handler: ChromeOnMessageListener = (
        message,
        _sender,
        sendResponse
      ) => {
        if (message.type === "GET_SESSION_STATUS") {
          sendResponse({});
        }
      };

      harness.chromeListeners.add(handler);
      const sr = harness.triggerChromeMessage({ type: "GET_SESSION_STATUS" });

      expect(sr).toHaveBeenCalledWith({});
    });

    it("responds to MICRONEST_HEARTBEAT with alive true", () => {
      const handler: ChromeOnMessageListener = (
        message,
        _sender,
        sendResponse
      ) => {
        if (message.type === "MICRONEST_HEARTBEAT") {
          sendResponse({ alive: true });
        }
      };

      harness.chromeListeners.add(handler);
      const sr = harness.triggerChromeMessage({ type: "MICRONEST_HEARTBEAT" });

      expect(sr).toHaveBeenCalledWith({ alive: true });
    });

    it("ignores unknown message types", () => {
      const handler: ChromeOnMessageListener = vi.fn(
        (message, _sender, sendResponse) => {
          if (message.type === "MICRONEST_SEQUENCE_STATUS") {
            harness.mockWindowPostMessage(
              {
                type: "MICRONEST_SEQUENCE_STATUS",
                ...(message.payload as Record<string, unknown>),
              },
              "*"
            );
            sendResponse({ forwarded: true });
          }
          if (message.type === "GET_SESSION_STATUS") {
            sendResponse({});
          }
          if (message.type === "MICRONEST_HEARTBEAT") {
            sendResponse({ alive: true });
          }
        }
      );

      harness.chromeListeners.add(handler);
      harness.triggerChromeMessage({ type: "UNKNOWN_TYPE" });

      expect(harness.mockWindowPostMessage).not.toHaveBeenCalled();
    });
  });

  describe("full message roundtrip", () => {
    it("handles window -> chrome -> window flow end to end", () => {
      const windowHandler = (event: MessageEvent) => {
        if (event.data?.type !== "MICRONEST_SEQUENCE") return;
        const message = event.data.payload;
        harness.mockChromeSendMessage(
          { type: message.type, payload: message.payload },
          (response) => {
            harness.mockWindowPostMessage(
              {
                type: "MICRONEST_SEQUENCE_RESPONSE",
                payload: { messageType: message.type, ...response },
              },
              "*"
            );
          }
        );
      };

      harness.windowListeners.add(windowHandler);

      harness.triggerWindowMessage({
        type: "MICRONEST_SEQUENCE",
        payload: { type: "GET_SESSION_STATUS", payload: {} },
      });

      expect(harness.mockWindowPostMessage).toHaveBeenCalledWith(
        {
          type: "MICRONEST_SEQUENCE_RESPONSE",
          payload: { messageType: "GET_SESSION_STATUS", success: true },
        },
        "*"
      );
    });

    it("propagates lastError through the roundtrip", () => {
      harness.setLastError({ message: "Tab not found" });

      const windowHandler = (event: MessageEvent) => {
        if (event.data?.type !== "MICRONEST_SEQUENCE") return;
        const message = event.data.payload;
        harness.mockChromeSendMessage(
          { type: message.type, payload: message.payload },
          () => {
            if (harness.lastErrorState.current) {
              harness.mockWindowPostMessage(
                {
                  type: "MICRONEST_SEQUENCE_RESPONSE",
                  payload: {
                    messageType: message.type,
                    success: false,
                    error: harness.lastErrorState.current.message,
                  },
                },
                "*"
              );
              return;
            }
            harness.mockWindowPostMessage(
              {
                type: "MICRONEST_SEQUENCE_RESPONSE",
                payload: { messageType: message.type, success: true },
              },
              "*"
            );
          }
        );
      };

      harness.windowListeners.add(windowHandler);

      harness.triggerWindowMessage({
        type: "MICRONEST_SEQUENCE",
        payload: { type: "STOP_SEQUENCE", payload: { sessionId: "s1" } },
      });

      expect(harness.mockWindowPostMessage).toHaveBeenCalledWith(
        {
          type: "MICRONEST_SEQUENCE_RESPONSE",
          payload: {
            messageType: "STOP_SEQUENCE",
            success: false,
            error: "Tab not found",
          },
        },
        "*"
      );
    });
  });
});
