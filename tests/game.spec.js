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
  test('should display the title screen on startup', async ({ page }) => {
    await setupNetworkRoutes(page);

    // Go to the game page
    await page.goto('/');

    // Wait for splash screen to complete and title screen to be ready
    await page.waitForFunction(
      () =>
        document.querySelector('#title-screen #title-menu button')
          ?.offsetParent !== null,
      null,
      { timeout: 10000 }
    );

    // Check if the "New Game" button is visible on the title screen
    const newGameButton = page.locator(
      '#title-screen #title-menu button:has-text(\'New Game\')'
    );
    await expect(newGameButton).toBeVisible({ timeout: 10000 });
  });

  test('should start the game when "New Game" is clicked', async ({ page }) => {
    await setupNetworkRoutes(page);

    // Go to the game page
    await page.goto('/');

    // Wait for the title screen to be fully visible
    await page.waitForFunction(
      () =>
        document.querySelector('#title-screen #title-menu button')
          ?.offsetParent !== null,
      null,
      { timeout: 10000 }
    );

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
      { timeout: 10000 }
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
      '#title-screen #title-menu button:has-text(\'New Game\')'
    );
    await newGameButton.click();

    // Wait for the game to start
    await page.waitForFunction(
      () => window.game?.gameState === 'playing',
      null,
      { timeout: 10000 }
    );

    // Wait for enemies to be loaded
    await page.waitForFunction(
      () => window.game?.enemies?.length > 0,
      null,
      { timeout: 5000 }
    );

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

  test('should display enemy health bar when player is close', async ({ page }) => {
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
      '#title-screen #title-menu button:has-text(\'New Game\')'
    );
    await newGameButton.click();

    // Wait for the game to start
    await page.waitForFunction(
      () => window.game?.gameState === 'playing',
      null,
      { timeout: 10000 }
    );

    // Wait for enemies to be loaded
    await page.waitForFunction(
      () => window.game?.enemies?.length > 0,
      null,
      { timeout: 5000 }
    );

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
        return healthBars.length === 0 || healthBars[0].style.display === 'none';
      },
      null,
      { timeout: 3000 }
    );
  });

  test('should implement shield system similar to weapons', async ({ page }) => {
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
      '#title-screen #title-menu button:has-text(\'New Game\')'
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
        return player?.shields && Array.isArray(player.shields) && player.shields.length > 0;
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

  test('should implement Elden Ring style movement controls', async ({ page }) => {
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
      '#title-screen #title-menu button:has-text(\'New Game\')'
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

    // Test Backstep (Shift short press without movement)
    await page.keyboard.down('Shift');
    await page.waitForTimeout(100); // Short press
    await page.keyboard.up('Shift');
    
    await page.waitForFunction(
      () => {
        const player = window.game?.player;
        return player?.isBackstepping === true;
      },
      null,
      { timeout: 1000 }
    );
  });

  test('should implement equipment switching system with arrow keys', async ({ page }) => {
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
      '#title-screen #title-menu button:has-text(\'New Game\')'
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

    const newWeaponIndex = await page.evaluate(() => {
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
      const equipmentUI = document.querySelector('#equipment-ui');
      return equipmentUI && equipmentUI.style.display !== 'none';
    });
    
    expect(equipmentUIVisible).toBe(true);
  });

  test('should implement improved combat system with weak/strong attacks and guard', async ({ page }) => {
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
      '#title-screen #title-menu button:has-text(\'New Game\')'
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
        hasAttackStates: typeof player?.isAttackingWeak === 'boolean' && typeof player?.isAttackingStrong === 'boolean',
        hasGuardState: 'isGuarding' in (player || {}),
        guardValue: player?.isGuarding,
        hasShieldDefense: typeof player?.getShieldDefense === 'function',
        hasPerformAttack: typeof window.game?.inputController?.performAttack === 'function',
        playerProperties: Object.keys(player || {}).filter(k => k.startsWith('is'))
      };
    });

    expect(combatState.hasAttackStates).toBe(true);
    expect(combatState.hasGuardState).toBe(true);
    expect(combatState.hasShieldDefense).toBe(true);
    expect(combatState.hasPerformAttack).toBe(true);
  });

  test('should implement item and skill usage system with R and F keys', async ({ page }) => {
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
      '#title-screen #title-menu button:has-text(\'New Game\')'
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
          hasUseCurrentItem: typeof player?.useCurrentItem === 'function'
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
        hasUseCurrentSkill: typeof player?.useCurrentSkill === 'function'
      };
    });

    expect(afterSkillUseState.hasUseCurrentSkill).toBe(true);
    // Skill should consume FP if used
    if (initialFP >= 10) {
      expect(afterSkillUseState.fp).toBeLessThan(initialFP);
    }
  });

  test('should implement lock-on system with wheel click and Q key', async ({ page }) => {
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
      '#title-screen #title-menu button:has-text(\'New Game\')'
    );
    await newGameButton.click();

    // Wait for the game to start
    await page.waitForFunction(
      () => window.game?.gameState === 'playing',
      null,
      { timeout: 10000 }
    );

    // Wait for enemies to be loaded
    await page.waitForFunction(
      () => window.game?.enemies?.length > 0,
      null,
      { timeout: 5000 }
    );

    // Test wheel click lock-on
    await page.mouse.click(400, 300, { button: 'middle' });
    
    await page.waitForFunction(
      () => {
        const player = window.game?.player;
        return player?.lockedTarget !== null && player?.lockedTarget !== undefined;
      },
      null,
      { timeout: 3000 }
    );

    // Verify lock-on target is set
    const lockOnState = await page.evaluate(() => {
      const player = window.game?.player;
      return {
        hasLockedTarget: player?.lockedTarget !== null && player?.lockedTarget !== undefined,
        targetIsEnemy: player?.lockedTarget?.constructor.name === 'Enemy',
        lockOnUIVisible: !!document.querySelector('.lock-on-target')
      };
    });

    expect(lockOnState.hasLockedTarget).toBe(true);
    expect(lockOnState.targetIsEnemy).toBe(true);

    // Test Q key target switching (if multiple enemies)
    const enemyCount = await page.evaluate(() => window.game?.enemies?.length || 0);
    
    if (enemyCount > 1) {
      const initialTarget = await page.evaluate(() => window.game?.player?.lockedTarget);
      
      await page.keyboard.press('KeyQ');
      await page.waitForTimeout(100);
      
      const newTarget = await page.evaluate(() => window.game?.player?.lockedTarget);
      expect(newTarget !== initialTarget).toBe(true);
    }

    // Test lock-on release (wheel click again)
    await page.mouse.click(400, 300, { button: 'middle' });
    
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
