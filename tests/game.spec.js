const { test, expect } = require('@playwright/test');

// Helper function to get the current animation name
const getCurrentAnimation = (page) => {
  return page.evaluate(() => window.game.player.currentAnimationName);
};

// Helper function to get lock-on status
const getLockOnStatus = (page) => {
  return page.evaluate(() => window.game.player.isLockedOn);
};

// Helper function to get locked-on target ID
const getLockedOnTargetId = (page) => {
  return page.evaluate(() => window.game.player.lockedOnTarget ? window.game.player.lockedOnTarget.mesh.uuid : null);
};

test.describe('Mofu Mofu Adventure - Animation Tests', () => {
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

    // Go to the game page and start the game
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // Wait for assets to load

    // Expose Enemy class to the Playwright context
    await page.exposeFunction('createEnemyForTest', async (game, player, position) => {
      const THREE_Module = await import('https://unpkg.com/three@0.160.0/build/three.module.js');
      const THREE = THREE_Module;
      const Enemy_Module = await import('../public/src/entities/enemy.js');
      const Enemy = Enemy_Module.Enemy;
      const enemy = new Enemy(game, player, new THREE.Vector3(position.x, position.y, position.z));
      game.enemies.push(enemy);
      game.sceneManager.add(enemy.mesh);
      return enemy.mesh.uuid;
    });

    // Wait for the title screen to be fully visible
    await page.waitForSelector('#title-screen #title-menu button:has-text(\'New Game\')', { state: 'visible', timeout: 15000 });
    const newGameButton = page.locator("#title-screen #title-menu button:has-text('New Game')");
    await expect(newGameButton).toBeVisible({ timeout: 10000 });
    await newGameButton.click();

    await page.waitForFunction(() => window.game && window.game.gameState === 'playing', null, { timeout: 10000 });
    await expect(page.locator('#hud')).toBeVisible({ timeout: 10000 });
  });

  test.describe('Initial State', () => {
    test('should play idle animation on start', async ({ page }) => {
      await expect(await getCurrentAnimation(page)).toBe('idle');
    });

    test('should have player texture applied', async ({ page }) => {
      const isTextureApplied = await page.evaluate(() => window.game.isTextureAppliedToModel('player'));
      await expect(isTextureApplied).toBe(true);
    });
  });

  test.describe('Movement Animations', () => {
    test('should play walk animation and return to idle', async ({ page }) => {
      await page.keyboard.down('KeyW');
      await page.waitForTimeout(500);
      await expect(await getCurrentAnimation(page)).toBe('walk');

      await page.keyboard.up('KeyW');
      await page.waitForTimeout(1000);
      await expect(await getCurrentAnimation(page)).toBe('idle');
    });

    test('should play dash animation and return to idle', async ({ page }) => {
      await page.keyboard.down('ShiftLeft');
      await page.keyboard.down('KeyW');
      await page.waitForTimeout(500);
      await expect(await getCurrentAnimation(page)).toBe('sprint');

      await page.keyboard.up('KeyW');
      await page.keyboard.up('ShiftLeft');
      await page.waitForTimeout(1000);
      await expect(await getCurrentAnimation(page)).toBe('idle');
    });
  });

  test.describe('Combat Animations', () => {
    test('should play weak attack animation and return to idle', async ({ page }) => {
      await page.mouse.down({ button: 'left' });
      await page.mouse.up({ button: 'left' });

      // Wait for the player to be attacking
      await page.waitForFunction(() => window.game.player.isAttacking === true, null, { timeout: 2000 });
      // Wait for the attack animation to finish
      await page.waitForFunction(() => window.game.player.isAttacking === false, null, { timeout: 2000 });

      await expect(await getCurrentAnimation(page)).toBe('idle');
    });

    test('should play strong attack animation and return to idle', async ({ page }) => {
      await page.mouse.down({ button: 'right' });
      await page.waitForTimeout(500); // Charge attack
      await page.mouse.up({ button: 'right' });

      // Wait for the player to be attacking
      await page.waitForFunction(() => window.game.player.isAttacking === true, null, { timeout: 2000 });
      // Wait for the attack animation to finish
      await page.waitForFunction(() => window.game.player.isAttacking === false, null, { timeout: 2000 });

      await expect(await getCurrentAnimation(page)).toBe('idle');
    });
  });

  test.describe('Lock-on Feature', () => {
    test('should lock on to an enemy and unlock', async ({ page }) => {
      // Ensure there's at least one enemy
      await page.waitForFunction(() => window.game.enemies.length > 0, null, { timeout: 5000 });

      // Lock on
      await page.keyboard.press('Tab');
      await expect(await getLockOnStatus(page)).toBe(true);
      const initialTargetId = await getLockedOnTargetId(page);
      expect(initialTargetId).not.toBeNull();

      // Unlock
      await page.keyboard.press('Tab');
      await expect(await getLockOnStatus(page)).toBe(false);
      await expect(await getLockedOnTargetId(page)).toBeNull();
    });

    test('should cycle through enemies with Q key', async ({ page }) => {
      // Ensure there's at least one enemy from initial setup
      await page.waitForFunction(() => window.game.enemies.length > 0, null, { timeout: 5000 });

      // Add more enemies directly from Playwright context and get their UUIDs
      const enemyUUIDs = [];
      // Initial enemy is at (5,0,0) from game.js
      // Add enemies at predictable positions for sorting (closer to player first)
      const enemyPositions = [
        { x: 0, y: 0, z: 1 }, // Enemy 1 (closest to player at 0,0,0)
        { x: 0, y: 0, z: 2 }, // Enemy 2
        { x: 0, y: 0, z: 3 }, // Enemy 3
      ];

      for (const pos of enemyPositions) {
        const uuid = await page.evaluate(async (position) => {
          const THREE_Module = await import('https://unpkg.com/three@0.160.0/build/three.module.js');
          const THREE = THREE_Module;
          const Enemy_Module = await import('/src/entities/enemy.js');
          const Enemy = Enemy_Module.Enemy;

          const game = window.game;
          const player = window.game.player;

          const enemy = new Enemy(game, player, new THREE.Vector3(position.x, position.y, position.z));
          game.enemies.push(enemy);
          game.sceneManager.add(enemy.mesh);
          return enemy.mesh.uuid;
        }, pos);
        enemyUUIDs.push(uuid);
      }

      // Ensure there are multiple enemies
      await page.waitForFunction(() => window.game.enemies.length >= 4, null, { timeout: 5000 }); // Initial enemy + 3 new ones
      await expect(await page.evaluate(() => window.game.enemies.length)).toBe(4);

      // Get all enemy UUIDs in sorted order (closest to player first)
      const sortedEnemyUUIDs = await page.evaluate(() => {
        return window.game.enemies
          .sort((a, b) => a.mesh.position.distanceTo(window.game.player.mesh.position) - b.mesh.position.distanceTo(window.game.player.mesh.position))
          .map(enemy => enemy.mesh.uuid);
      });

      // Lock on to the first enemy in the sorted list
      await page.keyboard.press('Tab');
      await expect(await getLockOnStatus(page)).toBe(true);
      let initialTargetId = await getLockedOnTargetId(page);
      expect(initialTargetId).toBe(sortedEnemyUUIDs[0]);

      // Cycle to next enemy
      await page.keyboard.press('KeyQ');
      await page.waitForTimeout(100); // Give time for cycle
      let firstCycleTargetId = await getLockedOnTargetId(page);
      expect(firstCycleTargetId).toBe(sortedEnemyUUIDs[1]);

      // Cycle to third enemy
      await page.keyboard.press('KeyQ');
      await page.waitForTimeout(100); // Give time for cycle
      let secondCycleTargetId = await getLockedOnTargetId(page);
      expect(secondCycleTargetId).toBe(sortedEnemyUUIDs[2]);

      // Cycle to fourth enemy
      await page.keyboard.press('KeyQ');
      await page.waitForTimeout(100); // Give time for cycle
      let thirdCycleTargetId = await getLockedOnTargetId(page);
      expect(thirdCycleTargetId).toBe(sortedEnemyUUIDs[3]);

      // Cycle back to the first enemy
      await page.keyboard.press('KeyQ');
      await page.waitForTimeout(100); // Give time for cycle
      let fourthCycleTargetId = await getLockedOnTargetId(page);
      expect(fourthCycleTargetId).toBe(sortedEnemyUUIDs[0]);
    });

    test('should auto-unlock when locked-on enemy is defeated', async ({ page }) => {
      // Ensure there's at least one enemy
      await page.waitForFunction(() => window.game.enemies.length > 0, null, { timeout: 5000 });

      // Lock on to the first enemy
      await page.keyboard.press('Tab');
      await expect(await getLockOnStatus(page)).toBe(true);
      const targetEnemyId = await getLockedOnTargetId(page);
      expect(targetEnemyId).not.toBeNull();

      // Defeat the locked-on enemy
      await page.evaluate((id) => {
        const enemy = window.game.enemies.find(e => e.mesh.uuid === id);
        if (enemy) {
          enemy.takeDamage(enemy.hp); // Deal enough damage to defeat
        }
      }, targetEnemyId);

      // Wait for lock-on to be released
      await page.waitForFunction(() => !window.game.player.isLockedOn, null, { timeout: 5000 });
      await expect(await getLockOnStatus(page)).toBe(false);
      await expect(await getLockedOnTargetId(page)).toBeNull();
    });
  });
});