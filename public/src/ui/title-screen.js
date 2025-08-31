// Utils
import { AssetPaths } from '../utils/constants.js';
import { localization } from '../utils/localization.js';

export class TitleScreen {
  constructor(onStart, skipSplashScreenDelay) {
    this.onStart = onStart;
    this.skipSplashScreenDelay = skipSplashScreenDelay;

    // Bind video event handlers once
    this._onVideoClick = this._handleVideoClick.bind(this);
    this._onVideoEnded = this._handleVideoEnded.bind(this);
    this.container = document.createElement('div');
    this.container.id = 'title-screen';

    this.splashContainer = document.createElement('div');
    this.splashContainer.id = 'splash-screen';

    this.logoImage = document.createElement('img');
    this.logoImage.src = `./assets/images/${AssetPaths.LOGO_IMAGE}`;
    this.logoImage.id = 'splash-logo-image';
    this.splashContainer.appendChild(this.logoImage);

    this.videoContainer = document.createElement('div');
    this.videoContainer.id = 'splash-video-container';

    this.video = document.createElement('video');
    this.video.src = `./assets/videos/${AssetPaths.LOGO_VIDEO}`;
    this.video.id = 'splash-logo-video';
    this.video.playsInline = true;

    this.videoContainer.appendChild(this.video);
    this.splashContainer.appendChild(this.videoContainer);

    this.splashContainer.addEventListener('click', () => {
      if (this.skipSplashScreenDelay) {
        this.skipSplashScreenDelay();
      }
    });

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
    this.videoContainer.classList.remove('hidden');
    this.videoContainer.classList.add('visible-flex');
    this.video.play().catch((error) => {
      console.error('Video play failed:', error);
      this.hideVideo();
    });

    this.video.addEventListener('ended', this._onVideoEnded);
    this.video.addEventListener('click', this._onVideoClick);
  }

  _handleVideoClick() {
    this.hideVideo();
  }

  _handleVideoEnded() {
    this.hideVideo();
    this._removeVideoListeners();
  }

  _removeVideoListeners() {
    this.video.removeEventListener('ended', this._onVideoEnded);
    this.video.removeEventListener('click', this._onVideoClick);
  }

  hideVideo() {
    this._removeVideoListeners();
    this.videoContainer.classList.add('logo-fade-out');
    setTimeout(() => {
      this.videoContainer.classList.add('hidden');
      this.videoContainer.classList.remove('logo-fade-out');
    }, 1000);
  }

  showSplash() {
    this.splashContainer.classList.remove('hidden');
    this.splashContainer.classList.add('visible-flex');
    this.container.classList.add('hidden');
    this.playIntroVideo();
  }

  hideSplash() {
    if (this.video && !this.video.paused) {
      this.video.pause();
      this.video.currentTime = 0;
    }

    this.splashContainer.classList.add('logo-fade-out');
    setTimeout(() => {
      this.splashContainer.classList.add('hidden');
      this.splashContainer.classList.remove('logo-fade-out');
    }, 1000);
  }

  showMenu() {
    this.splashContainer.classList.add('hidden');
    this.container.classList.remove('hidden');
    this.container.classList.add('visible-flex', 'title-fade-in');
  }

  hideMenu() {
    this.container.classList.add('title-fade-out');
    setTimeout(() => {
      this.container.classList.add('hidden');
      this.container.classList.remove('title-fade-out');
    }, 1000);
  }

  hideAll() {
    this.splashContainer.classList.add('hidden');
    this.container.classList.add('hidden');
  }

  updateTexts() {
    this.titleText.textContent = localization.getText('ui.title');
    this.newGameButton.textContent = localization.getText('ui.newGame');
    this.continueButton.textContent = localization.getText('ui.continue');
    this.optionsButton.textContent = localization.getText('ui.options');
  }
}
