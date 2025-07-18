const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000, // 30 seconds
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  webServer: {
    command: 'npm start',
    url: 'http://localhost:8080/',
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: 'http://localhost:8080/',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    headless: false, // ヘッドレスモードを無効化
  },
});
