// Content script bridge for MicroNest web app — Reliability Engine v2
// Handles: session commands, recovery, heartbeat, failed actions

window.addEventListener("message", (event) => {
  if (event.data?.type !== "MICRONEST_SEQUENCE") return;

  const message = event.data.payload;

  chrome.runtime.sendMessage(
    {
      type: message.type,
      payload: message.payload,
    },
    (response) => {
      if (chrome.runtime.lastError) {
        window.postMessage(
          {
            type: "MICRONEST_SEQUENCE_RESPONSE",
            payload: {
              messageType: message.type,
              success: false,
              error: chrome.runtime.lastError.message,
            },
          },
          "*"
        );
        return;
      }

      window.postMessage(
        {
          type: "MICRONEST_SEQUENCE_RESPONSE",
          payload: {
            messageType: message.type,
            ...response,
          },
        },
        "*"
      );
    }
  );
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "MICRONEST_SEQUENCE_STATUS") {
    window.postMessage(
      {
        type: "MICRONEST_SEQUENCE_STATUS",
        ...message.payload,
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
});
