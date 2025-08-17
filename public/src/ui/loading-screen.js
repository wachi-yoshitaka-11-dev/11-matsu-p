import { AssetPaths } from '../utils/constants.js';

export class LoadingScreen {
  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'loading-screen';
    this.container.classList.add('hidden');

    // Loading video element
    this.loadingVideo = document.createElement('video');
    this.loadingVideo.classList.add('loading-video');
    this.loadingVideo.src = `./assets/videos/${AssetPaths.LOADING_VIDEO}`;
    this.loadingVideo.autoplay = true;
    this.loadingVideo.loop = true;
    this.loadingVideo.muted = true;
    this.loadingVideo.playsInline = true;

    this.container.appendChild(this.loadingVideo);
    document.body.appendChild(this.container);
  }

  show() {
    this.container.classList.remove('hidden');
    this.container.classList.add('visible-flex');

    // Start playing video
    if (this.loadingVideo) {
      this.loadingVideo.play().catch(() => {
        // If video play fails, just hide it
        this.loadingVideo.classList.add('hidden');
      });
    }
  }

  hide() {
    this.container.classList.add('hidden');
    this.container.classList.remove('visible-flex');

    // Pause video when hiding
    if (this.loadingVideo) {
      this.loadingVideo.pause();
    }
  }
}
