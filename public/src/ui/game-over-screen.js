export class GameOverScreen {
  constructor(game) {
    this.game = game;
    this.container = document.createElement('div');
    this.container.id = 'game-over-screen';
    this.container.style.display = 'none';

    const message = document.createElement('h2');
    message.textContent = 'GAME OVER';
    this.container.appendChild(message);

    this.returnToTitleButton = document.createElement('button');
    this.returnToTitleButton.textContent = 'Return to Title';
    this.returnToTitleButton.addEventListener('click', () => {
      this.hide();
      this.game.reloadGame(); // Reloads the page, effectively returning to title
    });
    this.container.appendChild(this.returnToTitleButton);

    document.body.appendChild(this.container);
    this.addStyles();
  }

  show() {
    this.container.style.display = 'flex';
  }

  hide() {
    this.container.style.display = 'none';
  }

  addStyles() {
    const style = document.createElement('style');
    style.textContent = `
            #game-over-screen {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.8);
                color: white;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                font-family: sans-serif;
                z-index: 100;
            }
            #game-over-screen h2 {
                font-size: 4em;
                margin-bottom: 20px;
            }
            #game-over-screen button {
                padding: 10px 20px;
                font-size: 1.5em;
                cursor: pointer;
            }
        `;
    document.head.appendChild(style);
  }
}
