const { test, expect } = require('@playwright/test');
const { setupNetworkRoutes } = require('./utils/network-setup');

test.describe('Sequence Skip Tests', () => {
  test('should skip opening sequence when clicked', async ({ page }) => {
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

    // Verify opening sequence is playing
    await page.waitForFunction(
      () => window.game?.sequenceManager?.currentStep === 'showingText',
      null,
      { timeout: 10000 }
    );

    // Click on sequence overlay to skip
    await page.locator('#sequence-overlay').click();

    // Verify sequence is skipped and title screen appears
    await page.waitForFunction(
      () => window.game?.sequenceManager?.currentStep === 'idle',
      null,
      { timeout: 5000 }
    );

    await expect(page.locator('#title-screen #title-menu button:has-text(\'New Game\')')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#sequence-overlay')).not.toBeVisible();
  });

  test('should skip opening sequence when key is pressed', async ({ page }) => {
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

    // Verify opening sequence is playing
    await page.waitForFunction(
      () => window.game?.sequenceManager?.currentStep === 'showingText',
      null,
      { timeout: 10000 }
    );

    // Press escape key to skip
    await page.keyboard.press('Escape');

    // Verify sequence is skipped and title screen appears
    await page.waitForFunction(
      () => window.game?.sequenceManager?.currentStep === 'idle',
      null,
      { timeout: 5000 }
    );

    await expect(page.locator('#title-screen #title-menu button:has-text(\'New Game\')')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#sequence-overlay')).not.toBeVisible();
  });

  test('should skip ending sequence when clicked', async ({ page }) => {
    page.on('console', msg => {
      console.log(`BROWSER CONSOLE [${msg.type()}]: ${msg.text()}`);
    });
    page.on('pageerror', error => {
      console.error(`BROWSER PAGE ERROR: ${error.message}`);
    });
    await setupNetworkRoutes(page);
    await page.goto('/');

    // Skip opening sequence first
    await expect(page.locator('#sequence-overlay')).toBeVisible({ timeout: 10000 });
    await page.locator('#sequence-overlay').click();
    await page.waitForFunction(
      () => window.game?.sequenceManager?.currentStep === 'idle',
      null,
      { timeout: 5000 }
    );

    // Start the game
    await page.locator('#title-screen #title-menu button:has-text(\'New Game\')').click();
    await page.waitForFunction(() => window.game?.gameState === 'playing', null, { timeout: 10000 });

    // Simulate boss defeat to trigger ending
    await page.evaluate(() => {
      if (window.game && window.game.boss) {
        window.game.boss.takeDamage(window.game.boss.hp);
      }
    });

    // Wait for ending sequence to start
    await page.waitForFunction(
      () => window.game?.endingTimer <= 0 && window.game?.isEndingSequenceReady,
      null,
      { timeout: 15000 }
    );
    await expect(page.locator('#sequence-overlay')).toBeVisible({ timeout: 10000 });

    // Verify ending sequence is playing
    await page.waitForFunction(
      () => window.game?.sequenceManager?.currentStep === 'showingText',
      null,
      { timeout: 10000 }
    );

    // Click to skip ending sequence
    await page.locator('#sequence-overlay').click();

    // Verify ending sequence is skipped and game over screen appears
    await page.waitForFunction(
      () => window.game?.sequenceManager?.currentStep === 'idle',
      null,
      { timeout: 5000 }
    );

    await expect(page.locator('#game-over-screen')).toBeVisible({ timeout: 10000 });
  });
});