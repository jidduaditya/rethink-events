import { defineConfig } from "vitest/config";
import path from "path";

// RLS tests hit a real Supabase instance (local or hosted), so run them
// serially with a generous timeout — no jsdom, plain node.
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    fileParallelism: false,
  },
});
