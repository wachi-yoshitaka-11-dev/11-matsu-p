const { test, expect } = require('@playwright/test');

async function setupNetworkRoutes(page) {
  await page.route('https://unpkg.com/three@0.160.0/build/three.module.js', route => {
    route.fulfill({ path: require('path').join(__dirname, '../node_modules/three/build/three.module.js') });
  });
  await page.route('https://unpkg.com/three@0.160.0/examples/jsm/**', route => {
    const url = route.request().url();
    const jsmPath = url.substring(url.indexOf('/jsm/') + 5);
    const localPath = require('path').join(__dirname, '../node_modules/three/examples/jsm/', jsmPath);
    route.fulfill({ path: localPath });
  });
}

test.describe('Mofu Mofu Adventure - Startup Test', () => {
  test('should display the title screen on startup', async ({ page }) => {
    await setupNetworkRoutes(page);

    // Go to the game page
    await page.goto('/');

    // Wait for splash screen to complete and title screen to be ready
    await page.waitForFunction(() => 
      document.querySelector("#title-screen #title-menu button")?.offsetParent !== null,
      null, 
      { timeout: 10000 }
    );

    // Check if the "New Game" button is visible on the title screen
    const newGameButton = page.locator("#title-screen #title-menu button:has-text('New Game')");
    await expect(newGameButton).toBeVisible({ timeout: 10000 });
  });

  test('should start the game when "New Game" is clicked', async ({ page }) => {
    await setupNetworkRoutes(page);

    // Go to the game page
    await page.goto('/');

    // Wait for the title screen to be fully visible
    await page.waitForFunction(() => 
      document.querySelector("#title-screen #title-menu button")?.offsetParent !== null,
      null, 
      { timeout: 10000 }
    );

    const newGameButton = page.locator("#title-screen #title-menu button:has-text('New Game')");
    await expect(newGameButton).toBeVisible({ timeout: 10000 });
    await newGameButton.click();

    // Wait for the game state to change to 'playing' and HUD to be visible
    await page.waitForFunction(() => {
      try {
        return window.game?.gameState === 'playing';
      } catch (e) {
        return false;
      }
    }, null, { timeout: 10000 });
    await expect(page.locator('#hud')).toBeVisible({ timeout: 10000 });
  });
});