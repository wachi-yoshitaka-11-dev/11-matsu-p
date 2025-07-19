const { test, expect } = require('@playwright/test');

test.describe('Mofu Mofu Adventure', () => {
  const consoleErrors = [];
  const failedRequests = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors.length = 0; // Reset errors for each test
    failedRequests.length = 0; // Reset failed requests for each test

    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`Browser console error: ${msg.text()}`);
        consoleErrors.push(msg.text());
      }
    });

    page.on('requestfailed', request => {
      console.log(`Failed request: ${request.url()} - ${request.failure().errorText}`);
      failedRequests.push(request.url());
    });

    await page.goto('/');
  });

  test.afterEach(() => {
    // Assert that there are no console errors at the end of the test
    expect(consoleErrors).toEqual([], `Console errors found: ${consoleErrors.join(', ')}`);
    // Assert that there are no failed requests
    expect(failedRequests).toEqual([], `Failed requests found: ${failedRequests.join(', ')}`);
  });

  test('should load the title screen and start the game', async ({ page }) => {
    // Check if the title screen is visible
    const titleScreen = page.locator('#title-screen');
    await expect(titleScreen).toBeVisible({ timeout: 10000 }); // Increased timeout

    // Check for the game title
    const title = page.locator('h1');
    await expect(title).toHaveText('もふもふアドベンチャー');

    // Click the start button
    await page.getByRole('button', { name: 'Start Game' }).click();

    // Check if the title screen is hidden
    await expect(titleScreen).toBeHidden();

    // Check if the HUD is now visible
    const hud = page.locator('#hud');
    await expect(hud).toBeVisible();

    // Check for status bars
    await expect(page.locator('#hp-bar')).toBeVisible();
    await expect(page.locator('#fp-bar')).toBeVisible();
    await expect(page.locator('#stamina-bar')).toBeVisible();
  });
});