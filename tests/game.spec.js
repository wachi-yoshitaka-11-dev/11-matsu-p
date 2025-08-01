const { test, expect } = require('@playwright/test');

// GameState constants for testing
const GameState = {
  OPENING: 'opening',
  TITLE: 'title',
  PLAYING: 'playing',
  PAUSED: 'paused',
  ENDING: 'ending',
};

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
  test('should display the title screen after opening sequence', async ({
    page,
  }) => {
    await setupNetworkRoutes(page);
    await page.goto('/');

    // Wait for the sequence overlay to appear (indicating opening sequence started)
    await expect(page.locator('#sequence-overlay')).toBeVisible({
      timeout: 10000,
    });

    // Wait for the opening sequence to complete (gameState becomes 'title')
    await page.waitForFunction(
      (titleState) => {
        return window.game?.gameState === titleState;
      },
      GameState.TITLE,
      {
        timeout: 120000,
      }
    );

    await page.waitForSelector(
      '#title-screen #title-menu button:has-text(\'はじめから\')',
      { state: 'visible' }
    );

    const newGameButton = page.locator(
      '#title-screen #title-menu button:has-text(\'はじめから\')'
    );
    await expect(newGameButton).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#sequence-overlay')).not.toBeVisible();
  });

  test('should start the game when "はじめから" is clicked after opening sequence', async ({
    page,
  }) => {
    await setupNetworkRoutes(page);
    await page.goto('/');

    // Wait for the opening sequence to complete
    await page.waitForFunction(
      (titleState) => window.game?.gameState === titleState,
      GameState.TITLE,
      {
        timeout: 120000,
      }
    );

    await page.waitForSelector(
      '#title-screen #title-menu button:has-text(\'はじめから\')',
      { state: 'visible' }
    );

    const newGameButton = page.locator(
      '#title-screen #title-menu button:has-text(\'はじめから\')'
    );
    await expect(newGameButton).toBeVisible({ timeout: 10000 });
    await newGameButton.click();

    // Wait for the game state to change to 'playing' and HUD to be visible
    await page.waitForFunction(
      (playingState) => {
        try {
          return window.game?.gameState === playingState;
        } catch {
          return false;
        }
      },
      GameState.PLAYING,
      {
        timeout: 10000,
      }
    );
    await expect(page.locator('#hud')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Mofu Mofu Adventure - Sequence Tests', () => {
  test('should play opening sequence and transition to title screen', async ({
    page,
  }) => {
    await setupNetworkRoutes(page);
    await page.goto('/');

    // Wait for the sequence overlay to appear
    await expect(page.locator('#sequence-overlay')).toBeVisible({
      timeout: 10000,
    });

    // Wait for the opening sequence to complete
    await page.waitForFunction(
      (titleState) => window.game?.gameState === titleState,
      GameState.TITLE,
      {
        timeout: 120000,
      }
    );

    await page.waitForSelector(
      '#title-screen #title-menu button:has-text(\'はじめから\')',
      { state: 'visible' }
    );

    const newGameButton = page.locator(
      '#title-screen #title-menu button:has-text(\'はじめから\')'
    );
    await expect(newGameButton).toBeVisible();
    await expect(page.locator('#sequence-overlay')).not.toBeVisible();
  });

  test('should play ending sequence after boss defeat and transition to title screen', async ({
    page,
  }) => {
    await setupNetworkRoutes(page);
    await page.goto('/');

    // Wait for the opening sequence to complete
    await page.waitForFunction(
      (titleState) => window.game?.gameState === titleState,
      GameState.TITLE,
      {
        timeout: 120000,
      }
    );

    // Start the game
    await page
      .locator('#title-screen #title-menu button:has-text(\'はじめから\')')
      .click();
    await page.waitForFunction(
      (playingState) => window.game?.gameState === playingState,
      GameState.PLAYING,
      { timeout: 10000 }
    );

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
    await expect(page.locator('#sequence-overlay')).toBeVisible({
      timeout: 10000,
    });

    // Wait for the ending sequence to complete
    await page.waitForFunction(
      (titleState) => window.game?.gameState === titleState,
      GameState.TITLE,
      {
        timeout: 120000,
      }
    );

    await page.waitForSelector(
      '#title-screen #title-menu button:has-text(\'はじめから\')',
      { state: 'visible' }
    );

    const newGameButton = page.locator(
      '#title-screen #title-menu button:has-text(\'はじめから\')'
    );
    await expect(newGameButton).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#sequence-overlay')).not.toBeVisible();
  });
});

test.describe('Mofu Mofu Adventure - New Sequence Features Tests', () => {
  test('should support skipping opening sequence with Enter key', async ({
    page,
  }) => {
    await setupNetworkRoutes(page);
    await page.goto('/');

    // Wait for the sequence overlay to appear
    await expect(page.locator('#sequence-overlay')).toBeVisible({
      timeout: 10000,
    });

    // Wait a moment for the sequence to start properly
    await page.waitForTimeout(1000);

    // Press Enter to skip
    await page.keyboard.press('Enter');

    // Sequence should be skipped and title screen should appear quickly
    await page.waitForSelector(
      '#title-screen #title-menu button:has-text(\'はじめから\')',
      {
        state: 'visible',
        timeout: 5000,
      }
    );

    const newGameButton = page.locator(
      '#title-screen #title-menu button:has-text(\'はじめから\')'
    );
    await expect(newGameButton).toBeVisible();
    await expect(page.locator('#sequence-overlay')).not.toBeVisible();
  });

  test('should support skipping opening sequence with click', async ({
    page,
  }) => {
    await setupNetworkRoutes(page);
    await page.goto('/');

    // Wait for the sequence overlay to appear
    await expect(page.locator('#sequence-overlay')).toBeVisible({
      timeout: 10000,
    });

    // Wait a moment for the sequence to start properly
    await page.waitForTimeout(1000);

    // Click on the overlay to skip
    await page.locator('#sequence-overlay').click();

    // Sequence should be skipped and title screen should appear quickly
    await page.waitForSelector(
      '#title-screen #title-menu button:has-text(\'はじめから\')',
      {
        state: 'visible',
        timeout: 5000,
      }
    );

    const newGameButton = page.locator(
      '#title-screen #title-menu button:has-text(\'はじめから\')'
    );
    await expect(newGameButton).toBeVisible();
    await expect(page.locator('#sequence-overlay')).not.toBeVisible();
  });

  test('should display background images during opening sequence', async ({
    page,
  }) => {
    await setupNetworkRoutes(page);
    await page.goto('/');

    // Wait for the sequence overlay to appear
    await expect(page.locator('#sequence-overlay')).toBeVisible({
      timeout: 10000,
    });

    // Check if background image elements exist and have correct classes
    const backgroundImages = page.locator('.sequence-background-image');
    await expect(backgroundImages).toHaveCount(2);

    // Wait for at least one background image to become active
    await page.waitForFunction(
      () => {
        const activeImages = document.querySelectorAll(
          '.sequence-background-image.active'
        );
        return activeImages.length > 0;
      },
      null,
      { timeout: 5000 }
    );

    // Verify that at least one background image is active
    const activeBackgroundImage = page.locator(
      '.sequence-background-image.active'
    );
    await expect(activeBackgroundImage).toHaveCount(1);
  });

  test('should apply text size animations during opening sequence', async ({
    page,
  }) => {
    await setupNetworkRoutes(page);
    await page.goto('/');

    // Wait for the sequence overlay to appear
    await expect(page.locator('#sequence-overlay')).toBeVisible({
      timeout: 10000,
    });

    // Check if the text element has size animation classes applied

    // Wait for the first text with large animation to appear
    await page.waitForFunction(
      () => {
        const textEl = document.querySelector('#sequence-overlay > div');
        return (
          textEl &&
          (textEl.classList.contains('sequence-text-fade-in-large') ||
            textEl.classList.contains('sequence-text-visible-large'))
        );
      },
      null,
      { timeout: 5000 }
    );

    // Verify the text element has the appropriate class
    const hasLargeClass = await page.evaluate(() => {
      const textEl = document.querySelector('#sequence-overlay > div');
      return (
        textEl &&
        (textEl.classList.contains('sequence-text-fade-in-large') ||
          textEl.classList.contains('sequence-text-visible-large') ||
          textEl.classList.contains('sequence-text-fade-out-large'))
      );
    });

    expect(hasLargeClass).toBe(true);
  });

  test('should support skipping ending sequence', async ({ page }) => {
    await setupNetworkRoutes(page);
    await page.goto('/');

    // Wait for the opening sequence to complete
    await page.waitForFunction(
      (titleState) => window.game?.gameState === titleState,
      GameState.TITLE,
      { timeout: 120000 }
    );

    // Start the game
    await page
      .locator('#title-screen #title-menu button:has-text(\'はじめから\')')
      .click();
    await page.waitForFunction(
      (playingState) => window.game?.gameState === playingState,
      GameState.PLAYING,
      { timeout: 10000 }
    );

    // Simulate boss defeat
    await page.evaluate(() => {
      if (window.game && window.game.boss) {
        window.game.boss.takeDamage(window.game.boss.hp);
      }
    });

    // Wait for the ending sequence to start
    await page.waitForFunction(
      () => window.game?.endingTimer <= 0 && window.game?.isEndingSequenceReady,
      null,
      { timeout: 15000 }
    );
    await expect(page.locator('#sequence-overlay')).toBeVisible({
      timeout: 10000,
    });

    // Wait a moment for the sequence to start properly
    await page.waitForTimeout(1000);

    // Press Space to skip
    await page.keyboard.press('Space');

    // Ending sequence should be skipped and title screen should appear quickly
    await page.waitForSelector(
      '#title-screen #title-menu button:has-text(\'はじめから\')',
      {
        state: 'visible',
        timeout: 5000,
      }
    );

    const newGameButton = page.locator(
      '#title-screen #title-menu button:has-text(\'はじめから\')'
    );
    await expect(newGameButton).toBeVisible();
    await expect(page.locator('#sequence-overlay')).not.toBeVisible();
  });
});
