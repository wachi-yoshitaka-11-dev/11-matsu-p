const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 120000, // 120 seconds
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  webServer: {
    command: 'npx http-server ./public -p 8081',
    url: 'http://localhost:8081/',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // Increased timeout to 120 seconds
  },
  use: {
    baseURL: 'http://localhost:8081/',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    headless: true,
    storageState: undefined,
  },
});
