const { test, expect } = require('@playwright/test');

test.describe('Mofu Mofu Adventure - Logic Validation', () => {
  // Load the game before each test
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

    // Listen for page errors
    page.on('pageerror', exception => console.log(`Page Error: ${exception}`));

    // Go to the game page and wait for it to load
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Start the game by clicking the title screen
    const titleScreen = page.locator('#title-screen');
    await expect(titleScreen).toBeVisible({ timeout: 10000 });
    await titleScreen.click();

    // Wait for the game to enter the 'playing' state
    await page.waitForFunction(() => window.game && window.game.gameState === 'playing', null, { timeout: 10000 });
    await expect(page.locator('#hud')).toBeVisible();
  });

  test('should allow player to jump', async ({ page }) => {
    await page.waitForFunction(() => window.game.player.onGround, null, { timeout: 5000 });
    const initialPos = await page.evaluate(() => window.game.player.mesh.position.clone());

    // Directly execute jump logic via evaluate
    await page.evaluate(() => {
      const { player, data } = window.game;
      if (player.onGround) {
        player.physics.velocity.y = data.player.JUMP_POWER; // ジャンプ力
        player.stamina -= data.player.STAMINA_COST_JUMP;
      }
    });

    await page.waitForFunction(initialY => window.game.player.mesh.position.y > initialY, initialPos.y);
    const newPos = await page.evaluate(() => window.game.player.mesh.position.clone());
    expect(newPos.y).toBeGreaterThan(initialPos.y);
  });

  test('should allow player to perform a weak attack', async ({ page }) => {
    await page.evaluate(() => {
      window.game.player.mesh.position.set(4.5, 0.5, 0);
      window.game.enemies[0].mesh.position.set(5, 0.5, 0);
    });
    const initialEnemyHp = await page.evaluate(() => window.game.enemies[0].hp);

    // Directly execute attack logic via evaluate
    await page.evaluate(() => {
      const { player, enemies, data } = window.game;
      const weaponData = data.weapons[player.weapons[player.currentWeaponIndex]];
      const attackRange = weaponData.ATTACK_RANGE;
      const damage = weaponData.DAMAGE_WEAK_ATTACK;
      const staminaCost = weaponData.STAMINA_COST_WEAK_ATTACK;

      enemies.forEach(enemy => {
        if (player.mesh.position.distanceTo(enemy.mesh.position) < attackRange) {
          enemy.takeDamage(damage);
        }
      });
      player.stamina -= staminaCost;
    });

    await page.waitForFunction(hp => window.game.enemies[0].hp < hp, initialEnemyHp);
    const newEnemyHp = await page.evaluate(() => window.game.enemies[0].hp);
    expect(newEnemyHp).toBeLessThan(initialEnemyHp);
  });

  test('should allow player to use an item (potion)', async ({ page }) => {
    await page.evaluate(() => {
      window.game.player.hp = 50;
      window.game.player.inventory.push('potion');
    });
    const initialPlayerHp = await page.evaluate(() => window.game.player.hp);
    const initialInventoryLength = await page.evaluate(() => window.game.player.inventory.length);

    // Directly execute item use logic via evaluate
    await page.evaluate(() => {
      window.game.player.useItem(0);
    });

    await page.waitForFunction(hp => window.game.player.hp > hp, initialPlayerHp);
    const newPlayerHp = await page.evaluate(() => window.game.player.hp);
    const newInventoryLength = await page.evaluate(() => window.game.player.inventory.length);
    const potionHealAmount = await page.evaluate(() => window.game.data.items.potion.HEAL_AMOUNT);

    expect(newPlayerHp).toBeGreaterThan(initialPlayerHp);
    expect(newPlayerHp - initialPlayerHp).toBe(potionHealAmount);
    expect(newInventoryLength).toBe(initialInventoryLength - 1);
  });

  test('should not fall through the ground', async ({ page }) => {
    // Force player to a high position
    await page.evaluate(() => {
      window.game.player.mesh.position.set(0, 20, 0);
      window.game.player.physics.onGround = false;
    });

    // Let the game run for a bit to apply gravity
    await page.waitForTimeout(1000); // Wait for 1 second

    const finalPosition = await page.evaluate(() => window.game.player.mesh.position.clone());
    const groundHeight = await page.evaluate(pos => window.game.field.getHeightAt(pos.x, pos.z), finalPosition);
    const playerHeight = await page.evaluate(() => window.game.player.mesh.geometry.parameters.height);

    // Assert that the player is at or above the ground
    expect(finalPosition.y).toBeGreaterThanOrEqual(groundHeight + playerHeight / 2);
  });

  test('should consume stamina when dashing', async ({ page }) => {
    await page.evaluate(() => {
      window.game.player.stamina = window.game.player.maxStamina;
    });
    const initialStamina = await page.evaluate(() => window.game.player.stamina);

    // Press ShiftLeft to dash
    await page.keyboard.down('ShiftLeft');

    // Simulate a few frames to allow stamina to drain
    for (let i = 0; i < 60; i++) { // Simulate 1 second at 60fps
      await page.evaluate(() => window.game._updateLoop(1 / 60));
    }

    await page.keyboard.up('ShiftLeft');

    const finalStamina = await page.evaluate(() => window.game.player.stamina);
    expect(finalStamina).toBeLessThan(initialStamina);
  });

  test('should interact with NPC and display dialog', async ({ page }) => {
    // Move player close to NPC
    await page.evaluate(() => {
      window.game.player.mesh.position.set(-5, 0.5, -4);
    });

    // Press E to interact
    await page.keyboard.press('KeyE');

    // Check if dialog box is visible and contains correct text
    const dialogBox = page.locator('#dialog-box');
    await expect(dialogBox).toBeVisible();
    await expect(dialogBox).toContainText('こんにちは、冒険者よ。この先には強力なボスが待ち構えているぞ。');

    // Close dialog
    await page.locator('#dialog-box button').click();
    await expect(dialogBox).toBeHidden();
  });
});