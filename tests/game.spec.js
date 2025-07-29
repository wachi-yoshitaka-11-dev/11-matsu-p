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
}

test.describe('Mofu Mofu Adventure - Startup Test', () => {
  test('should display the title screen after opening sequence', async ({ page }) => {
    await setupNetworkRoutes(page);
    await page.goto('/');

    // Wait for the sequence overlay to appear (indicating opening sequence started)
    await expect(page.locator('#sequence-overlay')).toBeVisible({ timeout: 10000 });

    // Wait for the opening sequence to complete (currentStep becomes 'idle')
    await page.waitForFunction(
      () => window.game?.sequenceManager?.currentStep === 'idle',
      null,
      {
        timeout: 120000
      }
    );

    await page.waitForSelector('#title-screen #title-menu button:has-text(\'New Game\')', { state: 'visible' });

    const newGameButton = page.locator(
      '#title-screen #title-menu button:has-text(\'New Game\')'
    );
    await expect(newGameButton).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#sequence-overlay')).not.toBeVisible();
  });

  test('should start the game when "New Game" is clicked after opening sequence', async ({ page }) => {
    await setupNetworkRoutes(page);
    await page.goto('/');

    // Wait for the opening sequence to complete
    await page.waitForFunction(
      () => window.game?.sequenceManager?.currentStep === 'idle',
      null,
      {
        timeout: 120000
      }
    );

    await page.waitForSelector('#title-screen #title-menu button:has-text(\'New Game\')', { state: 'visible' });

    const newGameButton = page.locator(
      '#title-screen #title-menu button:has-text(\'New Game\')'
    );
    await expect(newGameButton).toBeVisible({ timeout: 10000 });
    await newGameButton.click();

    // Wait for the game state to change to 'playing' and HUD to be visible
    await page.waitForFunction(
      () => {
        try {
          return window.game?.gameState === 'playing';
        } catch (e) {
          return false;
        }
      },
      null,
      {
        timeout: 10000
      }
    );
    await expect(page.locator('#hud')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Mofu Mofu Adventure - Sequence Tests', () => {
  test('should play opening sequence and transition to title screen', async ({ page }) => {
    await setupNetworkRoutes(page);
    await page.goto('/');

    // Wait for the sequence overlay to appear
    await expect(page.locator('#sequence-overlay')).toBeVisible({ timeout: 10000 });

    // Wait for the opening sequence to complete
    await page.waitForFunction(
      () => window.game?.sequenceManager?.currentStep === 'idle',
      null,
      {
        timeout: 120000
      }
    );

    await page.waitForSelector('#title-screen #title-menu button:has-text(\'New Game\')', { state: 'visible' });

    const newGameButton = page.locator(
      '#title-screen #title-menu button:has-text(\'New Game\')'
    );
    await expect(newGameButton).toBeVisible();
    await expect(page.locator('#sequence-overlay')).not.toBeVisible();
  });

  test('should play ending sequence after boss defeat and transition to title screen', async ({ page }) => {
    await setupNetworkRoutes(page);
    await page.goto('/');

    // Wait for the opening sequence to complete
    await page.waitForFunction(
      () => window.game?.sequenceManager?.currentStep === 'idle',
      null,
      {
        timeout: 120000
      }
    );

    // Start the game
    await page.locator('#title-screen #title-menu button:has-text(\'New Game\')').click();
    await page.waitForFunction(() => window.game?.gameState === 'playing', null, { timeout: 10000 });

    // Simulate boss defeat
    await page.evaluate(() => {
      if (window.game && window.game.boss) {
        window.game.boss.takeDamage(window.game.boss.hp);
      }
    });

    // Wait for the sequence overlay to appear
    await expect(page.locator('#sequence-overlay')).toBeVisible({ timeout: 10000 });

    // Wait for the ending sequence to complete
    await page.waitForFunction(
      () => window.game?.sequenceManager?.currentStep === 'idle',
      null,
      {
        timeout: 120000
      }
    );

    await page.waitForSelector('#title-screen #title-menu button:has-text(\'New Game\')', { state: 'visible' });

    const newGameButton = page.locator(
      '#title-screen #title-menu button:has-text(\'New Game\')'
    );
    await expect(newGameButton).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#sequence-overlay')).not.toBeVisible();
  });
});