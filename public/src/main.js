import { Game } from './core/game.js';

const game = new Game();
window.game = game;

(async () => {
  try {
    await game.init();
    game.start();
  } catch (error) {
    console.error('Failed to initialize game:', error);
    // Optionally show user-friendly error message
  }
})();
