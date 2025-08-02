export class DialogBox {
  constructor(game) {
    this.game = game;
    this.container = document.createElement('div');
    this.container.id = 'dialog-box';
    this.container.style.display = 'none';

    this.messageElement = document.createElement('p');
    this.container.appendChild(this.messageElement);

    this.closeButton = document.createElement('button');
    this.closeButton.textContent = 'Close';
    this.closeButton.addEventListener('click', () => this.hide());
    this.container.appendChild(this.closeButton);

    document.body.appendChild(this.container);
  }

  show(message) {
    this.messageElement.textContent = message;
    this.container.style.display = 'flex';
    this.game.togglePause();
    this.game.setPauseMenuVisibility(false);
  }

  hide() {
    this.container.style.display = 'none';
    this.game.togglePause();
    this.game.setPauseMenuVisibility(false);
  }

}
