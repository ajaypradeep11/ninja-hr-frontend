// Browser e2e for NinjaHR. Boots the whole stack itself — the Firebase auth
// emulator, the backend on :4000, and the frontend on :3000 — unless they're
// already running. Postgres must be up, migrated and seeded (see
// ninja-hr-backend README), and the app now requires sign-in: a "setup"
// project (e2e/auth.setup.ts) logs in once as the seeded HR admin and saves
// storageState for every other spec to reuse (see `projects` below).
// Run headed with: npx playwright test --headed   (or --ui for the inspector)
import { defineConfig } from "@playwright/test";

// Local/emulator-only Firebase project — matches ninja-hr-backend's
// firebase.json (`singleProject: true`) and its `test:e2e:auth` script.
const FIREBASE_PROJECT_ID = "demo-ninjahr";
const FIREBASE_AUTH_EMULATOR_HOST = "localhost:9099";

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
  projects: [
    // Logs in once as HR and writes e2e/.auth/hr.json — depended on below so
    // it always runs first (and re-seeds the auth emulator; see its comments
    // on why that seeding lives here rather than in a webServer command).
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      testIgnore: /auth\.setup\.ts/,
      use: { storageState: "e2e/.auth/hr.json" },
      dependencies: ["setup"],
    },
  ],
  webServer: [
    {
      // Auth emulator first: the backend fails fast on boot without either
      // this or full FIREBASE_* service-account credentials (see
      // firebase-admin.service.ts's Global Constraint on that).
      command: `npx firebase emulators:start --only auth --project ${FIREBASE_PROJECT_ID}`,
      cwd: "../ninja-hr-backend",
      url: `http://${FIREBASE_AUTH_EMULATOR_HOST}`,
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: "npm run start:prod",
      cwd: "../ninja-hr-backend",
      url: "http://localhost:4000/api/v1/health",
      reuseExistingServer: true,
      timeout: 60_000,
      env: { FIREBASE_AUTH_EMULATOR_HOST, FIREBASE_PROJECT_ID },
    },
    {
      // `next start` serves the already-built `.next` output, and
      // NEXT_PUBLIC_* vars are inlined into the client bundle at build time —
      // so this has to (re)build with these env vars present, not just start
      // with them. Only paid when nothing is already listening on :3000
      // (reuseExistingServer covers an already-running `npm run dev`).
      command: "npm run build && npm run start",
      url: "http://localhost:3000",
      reuseExistingServer: true,
      timeout: 120_000,
      env: {
        NEXT_PUBLIC_FIREBASE_API_KEY: "demo-api-key",
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: `${FIREBASE_PROJECT_ID}.firebaseapp.com`,
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: FIREBASE_PROJECT_ID,
        NEXT_PUBLIC_FIREBASE_APP_ID: "demo-app-id",
        NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: FIREBASE_AUTH_EMULATOR_HOST,
        FIREBASE_AUTH_EMULATOR_HOST,
        FIREBASE_PROJECT_ID,
      },
    },
  ],
});
