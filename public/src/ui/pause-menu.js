import { localization } from '../utils/localization.js';

export class PauseMenu {
  constructor(game) {
    this.game = game;
    this.container = document.createElement('div');
    this.container.id = 'pause-menu';

    this.title = document.createElement('h1');
    this.title.textContent = localization.getText('messages.gamePaused');
    this.container.appendChild(this.title);

    this.resumeButton = document.createElement('button');
    this.resumeButton.textContent = localization.getText('ui.resume');
    this.resumeButton.addEventListener('click', () => {
      // Clear key states when resuming to prevent stuck movement
      this.game.inputController.clearKeyStates();
      this.game.togglePause();
      this.game.setPauseMenuVisibility(false);
    });
    this.container.appendChild(this.resumeButton);

    document.body.appendChild(this.container);
  }

  updateTexts() {
    this.title.textContent = localization.getText('messages.gamePaused');
    this.resumeButton.textContent = localization.getText('ui.resume');
  }

  toggle(show) {
    this.container.style.display = show ? 'flex' : 'none';

    // Clear key states when showing pause menu to prevent stuck movement
    if (show) {
      this.game.inputController.clearKeyStates();
    }
  }

  dispose() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}
