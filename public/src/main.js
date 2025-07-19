import { Game } from './core/game.js';

const game = new Game();

(async () => {
    await game.init();
    game.start();
})();