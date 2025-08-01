export class TitleScreen {
  constructor(onStart) {
    this.onStart = onStart;
    this.container = document.createElement('div');
    this.container.id = 'title-screen';

    this.splashContainer = document.createElement('div');
    this.splashContainer.id = 'splash-screen';

    this.logoImage = document.createElement('img');
    this.logoImage.src = './assets/images/logo.png';
    this.logoImage.id = 'splash-logo';
    this.splashContainer.appendChild(this.logoImage);

    document.body.appendChild(this.splashContainer);

    this.menuContainer = document.createElement('div');
    this.menuContainer.id = 'title-menu';

    this.newGameButton = document.createElement('button');
    this.newGameButton.textContent = 'はじめから';
    this.newGameButton.addEventListener('click', this.onStart);
    this.menuContainer.appendChild(this.newGameButton);

    this.continueButton = document.createElement('button');
    this.continueButton.textContent = 'つづきから（準備中）';
    this.continueButton.disabled = true;
    this.menuContainer.appendChild(this.continueButton);

    this.optionsButton = document.createElement('button');
    this.optionsButton.textContent = '設定（準備中）';
    this.optionsButton.disabled = true;
    this.menuContainer.appendChild(this.optionsButton);

    this.container.appendChild(this.menuContainer);

    document.body.appendChild(this.container);
    this.addStyles();
    this.hideAll();
    this.showSplash();
  }

  showSplash() {
    this.splashContainer.style.display = 'flex';
    this.container.style.display = 'none';
  }

  hideSplash() {
    this.splashContainer.className = 'logo-fade-out';
    setTimeout(() => {
      this.splashContainer.style.display = 'none';
      this.splashContainer.className = '';
    }, 1000);
  }

  showMenu() {
    this.splashContainer.style.display = 'none';
    this.container.style.display = 'flex';
    this.container.className = 'title-fade-in';
  }

  hideMenu() {
    this.container.className = 'title-fade-out';
    setTimeout(() => {
      this.container.style.display = 'none';
      this.container.className = '';
    }, 1000);
  }

  hideAll() {
    this.splashContainer.style.display = 'none';
    this.container.style.display = 'none';
  }

  addStyles() {
    const style = document.createElement('style');
    style.textContent = `
            #splash-screen {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: #f9f3e6;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                z-index: 102;
            }
            #splash-logo {
                max-width: 80%;
                max-height: 80%;
                object-fit: contain;
                margin-bottom: 50px;
            }
            #title-screen {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-image: url('../assets/images/title-screen.png');
                background-size: cover;
                background-position: center;
                color: white;
                display: flex;
                flex-direction: column;
                justify-content: flex-end;
                align-items: center;
                font-family: sans-serif;
                z-index: 100;
            }
            #title-screen p {
                margin-bottom: 30px;
            }
            #title-menu {
                display: flex;
                flex-direction: column;
                gap: 5px;
                margin-bottom: 50px;
            }
            #title-menu button {
                padding: 12px 25px;
                font-size: 1.5em;
                background-color: transparent;
                color: white;
                border: none;
                cursor: pointer;
                transition: background-color 0.3s ease, color 0.3s ease;
                width: min(350px, 80vw);
                max-width: 350px;
                text-shadow: 
                    -1px -1px 0 #000,
                    1px -1px 0 #000,
                    -1px 1px 0 #000,
                    1px 1px 0 #000;
            }
            #title-menu button:hover:not(:disabled) {
                background: radial-gradient(ellipse at center, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0) 70%);
                color: white;
                text-shadow: 
                    -1px -1px 0 #000,
                    1px -1px 0 #000,
                    -1px 1px 0 #000,
                    1px 1px 0 #000;
            }
            #title-menu button:disabled {
                background-color: transparent;
                cursor: not-allowed;
                opacity: 0.7;
            }
        `;
    document.head.appendChild(style);
  }
}
