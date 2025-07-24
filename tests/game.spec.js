const { test, expect } = require('@playwright/test');

test.describe('Mofu Mofu Adventure - Game Startup', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept network requests to serve local files for Three.js modules
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
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // Wait 3 seconds after load

    // Start the game by clicking the 'New Game' button on the title screen
    const newGameButton = page.locator('#title-screen #title-menu button:has-text('New Game')');
    await expect(newGameButton).toBeVisible({ timeout: 10000 });
    await newGameButton.click();

    // Wait for the game to enter the 'playing' state and HUD to be visible
    await page.waitForFunction(() => window.game && window.game.gameState === 'playing', null, { timeout: 10000 });
    await expect(page.locator('#hud')).toBeVisible({ timeout: 10000 });
  });

  test('should start the game and enter playing state', async ({ page }) => {
    // If beforeEach passes, it means the game has successfully started and entered the playing state.
    // We can add a simple assertion here to confirm.
    const gameState = await page.evaluate(() => window.game.gameState);
    expect(gameState).toBe('playing');
  });
});