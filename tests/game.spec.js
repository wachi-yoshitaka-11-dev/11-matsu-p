const { test, expect } = require('@playwright/test');

test.describe('Mofu Mofu Adventure - Startup Test', () => {
  test('should display the title screen on startup', async ({ page }) => {
    // Intercept network requests to serve local files
    await page.route('https://unpkg.com/three@0.160.0/build/three.module.js', route => {
      route.fulfill({ path: require('path').join(__dirname, '../node_modules/three/build/three.module.js') });
    });
    await page.route('https://unpkg.com/three@0.160.0/examples/jsm/**', route => {
      const url = route.request().url();
      const jsmPath = url.substring(url.indexOf('/jsm/') + 5);
      const localPath = require('path').join(__dirname, '../node_modules/three/examples/jsm/', jsmPath);
      route.fulfill({ path: localPath });
    });

    // Go to the game page
    await page.goto('/');

    // Wait for assets to load and title screen to be visible
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // Give some time for assets to load and splash screen to transition

    // Check if the "New Game" button is visible on the title screen
    const newGameButton = page.locator("#title-screen #title-menu button:has-text('New Game')");
    await expect(newGameButton).toBeVisible({ timeout: 10000 });
  });

  test('should start the game when "New Game" is clicked', async ({ page }) => {
    // Intercept network requests to serve local files
    await page.route('https://unpkg.com/three@0.160.0/build/three.module.js', route => {
      route.fulfill({ path: require('path').join(__dirname, '../node_modules/three/build/three.module.js') });
    });
    await page.route('https://unpkg.com/three@0.160.0/examples/jsm/**', route => {
      const url = route.request().url();
      const jsmPath = url.substring(url.indexOf('/jsm/') + 5);
      const localPath = require('path').join(__dirname, '../node_modules/three/examples/jsm/', jsmPath);
      route.fulfill({ path: localPath });
    });

    // Go to the game page
    await page.goto('/');

    // Wait for the title screen to be fully visible
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // Wait for assets to load

    const newGameButton = page.locator("#title-screen #title-menu button:has-text('New Game')");
    await expect(newGameButton).toBeVisible({ timeout: 10000 });
    await newGameButton.click();

    // Wait for the game state to change to 'playing' and HUD to be visible
    await page.waitForFunction(() => window.game && window.game.gameState === 'playing', null, { timeout: 10000 });
    await expect(page.locator('#hud')).toBeVisible({ timeout: 10000 });
  });
});