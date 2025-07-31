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

test.describe('Debug Tests', () => {
  test('debug page load and game initialization', async ({ page }) => {
    const consoleMessages = [];
    page.on('console', msg => {
      consoleMessages.push(msg.text());
      console.log(`BROWSER CONSOLE [${msg.type()}]: ${msg.text()}`);
    });
    page.on('pageerror', error => {
      console.error(`BROWSER PAGE ERROR: ${error.message}`);
    });
    
    await setupNetworkRoutes(page);
    
    // Clear browser cache and reload
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.reload({ waitUntil: 'networkidle' });

    // Wait a bit for page to load and check for console messages
    await page.waitForTimeout(5000);
    
    // Check if main.js was loaded properly
    const mainJsLoaded = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[src*="main.js"]'));
      return scripts.length > 0;
    });
    
    console.log('Main.js script found:', mainJsLoaded);

    // Check what elements exist on the page
    const bodyContent = await page.evaluate(() => {
      const game = window.game;
      return {
        bodyHTML: document.body.innerHTML.length > 1000 ? 'Content too long' : document.body.innerHTML,
        gameExists: typeof game !== 'undefined',
        gameState: game ? game.gameState : 'undefined',
        sequenceManagerExists: game ? typeof game.sequenceManager !== 'undefined' : false,
        sequenceManagerConstructor: game && game.sequenceManager ? game.sequenceManager.constructor.name : 'undefined',
        sequenceManagerCurrentStep: game && game.sequenceManager ? game.sequenceManager.currentStep : 'undefined',
        overlayExists: document.getElementById('sequence-overlay') !== null,
        titleScreenExists: document.getElementById('title-screen') !== null,
        allElementsWithId: Array.from(document.querySelectorAll('[id]')).map(el => el.id),
        gameInitialized: game ? game.audioInitialized : false,
        gameProperties: game ? Object.keys(game) : []
      };
    });

    console.log('Page debug info:', JSON.stringify(bodyContent, null, 2));
    console.log('Console messages:', consoleMessages);

    // Basic assertions
    expect(bodyContent.gameExists).toBe(true);
    
    // Wait longer to see if the overlay appears
    await page.waitForTimeout(10000);
    
    const laterCheck = await page.evaluate(() => {
      return {
        gameState: window.game ? window.game.gameState : 'undefined',
        sequenceManagerStep: window.game && window.game.sequenceManager ? window.game.sequenceManager.currentStep : 'undefined',
        overlayExists: document.getElementById('sequence-overlay') !== null,
        overlayVisible: document.getElementById('sequence-overlay') ? document.getElementById('sequence-overlay').style.display : 'not found',
        titleScreenExists: document.getElementById('title-screen') !== null,
        titleScreenVisible: document.getElementById('title-screen') ? document.getElementById('title-screen').style.display : 'not found'
      };
    });

    console.log('Later check:', JSON.stringify(laterCheck, null, 2));
  });
});