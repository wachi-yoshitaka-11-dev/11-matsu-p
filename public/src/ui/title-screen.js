import { localization } from '../utils/localization.js';

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

    this.titleText = document.createElement('h1');
    this.titleText.id = 'title-text';
    this.menuContainer.appendChild(this.titleText);

    this.newGameButton = document.createElement('button');
    this.newGameButton.addEventListener('click', this.onStart);
    this.menuContainer.appendChild(this.newGameButton);

    this.continueButton = document.createElement('button');
    this.continueButton.disabled = true;
    this.menuContainer.appendChild(this.continueButton);

    this.optionsButton = document.createElement('button');
    this.optionsButton.disabled = true;
    this.menuContainer.appendChild(this.optionsButton);

    this.container.appendChild(this.menuContainer);

    document.body.appendChild(this.container);
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

  updateTexts() {
    this.titleText.textContent = localization.getText('ui.title');
    this.newGameButton.textContent = localization.getText('ui.newGame');
    this.continueButton.textContent = localization.getText('ui.continue');
    this.optionsButton.textContent = localization.getText('ui.options');
  }
}
