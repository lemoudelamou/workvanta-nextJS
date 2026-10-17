import { defineConfig, devices } from "@playwright/test";

import { E2E_PORT, E2E_SOCKET_PORT, e2eEnv } from "./e2e/env";

/**
 * End-to-end tests. Needs PostgreSQL (with migrations applied) and Redis;
 * see README → "End-to-end tests". Run with `npm run test:e2e`.
 *
 * By default the app is built and started in production mode. Set
 * E2E_DEV=1 to use `next dev` instead (faster to iterate locally).
 */
const isCI = !!process.env.CI;
const useDev = process.env.E2E_DEV === "1";

export default defineConfig({
    testDir: "./e2e",
    testMatch: /.*\.spec\.ts$/,
    fullyParallel: false,
    workers: 1,
    forbidOnly: isCI,
    retries: isCI ? 1 : 0,
    timeout: 60_000,
    expect: { timeout: 10_000 },
    reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
    globalSetup: "./e2e/global-setup.ts",

    use: {
        baseURL: `http://localhost:${E2E_PORT}`,
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
        ...devices["Desktop Chrome"],
    },

    webServer: [
        {
            command: useDev
                ? `npx next dev -p ${E2E_PORT}`
                : `npx next build && npx next start -p ${E2E_PORT}`,
            url: `http://localhost:${E2E_PORT}/signin`,
            timeout: 240_000,
            reuseExistingServer: !isCI,
            env: useDev ? { ...e2eEnv, NODE_ENV: "development" } : e2eEnv,
            stdout: "pipe",
            stderr: "pipe",
        },
        {
            // Realtime (live board, comments, notifications).
            command: "npx tsx src/lib/services/socket/server.ts",
            url: `http://localhost:${E2E_SOCKET_PORT}/health`,
            timeout: 60_000,
            reuseExistingServer: !isCI,
            env: { ...e2eEnv, SOCKET_PORT: String(E2E_SOCKET_PORT) },
            stdout: "pipe",
            stderr: "pipe",
        },
    ],
});
