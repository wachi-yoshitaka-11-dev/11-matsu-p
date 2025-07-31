import { Game } from './core/game.js';

console.log('main.js module loaded successfully!');

// Initialize and start the game
try {
  console.log('Creating Game instance... [UPDATED VERSION]');
  const game = new Game();
  console.log('Game instance created successfully');
  window.game = game; // Make game accessible globally for testing

  // Start the game initialization
  console.log('Starting game initialization...');
  game.init().catch((error) => {
    console.error('Failed to initialize game:', error);
  });
} catch (error) {
  console.error('Failed to create or initialize game:', error);
}