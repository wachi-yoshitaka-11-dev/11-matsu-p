const { test, expect } = require('@playwright/test');

// Helper function to get the current animation name
const getCurrentAnimation = (page) => {
  return page.evaluate(() => window.game.player.currentAnimationName);
};

test.describe('Mofu Mofu Adventure - Animation Tests', () => {
  test.beforeEach(async ({ page }) => {
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

    // Go to the game page and start the game
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // Wait for assets to load

    const newGameButton = page.locator("#title-screen #title-menu button:has-text('New Game')");
    await expect(newGameButton).toBeVisible({ timeout: 10000 });
    await newGameButton.click();

    await page.waitForFunction(() => window.game && window.game.gameState === 'playing', null, { timeout: 10000 });
    await expect(page.locator('#hud')).toBeVisible({ timeout: 10000 });
  });

  test.describe('Initial State', () => {
    test('should play idle animation on start', async ({ page }) => {
      await expect(await getCurrentAnimation(page)).toBe('idle');
    });
  });

  test.describe('Movement Animations', () => {
    test('should play walk animation and return to idle', async ({ page }) => {
      await page.keyboard.down('KeyW');
      await page.waitForTimeout(500);
      await expect(await getCurrentAnimation(page)).toBe('walk');

      await page.keyboard.up('KeyW');
      await page.waitForTimeout(1000);
      await expect(await getCurrentAnimation(page)).toBe('idle');
    });

    test('should play dash animation and return to idle', async ({ page }) => {
      await page.keyboard.down('ShiftLeft');
      await page.keyboard.down('KeyW');
      await page.waitForTimeout(500);
      await expect(await getCurrentAnimation(page)).toBe('sprint');

      await page.keyboard.up('KeyW');
      await page.keyboard.up('ShiftLeft');
      await page.waitForTimeout(1000);
      await expect(await getCurrentAnimation(page)).toBe('idle');
    });
  });

  test.describe('Combat Animations', () => {
    test('should play weak attack animation and return to idle', async ({ page }) => {
      await page.mouse.down({ button: 'left' });
      await page.mouse.up({ button: 'left' });

      await expect(await getCurrentAnimation(page)).toBe('attack-melee-right');

      await page.waitForTimeout(1000);

      await expect(await getCurrentAnimation(page)).toBe('idle');
    });

    test('should play strong attack animation and return to idle', async ({ page }) => {
      await page.mouse.down({ button: 'right' });
      await page.waitForTimeout(500); // Charge attack
      await page.mouse.up({ button: 'right' });

      await expect(await getCurrentAnimation(page)).toBe('attack-melee-left');

      await page.waitForTimeout(1000);

      await expect(await getCurrentAnimation(page)).toBe('idle');
    });
  });
});
