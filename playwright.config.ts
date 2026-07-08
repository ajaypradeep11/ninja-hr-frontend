// Browser e2e for NinjaHR. Boots the whole stack itself (backend on :4000,
// frontend on :3000) unless the servers are already running — Postgres must be
// up, migrated and seeded (see ninja-hr-backend README).
// Run headed with: npx playwright test --headed   (or --ui for the inspector)
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  // One worker: specs share the actor cookie's server-side identity and the
  // seeded database, and headed runs are meant to be watchable.
  workers: 1,
  timeout: 45_000,
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    // Slow motion (ms between actions) for watchable demos: SLOWMO=500 npm run test:e2e:headed
    launchOptions: { slowMo: Number(process.env.SLOWMO) || 0 },
  },
  webServer: [
    {
      command: "npm run start:prod",
      cwd: "../ninja-hr-backend",
      url: "http://localhost:4000/api/v1/health",
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: "npm run start",
      url: "http://localhost:3000",
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});
