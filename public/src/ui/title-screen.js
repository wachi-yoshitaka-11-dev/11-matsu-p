export class TitleScreen {
    constructor(onStart) {
        this.onStart = onStart;
        this.container = document.createElement('div');
        this.container.id = 'title-screen';

        this.splashOverlay = document.createElement('div');
        this.splashOverlay.id = 'splash-overlay';
        this.container.appendChild(this.splashOverlay);

        this.logoImage = document.createElement('img');
        this.logoImage.src = './assets/images/logo.png';
        this.logoImage.id = 'splash-logo';
        this.splashOverlay.appendChild(this.logoImage);

        this.menuContainer = document.createElement('div');
        this.menuContainer.id = 'title-menu';

        this.newGameButton = document.createElement('button');
        this.newGameButton.textContent = 'New Game';
        this.newGameButton.addEventListener('click', this.onStart);
        this.menuContainer.appendChild(this.newGameButton);

        this.continueButton = document.createElement('button');
        this.continueButton.textContent = 'Continue (Coming Soon)';
        this.continueButton.disabled = true;
        this.menuContainer.appendChild(this.continueButton);

        this.optionsButton = document.createElement('button');
        this.optionsButton.textContent = 'Options (Coming Soon)';
        this.optionsButton.disabled = true;
        this.menuContainer.appendChild(this.optionsButton);

        this.container.appendChild(this.menuContainer);

        document.body.appendChild(this.container);
        this.addStyles();
        this.showSplash();
    }

    showSplash() {
        this.splashOverlay.style.display = 'flex';
        this.logoImage.style.display = 'block';
        this.menuContainer.style.display = 'none';
    }

    showMenu() {
        this.splashOverlay.style.display = 'none';
        this.logoImage.style.display = 'none';
        this.menuContainer.style.display = 'flex';
    }

    dispose() {
        if (this.container) {
            this.newGameButton.removeEventListener('click', this.onStart);
            if (this.container.parentNode) {
                this.container.parentNode.removeChild(this.container);
            }
            this.container = null;
        }
    }

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
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
            #splash-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: #f9f3e6;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                z-index: 101;
            }
            #splash-logo {
                max-width: 80%;
                max-height: 80%;
                object-fit: contain;
                margin-bottom: 50px;
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
                width: 350px;
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