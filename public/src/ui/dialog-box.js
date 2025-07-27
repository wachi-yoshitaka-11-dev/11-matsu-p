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
    this.addStyles();
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

  addStyles() {
    const style = document.createElement('style');
    style.textContent = `
            #dialog-box {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background-color: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 20px;
                border: 2px solid white;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                z-index: 200;
            }
            #dialog-box p {
                margin-bottom: 15px;
                font-size: 1.2em;
            }
            #dialog-box button {
                padding: 10px 20px;
                font-size: 1em;
                cursor: pointer;
            }
        `;
    document.head.appendChild(style);
  }
}
