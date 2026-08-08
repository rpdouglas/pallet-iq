import { defineConfig } from 'vitest/config'

// Own config so this package's tests don't inherit the root app's
// jsdom/React test setup - these are plain Node Cloud Functions.
export default defineConfig({
  test: {
    environment: 'node',
  },
})
