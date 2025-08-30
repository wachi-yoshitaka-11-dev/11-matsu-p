const { test, expect } = require('@playwright/test');

// GameState constants for testing
const GameState = {
  SPLASH_SCREEN: 'splashScreen',
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
  // Sequences.json route
  await page.route('**/data/sequences.json', (route) => {
    route.fulfill({
      path: require('path').join(__dirname, '../public/data/sequences.json'),
    });
  });
}

test.describe('Mofu Mofu Adventure - Startup Test', () => {
  test('should display the title screen after opening sequence', async ({
    page,
  }) => {
    await setupNetworkRoutes(page);
    await page.goto('/');

    // Click the "Touch to Start" button to start the game
    await page.locator('#click-to-start-screen').click();

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
        timeout: 30000,
      }
    );

    await page.waitForSelector(
      "#title-screen #title-menu button:has-text('はじめから')",
      { state: 'visible' }
    );

    const newGameButton = page.locator(
      "#title-screen #title-menu button:has-text('はじめから')"
    );
    await expect(newGameButton).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#sequence-overlay')).not.toBeVisible();
  });

  test('should start the game when "はじめから" is clicked after opening sequence', async ({
    page,
  }) => {
    await setupNetworkRoutes(page);
    await page.goto('/');

    // Click the "Touch to Start" button to start the game
    await page.locator('#click-to-start-screen').click();

    // Wait for the opening sequence to complete
    await page.waitForFunction(
      (titleState) => window.game?.gameState === titleState,
      GameState.TITLE,
      {
        timeout: 30000,
      }
    );

    await page.waitForSelector(
      "#title-screen #title-menu button:has-text('はじめから')",
      { state: 'visible' }
    );

    const newGameButton = page.locator(
      "#title-screen #title-menu button:has-text('はじめから')"
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

  test('should play death animation when enemy dies', async ({ page }) => {
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

    // Wait for enemies to be loaded
    await page.waitForFunction(() => window.game?.enemies?.length > 0, null, {
      timeout: 5000,
    });

    // Kill the first enemy by setting its HP to 0
    await page.evaluate(() => {
      const enemy = window.game.enemies[0];
      if (enemy) {
        enemy.takeDamage(enemy.hp);
      }
    });

    // Verify that the enemy plays death animation and becomes marked as dead
    await page.waitForFunction(
      () => {
        const enemy = window.game?.enemies?.[0];
        return enemy?.isDead === true && enemy?.currentAnimationName === 'die';
      },
      null,
      { timeout: 3000 }
    );

    // Wait for death animation to complete and enemy to be removed
    await page.waitForFunction(
      () => {
        return window.game?.enemies?.length === 0;
      },
      null,
      { timeout: 5000 }
    );
  });

  test('should display enemy health bar when player is close', async ({
    page,
  }) => {
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

    // Wait for enemies to be loaded
    await page.waitForFunction(() => window.game?.enemies?.length > 0, null, {
      timeout: 5000,
    });

    // Move player close to the first enemy
    await page.evaluate(() => {
      const enemy = window.game.enemies[0];
      const player = window.game.player;
      if (enemy && player) {
        // Position player close to enemy (within 5 units)
        const enemyPos = enemy.mesh.position;
        player.mesh.position.set(enemyPos.x + 3, enemyPos.y, enemyPos.z + 3);
      }
    });

    // Wait a moment for the health bar to appear
    await page.waitForTimeout(100);

    // Check if enemy health bar is visible
    await page.waitForFunction(
      () => {
        const healthBars = document.querySelectorAll('.enemy-health-bar');
        return healthBars.length > 0 && healthBars[0].style.display !== 'none';
      },
      null,
      { timeout: 3000 }
    );

    // Verify health bar content
    const healthBar = page.locator('.enemy-health-bar').first();
    await expect(healthBar).toBeVisible();

    // Move player away from the enemy
    await page.evaluate(() => {
      const player = window.game.player;
      if (player) {
        // Position player far from enemy (more than 10 units)
        player.mesh.position.set(50, 0, 50);
      }
    });

    // Wait a moment for the health bar to disappear
    await page.waitForTimeout(100);

    // Check if enemy health bar is hidden
    await page.waitForFunction(
      () => {
        const healthBars = document.querySelectorAll('.enemy-health-bar');
        return (
          healthBars.length === 0 || healthBars[0].style.display === 'none'
        );
      },
      null,
      { timeout: 3000 }
    );
  });

  test('should implement shield system similar to weapons', async ({
    page,
  }) => {
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

    // Check that shields data is loaded
    await page.waitForFunction(
      () => window.game?.data?.shields !== undefined,
      null,
      { timeout: 5000 }
    );

    // Check that player has shields array
    await page.waitForFunction(
      () => {
        const player = window.game?.player;
        return (
          player?.shields &&
          Array.isArray(player.shields) &&
          player.shields.length > 0
        );
      },
      null,
      { timeout: 3000 }
    );

    // Check that player has currentShieldIndex
    await page.waitForFunction(
      () => {
        const player = window.game?.player;
        return typeof player?.currentShieldIndex === 'number';
      },
      null,
      { timeout: 1000 }
    );

    // Test shield switching functionality
    const initialShieldIndex = await page.evaluate(() => {
      return window.game.player.currentShieldIndex;
    });

    // Switch shield
    await page.evaluate(() => {
      if (window.game.player.switchShield) {
        window.game.player.switchShield();
      }
    });

    // Verify shield index changed (if multiple shields available)
    await page.waitForFunction(
      () => {
        const player = window.game?.player;
        const hasMultipleShields = player?.shields?.length > 1;
        if (hasMultipleShields) {
          return player.currentShieldIndex !== initialShieldIndex;
        } else {
          // If only one shield, index should remain the same
          return player.currentShieldIndex === initialShieldIndex;
        }
      },
      null,
      { timeout: 1000 }
    );
  });

  test('should implement Elden Ring style movement controls', async ({
    page,
  }) => {
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

    // Test Jump (Space key)
    await page.keyboard.press('Space');
    await page.waitForFunction(
      () => {
        const player = window.game?.player;
        return player?.currentAnimationName === 'sit'; // Jump animation
      },
      null,
      { timeout: 2000 }
    );

    // Test Dash (Shift + movement)
    await page.keyboard.down('Shift');
    await page.keyboard.press('KeyW');
    await page.waitForTimeout(100);
    await page.keyboard.up('Shift');

    await page.waitForFunction(
      () => {
        const player = window.game?.player;
        return player?.isDashing === true;
      },
      null,
      { timeout: 1000 }
    );

    // Test Rolling (Shift + movement direction)
    await page.keyboard.down('Shift');
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(50); // Short press
    await page.keyboard.up('Shift');
    await page.keyboard.up('KeyW');

    await page.waitForFunction(
      () => {
        const player = window.game?.player;
        return player?.isRolling === true;
      },
      null,
      { timeout: 1000 }
    );

    // Test BackStep (Shift short press without movement)
    await page.keyboard.down('Shift');
    await page.waitForTimeout(100); // Short press
    await page.keyboard.up('Shift');

    await page.waitForFunction(
      () => {
        const player = window.game?.player;
        return player?.isBackStepping === true;
      },
      null,
      { timeout: 1000 }
    );
  });

  test('should implement equipment switching system with arrow keys', async ({
    page,
  }) => {
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

    // Test Right Arrow - Weapon switching
    const initialWeaponIndex = await page.evaluate(() => {
      return window.game.player.currentWeaponIndex;
    });

    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(100);

    await page.evaluate(() => {
      return window.game.player.currentWeaponIndex;
    });

    // Verify weapon switched (if multiple weapons available)
    const weaponSwitchResult = await page.evaluate((initialIndex) => {
      const player = window.game?.player;
      const hasMultipleWeapons = player?.weapons?.length > 1;
      if (hasMultipleWeapons) {
        return player.currentWeaponIndex !== initialIndex;
      } else {
        return player.currentWeaponIndex === initialIndex;
      }
    }, initialWeaponIndex);

    expect(weaponSwitchResult).toBe(true);

    // Test Left Arrow - Shield switching
    const initialShieldIndex = await page.evaluate(() => {
      return window.game.player.currentShieldIndex;
    });

    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(100);

    const shieldSwitchResult = await page.evaluate((initialIndex) => {
      const player = window.game?.player;
      const hasMultipleShields = player?.shields?.length > 1;
      if (hasMultipleShields) {
        return player.currentShieldIndex !== initialIndex;
      } else {
        return player.currentShieldIndex === initialIndex;
      }
    }, initialShieldIndex);

    expect(shieldSwitchResult).toBe(true);

    // Test Down Arrow - Item switching
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(100);

    const itemIndexResult = await page.evaluate(() => {
      const player = window.game?.player;
      return typeof player?.currentItemIndex === 'number';
    });

    expect(itemIndexResult).toBe(true);

    // Test Up Arrow - Skill switching
    const initialSkillIndex = await page.evaluate(() => {
      return window.game.player.currentSkillIndex;
    });

    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(100);

    const skillSwitchResult = await page.evaluate((initialIndex) => {
      const player = window.game?.player;
      const hasMultipleSkills = player?.skills?.length > 1;
      if (hasMultipleSkills) {
        return player.currentSkillIndex !== initialIndex;
      } else {
        return player.currentSkillIndex === initialIndex;
      }
    }, initialSkillIndex);

    expect(skillSwitchResult).toBe(true);

    // Test Equipment UI visibility
    const equipmentUIVisible = await page.evaluate(() => {
      const equipmentUI = document.querySelector('#equipment-container');
      return equipmentUI && equipmentUI.style.display !== 'none';
    });

    expect(equipmentUIVisible).toBe(true);
  });

  test('should implement improved combat system with weak/strong attacks and guard', async ({
    page,
  }) => {
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

    // Test combat system properties
    const combatState = await page.evaluate(() => {
      const player = window.game?.player;
      return {
        hasAttackStates:
          typeof player?.isPerformingWeakAttack === 'boolean' &&
          typeof player?.isPerformingStrongAttack === 'boolean',
        hasGuardState: 'isGuarding' in (player || {}),
        guardValue: player?.isGuarding,
        hasShieldDefense: typeof player?.getShieldDefense === 'function',
        hasPerformAttack:
          typeof window.game?.inputController?.performAttack === 'function',
        playerProperties: Object.keys(player || {}).filter((k) =>
          k.startsWith('is')
        ),
      };
    });

    expect(combatState.hasAttackStates).toBe(true);
    expect(combatState.hasGuardState).toBe(true);
    expect(combatState.hasShieldDefense).toBe(true);
    expect(combatState.hasPerformAttack).toBe(true);
  });

  test('should implement item and skill usage system with R and F keys', async ({
    page,
  }) => {
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

    // Test R key - Item usage
    const initialInventoryLength = await page.evaluate(() => {
      return window.game?.player?.inventory?.length || 0;
    });

    if (initialInventoryLength > 0) {
      const initialHP = await page.evaluate(() => {
        return window.game?.player?.hp;
      });

      await page.keyboard.press('KeyR');
      await page.waitForTimeout(200);

      const afterItemUseState = await page.evaluate(() => {
        const player = window.game?.player;
        return {
          hp: player?.hp,
          inventoryLength: player?.inventory?.length || 0,
          hasUseCurrentItem: typeof player?.useCurrentItem === 'function',
        };
      });

      expect(afterItemUseState.hasUseCurrentItem).toBe(true);
      // Item should be used if it was a potion and HP was not full
      if (initialHP < 90) {
        expect(afterItemUseState.hp).toBeGreaterThan(initialHP);
      }
    }

    // Test F key - Skill usage
    const initialFP = await page.evaluate(() => {
      return window.game?.player?.fp;
    });

    await page.keyboard.press('KeyF');
    await page.waitForTimeout(200);

    const afterSkillUseState = await page.evaluate(() => {
      const player = window.game?.player;
      return {
        fp: player?.fp,
        isUsingSkill: player?.isUsingSkill,
        hasUseCurrentSkill: typeof player?.useCurrentSkill === 'function',
      };
    });

    expect(afterSkillUseState.hasUseCurrentSkill).toBe(true);
    // Skill should consume FP if used
    if (initialFP >= 10) {
      expect(afterSkillUseState.fp).toBeLessThan(initialFP);
    }
  });

  test('should implement lock-on system with wheel click and mouse wheel', async ({
    page,
  }) => {
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

    // Wait for enemies to be loaded
    await page.waitForFunction(() => window.game?.enemies?.length > 0, null, {
      timeout: 5000,
    });

    // Test wheel click lock-on
    await page.locator('canvas').click({ button: 'middle' });

    await page.waitForFunction(
      () => {
        const player = window.game?.player;
        return (
          player?.lockedTarget !== null && player?.lockedTarget !== undefined
        );
      },
      null,
      { timeout: 3000 }
    );

    // Verify lock-on target is set
    const lockOnState = await page.evaluate(() => {
      const player = window.game?.player;
      return {
        hasLockedTarget:
          player?.lockedTarget !== null && player?.lockedTarget !== undefined,
        targetIsEnemy: player?.lockedTarget?.constructor.name === 'Enemy',
        lockOnUIVisible: !!document.querySelector('.lock-on-target'),
      };
    });

    expect(lockOnState.hasLockedTarget).toBe(true);
    expect(lockOnState.targetIsEnemy).toBe(true);

    // Test mouse wheel target switching (if multiple enemies)
    const enemyCount = await page.evaluate(
      () => window.game?.enemies?.length || 0
    );

    if (enemyCount > 1) {
      const initialTargetId = await page.evaluate(
        () => window.game?.player?.lockedTarget?.mesh?.uuid || null
      );

      // Mouse wheel down to switch target (next)
      await page.mouse.wheel(0, 100);
      await page.waitForTimeout(100);

      const nextTargetId = await page.evaluate(
        () => window.game?.player?.lockedTarget?.mesh?.uuid || null
      );
      expect(nextTargetId).not.toBe(initialTargetId);

      // Mouse wheel up to switch target (previous)
      await page.mouse.wheel(0, -100);
      await page.waitForTimeout(100);

      const prevTargetId = await page.evaluate(
        () => window.game?.player?.lockedTarget?.mesh?.uuid || null
      );
      expect(prevTargetId).not.toBe(nextTargetId);
    }

    // Test lock-on release (wheel click again)
    await page.locator('canvas').click({ button: 'middle' });

    await page.waitForFunction(
      () => {
        const player = window.game?.player;
        return player?.lockedTarget === null;
      },
      null,
      { timeout: 2000 }
    );
  });
});

test.describe('Mofu Mofu Adventure - Sequence Tests', () => {
  test('should play opening sequence and transition to title screen', async ({
    page,
  }) => {
    await setupNetworkRoutes(page);
    await page.goto('/');

    // Click the "Touch to Start" button to start the game
    await page.locator('#click-to-start-screen').click();

    // Wait for the sequence overlay to appear
    await expect(page.locator('#sequence-overlay')).toBeVisible({
      timeout: 30000,
    });

    // Wait for the opening sequence to complete
    await page.waitForFunction(
      (titleState) => window.game?.gameState === titleState,
      GameState.TITLE,
      {
        timeout: 30000,
      }
    );

    await page.waitForSelector(
      "#title-screen #title-menu button:has-text('はじめから')",
      { state: 'visible' }
    );

    const newGameButton = page.locator(
      "#title-screen #title-menu button:has-text('はじめから')"
    );
    await expect(newGameButton).toBeVisible();
    await expect(page.locator('#sequence-overlay')).not.toBeVisible();
  });

  test('should play ending sequence after boss defeat and transition to title screen', async ({
    page,
  }) => {
    await setupNetworkRoutes(page);
    await page.goto('/');

    // Click the "Touch to Start" button to start the game
    await page.locator('#click-to-start-screen').click();

    // Wait for the opening sequence to complete
    await page.waitForFunction(
      (titleState) => window.game?.gameState === titleState,
      GameState.TITLE,
      {
        timeout: 30000,
      }
    );

    // Start the game
    await page
      .locator("#title-screen #title-menu button:has-text('はじめから')")
      .click();
    await page.waitForFunction(
      (playingState) => window.game?.gameState === playingState,
      GameState.PLAYING,
      { timeout: 10000 }
    );

    // Simulate boss defeat and trigger ending sequence directly
    await page.evaluate(() => {
      if (window.game && window.game.boss) {
        // Defeat the boss
        window.game.boss.takeDamage(window.game.boss.hp);
        // Reset status points to 0 to trigger ending sequence
        if (window.game.player) {
          window.game.player.statusPoints = 0;
        }
        // Directly trigger ending sequence for test
        window.game.playEndingSequence();
        window.game.isEndingSequenceReady = true;
      }
    });
    await expect(page.locator('#sequence-overlay')).toBeVisible({
      timeout: 10000,
    });

    // Wait for the ending sequence to complete
    await page.waitForFunction(
      (titleState) => window.game?.gameState === titleState,
      GameState.TITLE,
      {
        timeout: 60000, // Longer timeout for full ending sequence
      }
    );

    await page.waitForSelector(
      "#title-screen #title-menu button:has-text('はじめから')",
      { state: 'visible' }
    );

    const newGameButton = page.locator(
      "#title-screen #title-menu button:has-text('はじめから')"
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

    // Click the "Touch to Start" button to start the game
    await page.locator('#click-to-start-screen').click();

    // Wait for the sequence overlay to appear
    await expect(page.locator('#sequence-overlay')).toBeVisible({
      timeout: 30000,
    });

    // Wait a moment for the sequence to start properly
    await page.waitForTimeout(1000);

    // Press Enter to skip
    await page.keyboard.press('Enter');

    // Sequence should be skipped and title screen should appear quickly
    await page.waitForSelector(
      "#title-screen #title-menu button:has-text('はじめから')",
      {
        state: 'visible',
        timeout: 30000,
      }
    );

    const newGameButton = page.locator(
      "#title-screen #title-menu button:has-text('はじめから')"
    );
    await expect(newGameButton).toBeVisible();
    await expect(page.locator('#sequence-overlay')).not.toBeVisible();
  });

  test('should support skipping opening sequence with click', async ({
    page,
  }) => {
    await setupNetworkRoutes(page);
    await page.goto('/');

    // Click the "Touch to Start" button to start the game
    await page.locator('#click-to-start-screen').click();

    // Wait for the sequence overlay to appear
    await expect(page.locator('#sequence-overlay')).toBeVisible({
      timeout: 30000,
    });

    // Wait a moment for the sequence to start properly
    await page.waitForTimeout(1000);

    // Click on the overlay to skip
    await page.locator('#sequence-overlay').click();

    // Sequence should be skipped and title screen should appear quickly
    await page.waitForSelector(
      "#title-screen #title-menu button:has-text('はじめから')",
      {
        state: 'visible',
        timeout: 30000,
      }
    );

    const newGameButton = page.locator(
      "#title-screen #title-menu button:has-text('はじめから')"
    );
    await expect(newGameButton).toBeVisible();
    await expect(page.locator('#sequence-overlay')).not.toBeVisible();
  });

  test('should display background images during opening sequence', async ({
    page,
  }) => {
    await setupNetworkRoutes(page);
    await page.goto('/');

    // Click the "Touch to Start" button to start the game
    await page.locator('#click-to-start-screen').click();

    // Wait for the sequence overlay to appear
    await expect(page.locator('#sequence-overlay')).toBeVisible({
      timeout: 30000,
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

    // Click the "Touch to Start" button to start the game
    await page.locator('#click-to-start-screen').click();

    // Wait for the sequence overlay to appear
    await expect(page.locator('#sequence-overlay')).toBeVisible({
      timeout: 30000,
    });

    // Check if the text element has size animation classes applied

    // Wait for the first text with large animation to appear
    await page.waitForFunction(
      () => {
        const textEl = document.querySelector('#sequence-overlay > div');
        return (
          textEl &&
          (textEl.classList.contains('sequence-text-large') ||
            textEl.classList.contains('sequence-text-small'))
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
        (textEl.classList.contains('sequence-text-large') ||
          textEl.classList.contains('sequence-text-small'))
      );
    });

    expect(hasLargeClass).toBe(true);
  });

  test('should support skipping ending sequence', async ({ page }) => {
    await setupNetworkRoutes(page);
    await page.goto('/');

    // Click the "Touch to Start" button to start the game
    await page.locator('#click-to-start-screen').click();

    // Wait for the opening sequence to complete
    await page.waitForFunction(
      (titleState) => window.game?.gameState === titleState,
      GameState.TITLE,
      { timeout: 30000 }
    );

    // Start the game
    await page
      .locator("#title-screen #title-menu button:has-text('はじめから')")
      .click();
    await page.waitForFunction(
      (playingState) => window.game?.gameState === playingState,
      GameState.PLAYING,
      { timeout: 10000 }
    );

    // Simulate boss defeat and trigger ending sequence directly
    await page.evaluate(() => {
      if (window.game && window.game.boss) {
        // Defeat the boss
        window.game.boss.takeDamage(window.game.boss.hp);
        // Reset status points to 0 to trigger ending sequence
        if (window.game.player) {
          window.game.player.statusPoints = 0;
        }
        // Directly trigger ending sequence for test
        window.game.playEndingSequence();
        window.game.isEndingSequenceReady = true;
      }
    });
    await expect(page.locator('#sequence-overlay')).toBeVisible({
      timeout: 10000,
    });

    // Wait a moment for the sequence to start properly
    await page.waitForTimeout(1000);

    // Press Space to skip
    await page.keyboard.press('Space');

    // Ending sequence should be skipped and title screen should appear quickly
    await page.waitForSelector(
      "#title-screen #title-menu button:has-text('はじめから')",
      {
        state: 'visible',
        timeout: 5000,
      }
    );

    const newGameButton = page.locator(
      "#title-screen #title-menu button:has-text('はじめから')"
    );
    await expect(newGameButton).toBeVisible();
    await expect(page.locator('#sequence-overlay')).not.toBeVisible();
  });

  test('should display minimap in top-right corner during gameplay', async ({
    page,
  }) => {
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

    const newGameButton = page
      .locator(
        "#title-screen #title-menu button:has-text('はじめから'), " +
          "#title-screen #title-menu button:has-text('New Game')"
      )
      .first();
    await newGameButton.click();

    // Wait for the game to start
    await page.waitForFunction(
      () => window.game?.gameState === 'playing',
      null,
      { timeout: 10000 }
    );

    // Check that minimap is visible during gameplay
    const minimapContainer = page.locator('#minimap-container');
    await expect(minimapContainer).toBeVisible();

    // Check minimap position (top-right)
    const containerBox = await minimapContainer.boundingBox();
    const viewportSize = await page.viewportSize();

    expect(containerBox.x).toBeGreaterThan(viewportSize.width - 200); // Right side
    expect(containerBox.y).toBeLessThan(100); // Top area

    // Check minimap canvas exists and has correct size
    const minimapCanvas = page.locator('#minimap-canvas');
    await expect(minimapCanvas).toBeVisible();

    const canvasBox = await minimapCanvas.boundingBox();
    // Use runtime size from minimap instance to avoid hardcoding
    const runtimeSize = await page.evaluate(() => {
      const g = window.game;
      const mm = g?.hud?.minimap || g?.minimap;
      return mm?.size ?? 180;
    });
    expect(canvasBox.width).toBe(runtimeSize);
    expect(canvasBox.height).toBe(runtimeSize);

    // Test minimap functionality
    const minimapState = await page.evaluate(() => {
      const game = window.game;
      const minimap = game?.hud?.minimap || game?.minimap;
      return {
        minimapExists: !!minimap,
        isVisible: minimap?.isVisible,
        hasMapData: !!minimap?.mapData,
        hasCanvas: !!minimap?.canvas,
        hasContext: !!minimap?.ctx,
        size: minimap?.size,
        playerExists: !!game?.player,
        playerPosition: game?.player?.mesh?.position
          ? {
              x: game.player.mesh.position.x,
              y: game.player.mesh.position.y,
              z: game.player.mesh.position.z,
            }
          : null,
      };
    });

    expect(minimapState.minimapExists).toBe(true);
    expect(minimapState.isVisible).toBe(true);
    expect(minimapState.hasMapData).toBe(true);
    expect(minimapState.hasCanvas).toBe(true);
    expect(minimapState.hasContext).toBe(true);
    // Size is validated against canvasBox above
    expect(minimapState.size).toBeTruthy();
    expect(minimapState.playerExists).toBe(true);
    expect(minimapState.playerPosition).toBeTruthy();
  });

  test('should update minimap when player moves', async ({ page }) => {
    await setupNetworkRoutes(page);

    await page.goto('/');

    await page.waitForFunction(
      () =>
        document.querySelector('#title-screen #title-menu button')
          ?.offsetParent !== null,
      null,
      { timeout: 10000 }
    );

    // Use an i18n-safe locator to match either Japanese or English text, then pick the first match
    const newGameButton = page
      .locator(
        "#title-screen #title-menu button:has-text('はじめから'), " +
          "#title-screen #title-menu button:has-text('New Game')"
      )
      .first();
    await newGameButton.click();

    await page.waitForFunction(
      () => window.game?.gameState === 'playing',
      null,
      { timeout: 10000 }
    );

    // Get initial player position (now from mesh.position)
    const initialPosition = await page.evaluate(() => {
      const player = window.game?.player;
      return player?.mesh?.position
        ? {
            x: player.mesh.position.x,
            z: player.mesh.position.z,
          }
        : null;
    });

    expect(initialPosition).toBeTruthy();

    // Move player
    await page.keyboard.press('KeyW');
    await page.waitForTimeout(500);

    // Check that player position has changed (from mesh.position)
    const newPosition = await page.evaluate(() => {
      const player = window.game?.player;
      return player?.mesh?.position
        ? {
            x: player.mesh.position.x,
            z: player.mesh.position.z,
          }
        : null;
    });

    expect(newPosition).toBeTruthy();
    expect(
      newPosition.x !== initialPosition.x || newPosition.z !== initialPosition.z
    ).toBe(true);

    // Verify minimap is still updating (use hud.minimap if available)
    const minimapUpdateStatus = await page.evaluate(() => {
      const minimap = window.game?.hud?.minimap || window.game?.minimap;
      return {
        isVisible: minimap?.isVisible,
        lastUpdateTime: minimap?.lastUpdateTime > 0,
        statsDrawCalls: minimap?.stats?.drawCalls > 0,
      };
    });

    expect(minimapUpdateStatus.isVisible).toBe(true);
    expect(minimapUpdateStatus.lastUpdateTime).toBe(true);
  });

  test('should keep minimap visible when game is paused', async ({ page }) => {
    await setupNetworkRoutes(page);

    await page.goto('/');

    await page.waitForFunction(
      () =>
        document.querySelector('#title-screen #title-menu button')
          ?.offsetParent !== null,
      null,
      { timeout: 10000 }
    );

    const newGameButton = page
      .locator(
        "#title-screen #title-menu button:has-text('はじめから'), " +
          "#title-screen #title-menu button:has-text('New Game')"
      )
      .first();
    await newGameButton.click();

    await page.waitForFunction(
      () => window.game?.gameState === 'playing',
      null,
      { timeout: 10000 }
    );

    // Check minimap is visible during gameplay
    await expect(page.locator('#minimap-container')).toBeVisible();

    // Pause the game
    await page.keyboard.press('Escape');

    // Wait for pause state
    await page.waitForFunction(
      () => window.game?.gameState === 'paused',
      null,
      { timeout: 2000 }
    );

    // Verify minimap behavior during pause
    const pausedState = await page.evaluate(() => {
      const minimap = window.game?.hud?.minimap || window.game?.minimap;
      return {
        isVisible: minimap?.isVisible,
        containerDisplay:
          document.getElementById('minimap-container')?.style.display,
        gameState: window.game?.gameState,
      };
    });

    expect(pausedState.gameState).toBe('paused');
    // Minimap should remain visible during pause (updates may throttle)
    expect(pausedState.isVisible).toBe(true);
  });
});
