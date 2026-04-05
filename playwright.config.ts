import { defineConfig, devices } from "@playwright/test";

/**
 * Dedicated port for Playwright’s dev server so health checks match the process Next actually binds
 * (avoids timeouts when port 3000 is taken and Next moves to 3001+).
 * Override with UAT_BASE_URL / UAT_PORT when reusing an existing server.
 */
const uatPort = process.env.UAT_PORT ?? "3333";
const baseURL = process.env.UAT_BASE_URL ?? `http://localhost:${uatPort}`;

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
        env: { ...process.env, PORT: uatPort },
        // Prefer reusing a running dev server on the same UAT port when already up.
        reuseExistingServer: true,
        timeout: 120_000,
        stdout: "pipe",
        stderr: "pipe",
      },
});
