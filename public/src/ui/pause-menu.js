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
      this.game.togglePause();
      this.game.setPauseMenuVisibility(false);
      // Re-evaluate key states to sync with actual keyboard state
      this.game.inputController.reevaluateKeyStates();
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

    // Keys will naturally stop having effect during pause display
  }

  dispose() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}
