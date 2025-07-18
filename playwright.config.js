const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  webServer: {
    command: 'npm start',
    url: 'http://localhost:8080/',
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: 'http://localhost:8080/',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
});
