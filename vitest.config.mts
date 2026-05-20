import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./src/__tests__/setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: [
        "src/features/followups/services/state-machine.ts",
        "src/features/followups/services/get-followup-queue.ts",
        "src/features/operations/services/get-operational-queue.ts",
        "src/features/operations/services/log-session-event.ts",
        "src/features/workspaces/services/contact-lock.ts",
        "src/features/workspaces/services/assign-contact.ts",
        "src/features/workspaces/services/workspace-activity.ts",
        "src/features/workspaces/services/get-operator-metrics.ts",
        "src/features/workspaces/services/invite-member.ts",
        "src/server/workspace/",
        "extension/src/shared/",
      ],
      exclude: ["**/*.test.*", "**/__tests__/**"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@extension": path.resolve(__dirname, "./extension/src"),
    },
  },
});
