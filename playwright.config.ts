import { defineConfig, devices } from '@playwright/test'

// PALLETIQ-051/ADR-0017. Runs against the Firebase emulator suite only -
// never real mrt-pallet-iq. Emulators are started by `npm run test:e2e`
// (firebase emulators:exec), not from here - see that script for the
// single source of truth on how they start, matching the pattern
// test:rules/test:storage-rules already use.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // Vite bakes VITE_* vars in at build time, so a fresh build is required
    // on every run - `reuseExistingServer` never applies to the build step.
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    env: {
      VITE_USE_FIREBASE_EMULATORS: 'true',
      VITE_FIREBASE_PROJECT_ID: 'demo-palletiq',
      VITE_FIREBASE_API_KEY: 'demo-key',
      VITE_FIREBASE_AUTH_DOMAIN: 'demo-palletiq.firebaseapp.com',
      VITE_FIREBASE_STORAGE_BUCKET: 'demo-palletiq.appspot.com',
      VITE_FIREBASE_MESSAGING_SENDER_ID: '000000000000',
      VITE_FIREBASE_APP_ID: '1:000000000000:web:0000000000000000000000',
    },
    timeout: 120_000,
  },
})
