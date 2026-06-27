import { defineConfig } from "vitest/config";

// RLS tests hit a real Supabase instance (local or hosted), so run them
// serially with a generous timeout — no jsdom, plain node.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    fileParallelism: false,
  },
});
