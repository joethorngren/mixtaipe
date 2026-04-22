import { defineConfig, devices } from "@playwright/test";

// ============================================================================
// Playwright config for mixtAIpe E2E suite.
//
// Fully serial — tests share Convex state (they seed topics, submit chips,
// and read from the live feed), so running them in parallel would create
// race conditions on row counts.
//
// Reuses an already-running dev server if one is there (normal dev flow).
// Otherwise spins up `pnpm dev` for the run. Convex dev (`npx convex dev`)
// must be running separately — Playwright does not start it for you.
// ============================================================================

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 30_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
