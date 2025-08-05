const { test, expect } = require('@playwright/test');

async function setupNetworkRoutes(page) {
  await page.route(
    'https://unpkg.com/three@0.160.0/build/three.module.js',
    (route) => {
      route.fulfill({
        path: require('path').join(
          __dirname,
          '../node_modules/three/build/three.module.js'
        ),
      });
    }
  );
  await page.route(
    'https://unpkg.com/three@0.160.0/examples/jsm/**',
    (route) => {
      const url = route.request().url();
      const jsmPath = url.substring(url.indexOf('/jsm/') + 5);
      const localPath = require('path').join(
        __dirname,
        '../node_modules/three/examples/jsm/',
        jsmPath
      );
      route.fulfill({ path: localPath });
    }
  );
  // Data files routes
  const dataFiles = [
    'stages',
    'terrain-objects',
    'enemies',
    'items',
    'npcs',
    'player',
    'weapons',
    'shields',
    'skills',
    'localization',
    'sequences',
  ];
  for (const file of dataFiles) {
    await page.route(`**/data/${file}.json`, (route) => {
      route.fulfill({
        path: require('path').join(__dirname, `../public/data/${file}.json`),
      });
    });
  }
}

test.describe('Debug Tests', () => {
  test('should load basic page and check for errors', async ({ page }) => {
    await setupNetworkRoutes(page);

    // Listen for console errors
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    page.on('pageerror', (error) => {
      errors.push(`Page error: ${error.message}`);
    });

    await page.goto('/');

    // Wait for click-to-start screen to appear
    await page.waitForSelector('#click-to-start-screen', { timeout: 5000 });

    // Check if click-to-start screen is visible
    const clickToStartVisible = await page
      .locator('#click-to-start-screen')
      .isVisible();
    console.log('Click to start screen visible:', clickToStartVisible);

    // Click the start screen to initialize the game
    await page.click('#click-to-start-screen');

    // Wait for game to initialize
    await page.waitForTimeout(3000);

    // Check if game object exists
    const hasGame = await page.evaluate(
      () => typeof window.game !== 'undefined'
    );
    console.log('Game object exists:', hasGame);

    // Check game state
    const gameState = await page.evaluate(() => window.game?.gameState);
    console.log('Game state:', gameState);

    // Check for errors
    if (errors.length > 0) {
      console.log('Console errors:', errors);
    }

    // Take screenshot
    await page.screenshot({ path: 'test-results/debug-screenshot.png' });

    expect(hasGame).toBe(true);
  });
});
