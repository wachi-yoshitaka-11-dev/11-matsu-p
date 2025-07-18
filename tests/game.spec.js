const { test, expect } = require('@playwright/test');

test.describe('Mofu Mofu Adventure', () => {
  let serverProcess;
  let browser, context, page;
  const consoleErrors = [];

  test.beforeAll(async () => {
    // Start the server
    const { spawn } = require('child_process');
    serverProcess = spawn('npm', ['start'], { shell: true });
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  test.afterAll(async () => {
    // Stop the server
    serverProcess.kill();
  });

  test.beforeEach(async ({ playwright }) => {
    browser = await playwright.chromium.launch();
    context = await browser.newContext();
    page = await context.newPage();
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    await page.goto('/');
  });

  test.afterEach(async () => {
    await browser.close();
    // Assert that there are no console errors
    expect(consoleErrors).toEqual([]);
  });

  test('should load the title screen and start the game', async () => {
    await page.waitForTimeout(1000); // Wait for 1 second
    // Check if the title screen is visible
    const titleScreen = await page.locator('#title-screen');
    await expect(titleScreen).toBeVisible();

    // Check for the game title
    const title = await page.locator('h1');
    await expect(title).toHaveText('もふもふアドベンチャー');

    // Click the start button
    await page.getByRole('button', { name: 'Start Game' }).click();

    // Check if the title screen is hidden
    await expect(titleScreen).toBeHidden();

    // Check if the HUD is now visible
    const hud = await page.locator('#hud');
    await expect(hud).toBeVisible();

    // Check for status bars
    await expect(page.locator('#hp-bar')).toBeVisible();
    await expect(page.locator('#fp-bar')).toBeVisible();
    await expect(page.locator('#stamina-bar')).toBeVisible();
  });
});