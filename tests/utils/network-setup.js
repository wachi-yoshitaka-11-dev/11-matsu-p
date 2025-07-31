const path = require('path');

async function setupNetworkRoutes(page) {
  await page.route(
    'https://unpkg.com/three@0.160.0/build/three.module.js',
    (route) => {
      route.fulfill({
        path: path.join(
          __dirname,
          '../../node_modules/three/build/three.module.js'
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
        '../../node_modules/three/examples/jsm/',
        jsmPath
      );
      route.fulfill({ path: localPath });
    }
  );
}

module.exports = { setupNetworkRoutes };