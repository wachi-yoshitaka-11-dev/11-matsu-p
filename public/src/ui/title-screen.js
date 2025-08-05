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
    this.logoImage.id = 'splash-logo-image';
    this.splashContainer.appendChild(this.logoImage);

    this.videoContainer = document.createElement('div');
    this.videoContainer.id = 'splash-video-container';

    this.video = document.createElement('video');
    this.video.src = './assets/videos/logo.mp4';
    this.video.id = 'splash-logo-video';
    this.video.playsInline = true;

    this.videoContainer.appendChild(this.video);
    this.splashContainer.appendChild(this.videoContainer);

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

  playIntroVideo() {
    this.videoContainer.style.display = 'flex';
    this.video.play().catch(error => {
      console.error("Video play failed:", error);
      this.hideVideo();
    });

    const hideVideoHandler = () => {
      this.hideVideo();
      this.video.removeEventListener('ended', hideVideoHandler);
    };

    this.video.addEventListener('ended', hideVideoHandler);
  }

  hideVideo() {
    this.videoContainer.className = 'logo-fade-out';
    setTimeout(() => {
      this.videoContainer.style.display = 'none';
      this.videoContainer.className = '';
    }, 1000);
  }

  showSplash() {
    this.splashContainer.style.display = 'flex';
    this.container.style.display = 'none';
    this.playIntroVideo();
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
