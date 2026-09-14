import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    // fake-indexeddb gives the offline queue a real IndexedDB implementation
    // to run against, so its durability rules are tested rather than mocked.
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    globals: true,
  },
});
