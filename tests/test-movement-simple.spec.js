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

test.describe('Movement System Test', () => {
  test('should have movement state properties', async ({ page }) => {
    await setupNetworkRoutes(page);

    // Go to the game page
    await page.goto('/');

    // Wait for the title screen and start the game
    await page.waitForFunction(
      () =>
        document.querySelector('#title-screen #title-menu button')
          ?.offsetParent !== null,
      null,
      { timeout: 10000 }
    );

    const newGameButton = page.locator(
      "#title-screen #title-menu button:has-text('New Game')"
    );
    await newGameButton.click();

    // Wait for the game to start
    await page.waitForFunction(
      () => window.game?.gameState === 'playing',
      null,
      { timeout: 10000 }
    );

    // Check that player has movement state properties
    const playerState = await page.evaluate(() => {
      const player = window.game?.player;
      if (!player) return { error: 'No player found' };

      return {
        playerExists: !!player,
        hasIsJumping: 'isJumping' in player,
        hasIsRolling: 'isRolling' in player,
        hasIsBackStepping: 'isBackStepping' in player,
        hasIsDashing: 'isDashing' in player,
        isJumping: player.isJumping,
        isRolling: player.isRolling,
        isBackStepping: player.isBackStepping,
        isDashing: player.isDashing,
        playerKeys: Object.keys(player).filter((k) => k.startsWith('is')),
      };
    });

    expect(playerState.hasIsJumping).toBe(true);
    expect(playerState.hasIsRolling).toBe(true);
    expect(playerState.hasIsBackStepping).toBe(true);
    expect(playerState.hasIsDashing).toBe(true);

    // Initial state should be false (or undefined which gets converted to false in boolean context)
    expect(playerState.isJumping).toBe(false);
    expect(playerState.isRolling).toBe(false);
    expect(playerState.isBackStepping).toBe(false);
    expect(
      playerState.isDashing === false || playerState.isDashing === undefined
    ).toBe(true);
  });

  test('should trigger jump animation on Space key', async ({ page }) => {
    await setupNetworkRoutes(page);

    await page.goto('/');

    await page.waitForFunction(
      () =>
        document.querySelector('#title-screen #title-menu button')
          ?.offsetParent !== null,
      null,
      { timeout: 10000 }
    );

    const newGameButton = page.locator(
      "#title-screen #title-menu button:has-text('New Game')"
    );
    await newGameButton.click();

    await page.waitForFunction(
      () => window.game?.gameState === 'playing',
      null,
      { timeout: 10000 }
    );

    // Press Space key
    await page.keyboard.press('Space');

    // Wait a moment for the action to be processed
    await page.waitForTimeout(100);

    // Check if jump state is activated
    const jumpState = await page.evaluate(() => {
      const player = window.game?.player;
      return {
        isJumping: player.isJumping,
        currentAnimation: player.currentAnimationName,
      };
    });

    // Should have triggered jump
    expect(jumpState.isJumping).toBe(true);
  });
});
