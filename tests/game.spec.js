const { test, expect } = require('@playwright/test');
const { setupNetworkRoutes } = require('./utils/network-setup');

test.describe('Mofu Mofu Adventure - Startup Test', () => {
  test('should display the title screen after opening sequence', async ({ page }) => {
    page.on('console', msg => {
      console.log(`BROWSER CONSOLE [${msg.type()}]: ${msg.text()}`);
    });
    page.on('pageerror', error => {
      console.error(`BROWSER PAGE ERROR: ${error.message}`);
    });
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
    page.on('console', msg => {
      console.log(`BROWSER CONSOLE [${msg.type()}]: ${msg.text()}`);
    });
    page.on('pageerror', error => {
      console.error(`BROWSER PAGE ERROR: ${error.message}`);
    });
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
    page.on('console', msg => {
      console.log(`BROWSER CONSOLE [${msg.type()}]: ${msg.text()}`);
    });
    page.on('pageerror', error => {
      console.error(`BROWSER PAGE ERROR: ${error.message}`);
    });
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
    page.on('console', msg => {
      console.log(`BROWSER CONSOLE [${msg.type()}]: ${msg.text()}`);
    });
    page.on('pageerror', error => {
      console.error(`BROWSER PAGE ERROR: ${error.message}`);
    });
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

    // Wait for the ending timer to finish and sequence to start
    await page.waitForFunction(
      () => window.game?.endingTimer <= 0 && window.game?.isEndingSequenceReady,
      null,
      { timeout: 15000 } // タイマーの時間 + 余裕を持たせる
    );
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

test.describe('Mofu Mofu Adventure - Game Over Screen Tests', () => {
  test('should display game over screen when player dies and return to title on button click', async ({ page }) => {
    page.on('console', msg => {
      console.log(`BROWSER CONSOLE [${msg.type()}]: ${msg.text()}`);
    });
    page.on('pageerror', error => {
      console.error(`BROWSER PAGE ERROR: ${error.message}`);
    });
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

    // Simulate player death
    await page.evaluate(() => {
      if (window.game && window.game.player) {
        window.game.player.takeDamage(window.game.player.hp);
      }
    });

    // Wait for game over screen to be visible
    await expect(page.locator('#game-over-screen')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('#game-over-screen h2:has-text("GAME OVER")')).toBeVisible();

    // Click 'Return to Title' button
    const [response] = await Promise.all([
      page.waitForNavigation(), // Wait for navigation (page reload)
      page.locator('#game-over-screen button:has-text("Return to Title")').click(),
    ]);

    // Assert that the page reloaded and title screen is visible
    await expect(page.locator('#title-screen #title-menu button:has-text(\'New Game\')')).toBeVisible({ timeout: 10000 });
  });
});
