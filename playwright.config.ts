import { defineConfig, devices } from "@playwright/test";

/** Use the same origin as your dev server (e.g. http://localhost:3001 if 3000 is taken). */
const baseURL = process.env.UAT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    timezoneId: "America/Toronto",
    navigationTimeout: 60_000,
  },
  timeout: 60_000,
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.UAT_SKIP_WEBSERVER
    ? undefined
    : {
        command: "npm run dev",
        url: baseURL,
        // Prefer reusing a running `npm run dev` so UAT does not fail when port 3000 is taken.
        reuseExistingServer: true,
        timeout: 120_000,
        stdout: "pipe",
        stderr: "pipe",
      },
});
