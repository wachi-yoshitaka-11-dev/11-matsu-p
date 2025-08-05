const { test, expect } = require('@playwright/test');
const path = require('path');

// GameState constants for testing
const GameState = {
  OPENING: 'opening',
  TITLE: 'title',
  PLAYING: 'playing',
  PAUSED: 'paused',
  ENDING: 'ending',
};

// Helper function to set up network routes for local files
async function setupNetworkRoutes(page) {
  await page.route(
    'https://unpkg.com/three@0.160.0/build/three.module.js',
    (route) => {
      route.fulfill({
        path: path.join(
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
      const localPath = path.join(
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
        path: path.join(__dirname, `../public/data/${file}.json`),
      });
    });
  }
}

// Helper function to navigate to game and handle initial screens
async function navigateAndStartGame(page) {
  await setupNetworkRoutes(page);
  await page.goto('/');

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

  // Click the "タッチしてはじめる" button
  await page.locator('#click-to-start-screen').click();

  // Wait for the opening sequence to start
  await expect(page.locator('#sequence-overlay')).toBeVisible({
    timeout: 10000,
  });

  // NEW: Skip the opening sequence immediately
  await page.keyboard.press('Enter');

  // Wait for the opening sequence to complete (gameState becomes 'title')
  // Wait for the game state to become TITLE
  await page.waitForFunction(
    (titleState) => window.game?.gameState === titleState,
    GameState.TITLE,
    { timeout: 30000 }
  );

  // Now wait for the title screen to actually be displayed (after the setTimeout)
  await page.waitForFunction(
    () => document.getElementById('title-screen')?.style.display === 'flex',
    null,
    { timeout: 10000 } // 10 seconds should be enough for the 500ms setTimeout
  );
  await page
    .locator('#new-game-button')
    .waitFor({ state: 'visible', timeout: 10000 });

  // Click "はじめから" button
  await page.locator('#new-game-button').click();

  // Wait for the game state to change to 'playing'
  await page.waitForFunction(
    (playingState) => window.game?.gameState === playingState,
    GameState.PLAYING,
    { timeout: 30000 }
  );

  // Assert no console errors
  expect(errors).toEqual([]);
}

test.describe('Mofu Mofu Adventure - Core Game Flow', () => {
  test('should start game and display HUD', async ({ page }) => {
    await navigateAndStartGame(page);
    await expect(page.locator('#hud')).toBeVisible();
  });

  test('should initialize stage system and load tutorial plains', async ({
    page,
  }) => {
    await navigateAndStartGame(page);

    // Check if stage manager is initialized and current stage is tutorial-plains
    await page.waitForFunction(
      () => window.game?.stageManager?.currentStage?.id === 'tutorial-plains',
      null,
      { timeout: 10000 }
    );
    const currentStageId = await page.evaluate(
      () => window.game?.stageManager?.currentStage?.id
    );
    expect(currentStageId).toBe('tutorial-plains');

    // Check if stage info is displayed
    await expect(page.locator('#stage-info')).toBeVisible();
    await expect(page.locator('#current-stage-name')).toBeVisible();
    await expect(page.locator('#stage-progress')).toBeVisible();
    await expect(page.locator('#stage-clear-status')).toBeVisible();
  });

  test('should pause and resume game with Escape key', async ({ page }) => {
    await navigateAndStartGame(page);

    // Press Escape to pause
    await page.keyboard.press('Escape');
    await page.waitForFunction(
      () => window.game?.gameState === 'paused',
      null,
      { timeout: 5000 }
    );
    await expect(page.locator('#pause-menu')).toBeVisible();

    // Press Escape again to resume
    await page.keyboard.press('Escape');
    await page.waitForFunction(
      () => window.game?.gameState === 'playing',
      null,
      { timeout: 5000 }
    );
    await expect(page.locator('#pause-menu')).not.toBeVisible();
  });
});

test.describe('Mofu Mofu Adventure - Player & Combat', () => {
  test('should play death animation when enemy dies and remove from scene', async ({
    page,
  }) => {
    await navigateAndStartGame(page);

    // Wait for enemies to be loaded
    await page.waitForFunction(() => window.game?.enemies?.length > 0, null, {
      timeout: 5000,
    });

    // Kill the first enemy
    await page.evaluate(() => {
      const enemy = window.game.enemies[0];
      if (enemy) {
        enemy.takeDamage(enemy.hp);
      }
    });

    // Verify death animation and removal
    await page.waitForFunction(
      () =>
        window.game?.enemies?.length === 0 ||
        window.game?.enemies?.[0]?.isDead === true,
      null,
      { timeout: 5000 }
    );
    const enemyCountAfterDeath = await page.evaluate(
      () => window.game?.enemies?.length
    );
    expect(enemyCountAfterDeath).toBe(0); // All enemies from tutorial plains should be gone
  });

  test('should display enemy health bar when player is close and hide when far', async ({
    page,
  }) => {
    await navigateAndStartGame(page);

    await page.waitForFunction(() => window.game?.enemies?.length > 0, null, {
      timeout: 5000,
    });

    // Move player close to the first enemy
    await page.evaluate(() => {
      const enemy = window.game.enemies[0];
      const player = window.game.player;
      if (enemy && player) {
        const enemyPos = enemy.mesh.position;
        player.mesh.position.set(enemyPos.x + 3, enemyPos.y, enemyPos.z + 3);
      }
    });

    await page.waitForFunction(
      () => {
        const healthBars = document.querySelectorAll('.enemy-health-bar');
        return healthBars.length > 0 && healthBars[0].style.display !== 'none';
      },
      null,
      { timeout: 3000 }
    );
    await expect(page.locator('.enemy-health-bar').first()).toBeVisible();

    // Move player far away
    await page.evaluate(() => {
      const player = window.game.player;
      if (player) {
        player.mesh.position.set(50, 0, 50);
      }
    });

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
    await expect(page.locator('.enemy-health-bar').first()).not.toBeVisible();
  });

  test('should implement Elden Ring style movement controls (Jump, Dash, Roll, Backstep)', async ({
    page,
  }) => {
    await navigateAndStartGame(page);

    // Test Jump (Space key)
    await page.keyboard.press('Space');
    await page.waitForFunction(
      () => window.game?.player?.isJumping === true,
      null,
      { timeout: 1000 }
    );
    await page.waitForFunction(
      () => window.game?.player?.isJumping === false,
      null,
      { timeout: 2000 }
    ); // Wait for jump to finish

    // Test Dash (Shift + movement)
    await page.keyboard.down('Shift');
    await page.keyboard.press('KeyW');
    await page.waitForFunction(
      () => window.game?.player?.isDashing === true,
      null,
      { timeout: 1000 }
    );
    await page.keyboard.up('Shift');
    await page.keyboard.up('KeyW');
    await page.waitForFunction(
      () => window.game?.player?.isDashing === false,
      null,
      { timeout: 1000 }
    );

    // Test Rolling (Shift + movement short press)
    await page.keyboard.down('Shift');
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(50); // Short press
    await page.keyboard.up('Shift');
    await page.keyboard.up('KeyW');
    await page.waitForFunction(
      () => window.game?.player?.isRolling === true,
      null,
      { timeout: 1000 }
    );
    await page.waitForFunction(
      () => window.game?.player?.isRolling === false,
      null,
      { timeout: 2000 }
    ); // Wait for roll to finish

    // Test BackStep (Shift short press without movement)
    await page.keyboard.down('Shift');
    await page.waitForTimeout(50); // Short press
    await page.keyboard.up('Shift');
    await page.waitForFunction(
      () => window.game?.player?.isBackStepping === true,
      null,
      { timeout: 1000 }
    );
    await page.waitForFunction(
      () => window.game?.player?.isBackStepping === false,
      null,
      { timeout: 2000 }
    ); // Wait for backstep to finish
  });

  test('should implement equipment switching system with arrow keys and update HUD', async ({
    page,
  }) => {
    await navigateAndStartGame(page);

    // Test Right Arrow - Weapon switching
    const initialWeaponName = await page.evaluate(
      () => window.game?.player?.getCurrentWeapon()?.name
    );
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(100);
    const newWeaponName = await page.evaluate(
      () => window.game?.player?.getCurrentWeapon()?.name
    );
    expect(newWeaponName).not.toBe(initialWeaponName);
    await expect(
      page.locator('#equipment-container .weapon .item-name')
    ).toHaveText(newWeaponName);

    // Test Left Arrow - Shield switching
    const initialShieldName = await page.evaluate(
      () => window.game?.player?.getCurrentShield()?.name
    );
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(100);
    const newShieldName = await page.evaluate(
      () => window.game?.player?.getCurrentShield()?.name
    );
    expect(newShieldName).not.toBe(initialShieldName);
    await expect(
      page.locator('#equipment-container .shield .item-name')
    ).toHaveText(newShieldName);

    // Test Down Arrow - Item switching
    const initialItemName = await page.evaluate(() =>
      window.game?.player?.getCurrentItem()
    );
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(100);
    const newItemName = await page.evaluate(() =>
      window.game?.player?.getCurrentItem()
    );
    expect(newItemName).not.toBe(initialItemName);
    await expect(
      page.locator('#equipment-container .item .item-name')
    ).toHaveText(
      await page.evaluate(
        (item) => window.game.data.items[item]?.name || item,
        newItemName
      )
    );

    // Test Up Arrow - Skill switching
    const initialSkillName = await page.evaluate(
      () => window.game?.player?.getCurrentSkill()?.name
    );
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(100);
    const newSkillName = await page.evaluate(
      () => window.game?.player?.getCurrentSkill()?.name
    );
    expect(newSkillName).not.toBe(initialSkillName);
    await expect(
      page.locator('#equipment-container .skill .item-name')
    ).toHaveText(newSkillName);
  });

  test('should implement improved combat system with weak/strong attacks and guard', async ({
    page,
  }) => {
    await navigateAndStartGame(page);

    // Test weak attack (left click)
    await page.mouse.click(400, 300, { button: 'left' });
    await page.waitForFunction(
      () => window.game?.player?.isAttackingWeak === true,
      null,
      { timeout: 1000 }
    );
    await page.waitForFunction(
      () => window.game?.player?.isAttackingWeak === false,
      null,
      { timeout: 2000 }
    );

    // Test strong attack (left click while holding Ctrl)
    await page.keyboard.down('Control');
    await page.mouse.click(400, 300, { button: 'left' });
    await page.waitForFunction(
      () => window.game?.player?.isAttackingStrong === true,
      null,
      { timeout: 1000 }
    );
    await page.waitForFunction(
      () => window.game?.player?.isAttackingStrong === false,
      null,
      { timeout: 2000 }
    );
    await page.keyboard.up('Control');

    // Test guard (G key)
    await page.keyboard.down('KeyG');
    await page.waitForFunction(
      () => window.game?.player?.isGuarding === true,
      null,
      { timeout: 1000 }
    );
    await page.keyboard.up('KeyG');
    await page.waitForFunction(
      () => window.game?.player?.isGuarding === false,
      null,
      { timeout: 1000 }
    );
  });

  test('should implement item and skill usage system with R and F keys', async ({
    page,
  }) => {
    await navigateAndStartGame(page);

    // Test R key - Item usage (potion)
    const initialHP = await page.evaluate(() => window.game?.player?.hp);
    await page.keyboard.press('KeyR');
    await page.waitForTimeout(500); // Give time for item effect
    const afterItemUseHP = await page.evaluate(() => window.game?.player?.hp);
    expect(afterItemUseHP).toBeGreaterThan(initialHP);
    expect(
      await page.evaluate(() => window.game?.player?.inventory?.length)
    ).toBeLessThan(
      await page.evaluate(
        () => window.game?.data?.player?.initialInventory?.length
      )
    );

    // Test F key - Skill usage (projectile)
    const initialFP = await page.evaluate(() => window.game?.player?.fp);
    await page.keyboard.press('KeyF');
    await page.waitForTimeout(500); // Give time for skill effect
    const afterSkillUseFP = await page.evaluate(() => window.game?.player?.fp);
    expect(afterSkillUseFP).toBeLessThan(initialFP);
    expect(
      await page.evaluate(() => window.game?.projectiles?.length)
    ).toBeGreaterThan(0);
  });

  test('should implement lock-on system with middle click and Q key', async ({
    page,
  }) => {
    await navigateAndStartGame(page);

    await page.waitForFunction(() => window.game?.enemies?.length > 0, null, {
      timeout: 5000,
    });

    // Test middle click lock-on
    await page.mouse.click(400, 300, { button: 'middle' });
    await page.waitForFunction(
      () => window.game?.player?.lockedTarget !== null,
      null,
      { timeout: 3000 }
    );
    expect(await page.locator('.lock-on-target').isVisible()).toBe(true);

    // Test Q key target switching (if multiple enemies)
    const enemyCount = await page.evaluate(
      () => window.game?.enemies?.length || 0
    );
    if (enemyCount > 1) {
      const initialTargetId = await page.evaluate(
        () => window.game?.player?.lockedTarget?.mesh?.uuid
      );
      await page.keyboard.press('KeyQ');
      await page.waitForTimeout(100);
      const newTargetId = await page.evaluate(
        () => window.game?.player?.lockedTarget?.mesh?.uuid
      );
      expect(newTargetId).not.toBe(initialTargetId);
    }

    // Test lock-on release (middle click again)
    await page.mouse.click(400, 300, { button: 'middle' });
    await page.waitForFunction(
      () => window.game?.player?.lockedTarget === null,
      null,
      { timeout: 2000 }
    );
    expect(await page.locator('.lock-on-target').isVisible()).toBe(false);
  });
});

test.describe('Mofu Mofu Adventure - Sequences', () => {
  test('should play opening sequence and transition to title screen', async ({
    page,
  }) => {
    await setupNetworkRoutes(page);
    await page.goto('/');
    await page.locator('#click-to-start-screen').click();

    await expect(page.locator('#sequence-overlay')).toBeVisible({
      timeout: 10000,
    });
    await page.waitForFunction(
      (titleState) => window.game?.gameState === titleState,
      GameState.TITLE,
      { timeout: 30000 }
    );
    await expect(page.locator('#sequence-overlay')).not.toBeVisible();
    await expect(
      page.locator("#title-screen #title-menu button:has-text('はじめから')")
    ).toBeVisible();
  });

  test('should support skipping opening sequence with Enter key', async ({
    page,
  }) => {
    await setupNetworkRoutes(page);
    await page.goto('/');
    await page.locator('#click-to-start-screen').click();

    await expect(page.locator('#sequence-overlay')).toBeVisible({
      timeout: 10000,
    });
    await page.waitForTimeout(1000); // Give time for sequence to start
    await page.keyboard.press('Enter');

    await page.waitForFunction(
      (titleState) => window.game?.gameState === titleState,
      GameState.TITLE,
      { timeout: 5000 } // Shorter timeout for skipped sequence
    );
    await expect(page.locator('#sequence-overlay')).not.toBeVisible();
    await expect(
      page.locator("#title-screen #title-menu button:has-text('はじめから')")
    ).toBeVisible();
  });

  test('should support skipping opening sequence with click', async ({
    page,
  }) => {
    await setupNetworkRoutes(page);
    await page.goto('/');
    await page.locator('#click-to-start-screen').click();

    await expect(page.locator('#sequence-overlay')).toBeVisible({
      timeout: 10000,
    });
    await page.waitForTimeout(1000); // Give time for sequence to start
    await page.locator('#sequence-overlay').click();

    await page.waitForFunction(
      (titleState) => window.game?.gameState === titleState,
      GameState.TITLE,
      { timeout: 5000 } // Shorter timeout for skipped sequence
    );
    await expect(page.locator('#sequence-overlay')).not.toBeVisible();
    await expect(
      page.locator("#title-screen #title-menu button:has-text('はじめから')")
    ).toBeVisible();
  });

  test('should display background images and text animations during opening sequence', async ({
    page,
  }) => {
    await setupNetworkRoutes(page);
    await page.goto('/');
    await page.locator('#click-to-start-screen').click();

    await expect(page.locator('#sequence-overlay')).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator('.sequence-background-image')).toHaveCount(2);
    await page.waitForFunction(
      () =>
        document.querySelectorAll('.sequence-background-image.active').length >
        0,
      null,
      { timeout: 5000 }
    );
    await expect(
      page.locator('.sequence-background-image.active')
    ).toBeVisible();

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
    expect(
      await page.evaluate(() => {
        const textEl = document.querySelector('#sequence-overlay > div');
        return (
          textEl &&
          (textEl.classList.contains('sequence-text-large') ||
            textEl.classList.contains('sequence-text-small'))
        );
      })
    ).toBe(true);
  });

  test('should play ending sequence after boss defeat and transition to title screen', async ({
    page,
  }) => {
    await navigateAndStartGame(page);

    // Simulate boss defeat and trigger ending sequence
    await page.evaluate(() => {
      if (window.game && window.game.boss) {
        window.game.boss.takeDamage(window.game.boss.hp);
        if (window.game.player) {
          window.game.player.statusPoints = 0; // Ensure ending sequence triggers
        }
      } else {
        // If no boss in current stage, force ending sequence for test
        window.game.playEndingSequence();
      }
    });

    await expect(page.locator('#sequence-overlay')).toBeVisible({
      timeout: 10000,
    });
    await page.waitForFunction(
      (titleState) => window.game?.gameState === titleState,
      GameState.TITLE,
      { timeout: 60000 } // Longer timeout for full ending sequence
    );
    await expect(page.locator('#sequence-overlay')).not.toBeVisible();
    await expect(
      page.locator("#title-screen #title-menu button:has-text('はじめから')")
    ).toBeVisible();
  });

  test('should support skipping ending sequence with Space key', async ({
    page,
  }) => {
    await navigateAndStartGame(page);

    // Simulate boss defeat and trigger ending sequence
    await page.evaluate(() => {
      if (window.game && window.game.boss) {
        window.game.boss.takeDamage(window.game.boss.hp);
        if (window.game.player) {
          window.game.player.statusPoints = 0;
        }
      } else {
        window.game.playEndingSequence();
      }
    });

    await expect(page.locator('#sequence-overlay')).toBeVisible({
      timeout: 10000,
    });
    await page.waitForTimeout(1000); // Give time for sequence to start
    await page.keyboard.press('Space');

    await page.waitForFunction(
      (titleState) => window.game?.gameState === titleState,
      GameState.TITLE,
      { timeout: 5000 } // Shorter timeout for skipped sequence
    );
    await expect(page.locator('#sequence-overlay')).not.toBeVisible();
    await expect(
      page.locator("#title-screen #title-menu button:has-text('はじめから')")
    ).toBeVisible();
  });
});

test.describe('Mofu Mofu Adventure - Stage System', () => {
  test('should transition to the next stage after clearing current stage', async ({
    page,
  }) => {
    await navigateAndStartGame(page);

    // Ensure current stage is 'tutorial-plains' and its clear condition is 'kill-all-enemies'
    const currentStageId = await page.evaluate(
      () => window.game?.stageManager?.currentStage?.id
    );
    const clearConditionType = await page.evaluate(
      () => window.game?.stageManager?.currentStage?.clearCondition?.type
    );
    expect(currentStageId).toBe('tutorial-plains');
    expect(clearConditionType).toBe('kill-all-enemies');

    // Kill all enemies in the current stage
    await page.evaluate(() => {
      window.game.enemies.forEach((enemy) => {
        enemy.takeDamage(enemy.hp); // Instantly kill enemy
      });
    });

    // Wait for the stage to be marked as cleared
    await page.waitForFunction(
      () => window.game?.stageManager?.currentStage?.isCleared === true,
      null,
      { timeout: 5000 }
    );

    // Check if the exit prompt is visible
    await expect(page.locator('#exit-prompt')).toBeVisible();

    // Press Enter to move to the next stage
    await page.keyboard.press('Enter');

    // Wait for the next stage to load (cursed-forest)
    await page.waitForFunction(
      () => window.game?.stageManager?.currentStage?.id === 'cursed-forest',
      null,
      { timeout: 15000 }
    );

    const nextStageId = await page.evaluate(
      () => window.game?.stageManager?.currentStage?.id
    );
    expect(nextStageId).toBe('cursed-forest');
    await expect(page.locator('#exit-prompt')).not.toBeVisible();
  });

  test('should display stage-specific information and update progress', async ({
    page,
  }) => {
    await navigateAndStartGame(page);

    // Initial stage info
    const initialStageName = await page
      .locator('#current-stage-name')
      .textContent();
    const initialProgress = await page.locator('#stage-progress').textContent();
    expect(initialStageName).not.toBe('');
    expect(initialProgress).toMatch(/1\/\d+ \(0%\)/); // Initially 0% cleared

    // Kill all enemies to clear the stage
    await page.evaluate(() => {
      window.game.enemies.forEach((enemy) => enemy.takeDamage(enemy.hp));
    });
    await page.waitForFunction(
      () => window.game?.stageManager?.currentStage?.isCleared === true,
      null,
      { timeout: 5000 }
    );

    // Transition to next stage
    await page.keyboard.press('Enter');
    await page.waitForFunction(
      () => window.game?.stageManager?.currentStage?.id === 'cursed-forest',
      null,
      { timeout: 15000 }
    );

    // Verify updated stage info
    const newStageName = await page
      .locator('#current-stage-name')
      .textContent();
    const newProgress = await page.locator('#stage-progress').textContent();
    expect(newStageName).not.toBe(initialStageName);
    expect(newProgress).toMatch(/2\/\d+ \(\d+%\)/); // Progress should update
  });

  test('should handle stage BGM system correctly', async ({ page }) => {
    await navigateAndStartGame(page);

    // Check initial BGM state
    const initialBGM = await page.evaluate(() => window.game?.currentBGM);
    expect(initialBGM).toBe('bgm-level-01_01'); // Assuming tutorial-plains starts with this BGM

    // Simulate near clear condition to trigger BGM change
    await page.evaluate(() => {
      // Assuming 'kill-all-enemies' condition, kill half of them
      const enemies = window.game.enemies;
      for (let i = 0; i < Math.floor(enemies.length / 2); i++) {
        enemies[i].takeDamage(enemies[i].hp);
      }
      // Manually trigger checkClearCondition to update BGM state
      window.game.stageManager.checkClearCondition();
    });

    await page.waitForFunction(
      () => window.game?.currentBGM === 'bgm-level-01_02',
      null,
      { timeout: 5000 }
    );
    const nearClearBGM = await page.evaluate(() => window.game?.currentBGM);
    expect(nearClearBGM).toBe('bgm-level-01_02');

    // Kill remaining enemies to clear stage and transition
    await page.evaluate(() => {
      window.game.enemies.forEach((enemy) => enemy.takeDamage(enemy.hp));
    });
    await page.waitForFunction(
      () => window.game?.stageManager?.currentStage?.isCleared === true,
      null,
      { timeout: 5000 }
    );
    await page.keyboard.press('Enter');
    await page.waitForFunction(
      () => window.game?.stageManager?.currentStage?.id === 'cursed-forest',
      null,
      { timeout: 15000 }
    );

    // Check BGM for the new stage
    const nextStageBGM = await page.evaluate(() => window.game?.currentBGM);
    expect(nextStageBGM).toBe('bgm-level-02_01'); // Assuming cursed-forest starts with this BGM
  });
});

test.describe('Mofu Mofu Adventure - UI & Interactions', () => {
  test('should display dialog box and typewriting effect for NPC interaction', async ({
    page,
  }) => {
    await navigateAndStartGame(page);

    await page.waitForFunction(() => window.game?.npcs?.length > 0, null, {
      timeout: 5000,
    });

    // Move player close to NPC
    await page.evaluate(() => {
      const npc = window.game.npcs[0];
      const player = window.game.player;
      if (npc && player) {
        const npcPos = npc.mesh.position;
        player.mesh.position.set(npcPos.x + 1, npcPos.y, npcPos.z + 1);
      }
    });

    // Press E to interact with NPC
    await page.keyboard.press('KeyE');
    await expect(page.locator('#dialog-box')).toBeVisible();

    // Check typewriting effect (text should not appear instantly)
    const initialText = await page.locator('#dialog-box p').textContent();
    expect(initialText.length).toBeLessThan(
      await page.evaluate(() => window.game.npcs[0].dialogue[0].length)
    );

    // Click to skip typewriting
    await page.locator('#dialog-box').click();
    const fullText = await page.locator('#dialog-box p').textContent();
    expect(fullText.length).toBe(
      await page.evaluate(() => window.game.npcs[0].dialogue[0].length)
    );

    // Click to close dialog
    await page.locator('#dialog-box button').click();
    await expect(page.locator('#dialog-box')).not.toBeVisible();
  });

  test('should display level up menu and allow stat allocation', async ({
    page,
  }) => {
    await navigateAndStartGame(page);

    // Force player level up
    await page.evaluate(() => {
      window.game.player.addExperience(
        window.game.player.experienceToNextLevel
      );
    });

    await expect(page.locator('#level-up-menu')).toBeVisible();
    await expect(page.locator('#status-points')).toHaveText(
      /Status Points: \d+/
    );

    // Allocate a stat point (e.g., HP)
    const initialHP = await page.evaluate(() => window.game.player.maxHp);
    await page.locator('#level-up-menu button:has-text("HP")').click();
    const afterAllocationHP = await page.evaluate(
      () => window.game.player.maxHp
    );
    expect(afterAllocationHP).toBeGreaterThan(initialHP);

    // Ensure menu closes after all points allocated (tutorial player has 5 points per level)
    for (let i = 0; i < 4; i++) {
      // Allocate remaining 4 points
      await page.locator('#level-up-menu button').first().click();
      await page.waitForTimeout(100); // Small delay for UI update
    }
    await expect(page.locator('#level-up-menu')).not.toBeVisible();
  });

  test('should transition between stages correctly', async ({ page }) => {
    await navigateAndStartGame(page);

    // Wait for stage manager to be ready
    await page.waitForFunction(
      () => window.game?.stageManager?.currentStage,
      null,
      { timeout: 10000 }
    );

    // Get initial stage
    const initialStage = await page.evaluate(
      () => window.game?.stageManager?.currentStage?.id
    );
    expect(initialStage).toBe('tutorial-plains');

    // Simulate stage clear
    await page.evaluate(() => {
      if (window.game?.stageManager?.currentStage) {
        window.game.stageManager.currentStage.isCleared = true;
        window.game.stageManager.currentStage.onStageCleared();
      }
    });

    // Wait for transition prompt to appear
    await page.waitForSelector('#stage-transition-prompt', { timeout: 5000 });

    // Click advance button
    await page.click('#advance-stage-btn');

    // Wait for stage to change
    await page.waitForFunction(
      () => window.game?.stageManager?.currentStage?.id !== 'tutorial-plains',
      null,
      { timeout: 10000 }
    );

    // Verify new stage
    const newStage = await page.evaluate(
      () => window.game?.stageManager?.currentStage?.id
    );
    expect(newStage).toBe('cursed-forest');
  });

  test('should display stage loading animation', async ({ page }) => {
    // Capture console messages
    page.on('console', (msg) => console.log('BROWSER:', msg.text()));

    // Disable cache to ensure latest code is loaded
    await page.route('**/*', (route) => {
      route.continue({
        headers: {
          ...route.request().headers(),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    });

    await navigateAndStartGame(page);


    // Manually trigger stage transition to see loading screen
    // We need to check for loading screen immediately after triggering transition
    const transitionPromise = page.evaluate(() => {
      return window.game?.stageManager?.goToNextStage();
    });

    // Immediately start checking for loading screen with show class
    try {
      await page.waitForSelector('#stage-loading.show', { timeout: 2000 });

      // Check that loading screen content exists (without requiring full visibility due to rapid transitions)
      const loadingText = await page.locator(
        '#stage-loading .loading-content .loading-text'
      );
      const loadingProgress = await page.locator(
        '#stage-loading .loading-content .loading-progress'
      );
      const loadingBar = await page.locator(
        '#stage-loading .loading-content .loading-bar'
      );

      // Verify elements exist in DOM structure
      await expect(loadingText).toHaveCount(1);
      await expect(loadingProgress).toHaveCount(1);
      await expect(loadingBar).toHaveCount(1);
    } catch (error) {
      // Still wait for transition to complete
      await transitionPromise;
      throw error;
    }

    // Wait for transition to complete
    await transitionPromise;

    // Wait for loading to complete
    await page.waitForSelector('#stage-loading', {
      state: 'hidden',
      timeout: 10000,
    });
  });

  test('should load stage-specific enemies and terrain objects', async ({
    page,
  }) => {
    await navigateAndStartGame(page);

    // Wait for stage manager to be ready
    await page.waitForFunction(
      () => window.game?.stageManager?.currentStage,
      null,
      { timeout: 10000 }
    );

    // Check if tutorial-plains has the correct enemies
    const stageEnemies = await page.evaluate(() => {
      const stage = window.game?.stageManager?.currentStage;
      return stage?.enemies?.map((enemy) => enemy.enemyType) || [];
    });

    // Tutorial plains should have rat and crow enemies
    expect(stageEnemies).toEqual(expect.arrayContaining(['rat', 'crow']));

    // Check terrain objects are present
    const terrainObjects = await page.evaluate(() => {
      const stage = window.game?.stageManager?.currentStage;
      return stage?.terrainObjects?.length || 0;
    });

    expect(terrainObjects).toBeGreaterThan(0);
  });

  test('should handle stage-specific environmental effects', async ({
    page,
  }) => {
    await navigateAndStartGame(page);

    // Move to snowy mountain stage to test cold damage
    await page.evaluate(() => {
      window.game?.stageManager?.goToStage('snowy-mountain');
    });

    await page.waitForFunction(
      () => window.game?.stageManager?.currentStage?.id === 'snowy-mountain',
      null,
      { timeout: 10000 }
    );

    // Check if cold damage is enabled for snowy mountain
    const coldDamageEnabled = await page.evaluate(() => {
      const stage = window.game?.stageManager?.currentStage;
      return stage?.environmentalEffects?.coldDamage?.enabled || false;
    });

    expect(coldDamageEnabled).toBe(true);

    // Test particles for snowy mountain
    const snowParticles = await page.evaluate(() => {
      const stage = window.game?.stageManager?.currentStage;
      const particles = stage?.particles?.effects || [];
      return particles.some((effect) => effect.type === 'snow');
    });

    expect(snowParticles).toBe(true);
  });

  test('should display correct stage information in HUD', async ({ page }) => {
    await navigateAndStartGame(page);

    // Wait for HUD to be ready
    await page.waitForSelector('#stage-info', { timeout: 5000 });

    // Check stage name is displayed
    const stageName = await page.locator('#current-stage-name').textContent();
    expect(stageName).toContain('始まりの地'); // Tutorial plains name

    // Check stage progress is displayed
    const stageProgress = await page.locator('#stage-progress').textContent();
    expect(stageProgress).toMatch(/1\/5/); // Should show 1 out of 5 stages

    // Check clear status is displayed
    await expect(page.locator('#stage-clear-status')).toBeVisible();
  });

  test('should switch BGM based on stage progress', async ({ page }) => {
    await navigateAndStartGame(page);

    // Wait for stage manager to be ready
    await page.waitForFunction(
      () => window.game?.stageManager?.currentStage,
      null,
      { timeout: 10000 }
    );

    // Test normal BGM state
    const normalBgmState = await page.evaluate(() => {
      return window.game?.stageManager?.currentStage?.currentBgmState;
    });
    expect(normalBgmState).toBe('normal');

    // Simulate approaching boss to trigger BGM switch
    await page.evaluate(() => {
      const stage = window.game?.stageManager?.currentStage;
      if (stage) {
        stage.switchBgmToNearClear();
      }
    });

    // Check BGM switched to near clear
    const nearClearBgmState = await page.evaluate(() => {
      return window.game?.stageManager?.currentStage?.currentBgmState;
    });
    expect(nearClearBgmState).toBe('nearClear');
  });

  test('should maintain reasonable performance during stage transitions', async ({
    page,
  }) => {
    await navigateAndStartGame(page);

    // Measure performance during stage transition
    const startTime = Date.now();

    await page.evaluate(() => {
      window.game?.stageManager?.goToNextStage();
    });

    // Wait for transition to complete
    await page.waitForFunction(
      () => window.game?.stageManager?.currentStage?.id === 'cursed-forest',
      null,
      { timeout: 15000 }
    );

    const endTime = Date.now();
    const transitionTime = endTime - startTime;

    // Stage transition should complete within 15 seconds
    expect(transitionTime).toBeLessThan(15000);

    // Check memory usage is reasonable
    const memoryUsage = await page.evaluate(() => {
      if (performance.memory) {
        return {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
        };
      }
      return null;
    });

    if (memoryUsage) {
      // Memory usage should be reasonable (less than 100MB)
      expect(memoryUsage.usedJSHeapSize).toBeLessThan(100 * 1024 * 1024);
    }
  });
});
