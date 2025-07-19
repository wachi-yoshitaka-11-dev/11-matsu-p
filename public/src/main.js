import { Game } from './core/game.js';

const game = new Game();
window.game = game;

(async () => {
    await game.init();
    game.start();
})();