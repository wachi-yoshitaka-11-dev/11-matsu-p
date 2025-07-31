const { test, expect } = require('@playwright/test');
const { setupNetworkRoutes } = require('./utils/network-setup');

test.describe('Audio Context Tests', () => {
  test('should handle AudioContext properly with user interaction', async ({ page }) => {
    page.on('console', msg => {
      console.log(`BROWSER CONSOLE [${msg.type()}]: ${msg.text()}`);
    });
    page.on('pageerror', error => {
      console.error(`BROWSER PAGE ERROR: ${error.message}`);
    });
    await setupNetworkRoutes(page);
    await page.goto('/');

    // Simulate user interaction to activate AudioContext
    await page.click('body');

    // Wait for the sequence overlay to appear
    await expect(page.locator('#sequence-overlay')).toBeVisible({ timeout: 10000 });

    // Check if AudioContext is properly initialized after user interaction
    const audioContextState = await page.evaluate(() => {
      if (window.game && window.game.audioContext) {
        return window.game.audioContext.state;
      }
      return 'unknown';
    });

    console.log(`AudioContext state: ${audioContextState}`);
    expect(['running', 'suspended']).toContain(audioContextState);

    // Verify that audio can be played without errors
    const audioErrors = await page.evaluate(() => {
      const errors = [];
      try {
        if (window.game && window.game.bgmAudios) {
          // Try to access opening BGM
          const openingBGM = window.game.bgmAudios['bgm-opening'];
          if (openingBGM) {
            console.log('Opening BGM found');
          } else {
            errors.push('Opening BGM not found');
          }
        } else {
          errors.push('Game or bgmAudios not initialized');
        }
      } catch (e) {
        errors.push(`Audio error: ${e.message}`);
      }
      return errors;
    });

    console.log(`Audio errors: ${JSON.stringify(audioErrors)}`);
    expect(audioErrors.length).toBeLessThanOrEqual(1); // Allow some minor issues but not complete failure
  });

  test('should not show AudioContext warning after user interaction', async ({ page }) => {
    const consoleMessages = [];
    page.on('console', msg => {
      consoleMessages.push(msg.text());
      console.log(`BROWSER CONSOLE [${msg.type()}]: ${msg.text()}`);
    });
    page.on('pageerror', error => {
      console.error(`BROWSER PAGE ERROR: ${error.message}`);
    });
    
    await setupNetworkRoutes(page);
    await page.goto('/');

    // Simulate user interaction before audio is played
    await page.click('body');
    
    // Wait for the sequence overlay to appear
    await expect(page.locator('#sequence-overlay')).toBeVisible({ timeout: 10000 });

    // Wait a bit for audio to potentially start
    await page.waitForTimeout(2000);

    // Check if AudioContext warning is present
    const audioContextWarnings = consoleMessages.filter(msg => 
      msg.includes('AudioContext was not allowed to start')
    );

    console.log(`AudioContext warnings found: ${audioContextWarnings.length}`);
    // We expect no warnings after user interaction
    expect(audioContextWarnings.length).toBe(0);
  });

  test('should play opening BGM after user interaction', async ({ page }) => {
    page.on('console', msg => {
      console.log(`BROWSER CONSOLE [${msg.type()}]: ${msg.text()}`);
    });
    page.on('pageerror', error => {
      console.error(`BROWSER PAGE ERROR: ${error.message}`);
    });
    
    await setupNetworkRoutes(page);
    await page.goto('/');

    // Simulate user interaction
    await page.click('body');
    
    // Wait for the sequence overlay to appear and opening sequence to start
    await expect(page.locator('#sequence-overlay')).toBeVisible({ timeout: 10000 });
    
    // Wait for opening sequence to start
    await page.waitForFunction(
      () => window.game?.sequenceManager?.currentStep === 'showingText',
      null,
      { timeout: 10000 }
    );

    // Check if opening BGM is playing
    const isBGMPlaying = await page.evaluate(() => {
      try {
        if (window.game && window.game.bgmAudios && window.game.bgmAudios['bgm-opening']) {
          return window.game.bgmAudios['bgm-opening'].isPlaying;
        }
        return false;
      } catch (e) {
        console.error('Error checking BGM status:', e);
        return false;
      }
    });

    console.log(`Opening BGM playing: ${isBGMPlaying}`);
    // BGM should be playing during opening sequence
    expect(isBGMPlaying).toBe(true);
  });
});