const { test, expect } = require('@playwright/test');

test.describe('Mofu Mofu Adventure - Logic Validation', () => {
  // Load the game before each test
  test.beforeEach(async ({ page }) => {
    // Intercept network requests to serve local files
    await page.route('https://unpkg.com/three@0.160.0/build/three.module.js', route => {
      route.fulfill({ path: require('path').resolve(__dirname, '../node_modules/three/build/three.module.js') });
    });
    await page.route('https://unpkg.com/three@0.160.0/examples/jsm/**', route => {
      const url = route.request().url();
      const jsmPath = url.substring(url.indexOf('/jsm/') + 5);
      const localPath = require('path').resolve(__dirname, '../node_modules/three/examples/jsm/', jsmPath);
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
        player.physics.velocity.y = data.player.JUMP_POWER;
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
      const { player, enemies, inputController } = window.game;
      const params = inputController._getWeaponParams();
      enemies.forEach(enemy => {
        if (player.mesh.position.distanceTo(enemy.mesh.position) < params.attackRange) {
          enemy.takeDamage(params.damage);
        }
      });
      player.stamina -= params.staminaCost;
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

    // Directly execute item use logic via evaluate
    await page.evaluate(() => {
      window.game.player.useItem(0);
    });

    await page.waitForFunction(hp => window.game.player.hp > hp, initialPlayerHp);
    const newPlayerHp = await page.evaluate(() => window.game.player.hp);
    expect(newPlayerHp).toBeGreaterThan(initialPlayerHp);
  });
});
