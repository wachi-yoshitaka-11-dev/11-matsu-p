import { Game } from './core/game.js';

const game = new Game();
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.game = game;
}

(async () => {
    await game.init();
    game.start();
})();