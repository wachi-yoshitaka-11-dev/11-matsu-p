import * as THREE from 'three';
import { AssetNames } from '../utils/constants.js';

export class SequenceManager {
  constructor(game) {
    this.game = game;
    this.currentSequence = null;
    this.sequenceCamera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.sequenceCamera.position.set(0, 5, 10);
    this.sequenceCamera.lookAt(0, 0, 0);

    this.overlayDiv = document.createElement('div');
    this.overlayDiv.id = 'sequence-overlay';
    this.overlayDiv.style.position = 'fixed';
    this.overlayDiv.style.top = '0';
    this.overlayDiv.style.left = '0';
    this.overlayDiv.style.width = '100%';
    this.overlayDiv.style.height = '100%';
    this.overlayDiv.style.backgroundColor = 'transparent';
    this.overlayDiv.style.color = 'white';
    this.overlayDiv.style.display = 'none';
    this.overlayDiv.style.flexDirection = 'column';
    this.overlayDiv.style.justifyContent = 'center';
    this.overlayDiv.style.alignItems = 'center';
    this.overlayDiv.style.fontSize = '2em';
    this.overlayDiv.style.textAlign = 'center';
    this.overlayDiv.style.zIndex = '10000';
    document.body.appendChild(this.overlayDiv);

    this.backgroundImages = [];
    this.currentBackgroundIndex = 0;
    for (let i = 0; i < 2; i++) {
      const bgImage = document.createElement('img');
      bgImage.className = 'sequence-background-image';
      this.overlayDiv.appendChild(bgImage);
      this.backgroundImages.push(bgImage);
    }

    this.textElement = document.createElement('div');
    this.textElement.style.opacity = '0';
    this.overlayDiv.appendChild(this.textElement);

    this.staffRollElement = document.createElement('div');
    this.staffRollElement.className = 'staff-roll';
    this.staffRollElement.style.position = 'absolute';
    this.staffRollElement.style.bottom = '0';
    this.staffRollElement.style.width = '100%';
    this.staffRollElement.style.textAlign = 'center';
    this.staffRollElement.style.fontSize = '1.5em';
    this.staffRollElement.style.display = 'none';
    this.overlayDiv.appendChild(this.staffRollElement);

    this.currentTextIndex = 0;
    this.textSequence = [];
    this.animationDuration = 5000;
    this.onSequenceCompleteCallback = null;
    this.currentStep = 'idle';
    this.isSkippable = false;

    this.skipEventListener = (event) => {
      if (
        this.isSkippable &&
        (event.key === 'Enter' || event.key === ' ' || event.key === 'Escape')
      ) {
        this.skipSequence();
      }
    };

    this.skipClickListener = () => {
      if (this.isSkippable) {
        this.skipSequence();
      }
    };

    this.animationEndListener = (event) => {
      if (event.target === this.textElement) {
        this.handleAnimationEnd();
      }
    };
  }

  handleAnimationEnd() {
    this.currentTextIndex++;
    if (this.currentTextIndex < this.textSequence.length) {
      this.textElement.textContent = this.textSequence[this.currentTextIndex];
      const isLarge = this.currentTextIndex % 2 === 0;
      this.textElement.className = isLarge
        ? 'sequence-text-large'
        : 'sequence-text-small';

      if (
        this.backgroundImagePaths &&
        this.currentTextIndex < this.backgroundImagePaths.length
      ) {
        this.changeBackgroundImage(
          this.backgroundImagePaths[this.currentTextIndex]
        );
      }
    } else {
      this.currentStep = 'textComplete';
      if (this.endingSequenceCallback) {
        this.endingSequenceCallback();
      } else if (this.onSequenceCompleteCallback) {
        this.onSequenceCompleteCallback();
      }
    }
  }

  update(deltaTime) {
    if (this.currentSequence) {
      this.currentSequence.update(deltaTime);
    }
  }

  skipSequence() {
    if (!this.isSkippable || this.currentStep === 'idle') return;

    this.currentStep = 'textComplete';

    this.textElement.className = '';
    this.overlayDiv.className = '';

    if (this.game.bgmAudios[AssetNames.BGM_OPENING]?.isPlaying) {
      this.game.bgmAudios[AssetNames.BGM_OPENING].stop();
    }
    if (this.game.bgmAudios[AssetNames.BGM_ENDING]?.isPlaying) {
      this.game.bgmAudios[AssetNames.BGM_ENDING].stop();
    }

    this.disableSkip();

    if (this.onSequenceCompleteCallback) {
      this.overlayDiv.style.display = 'none';
      this.overlayDiv.className = '';
      this.textElement.style.display = 'none';
      this.textElement.className = '';
      this.staffRollElement.style.display = 'none';

      this.backgroundImages.forEach((img) => {
        img.classList.remove('active');
        img.src = '';
        img.style.display = 'none';
      });
      this.game.sceneManager.restoreGameElements();
      this.game.sceneManager.resetCamera();

      const callback = this.onSequenceCompleteCallback;
      this.currentStep = 'idle';
      this.onSequenceCompleteCallback = null;

      setTimeout(() => callback(), 100);
    }
  }

  enableSkip() {
    this.isSkippable = true;
    document.addEventListener('keydown', this.skipEventListener);
    this.overlayDiv.addEventListener('click', this.skipClickListener);
  }

  disableSkip() {
    this.isSkippable = false;
    document.removeEventListener('keydown', this.skipEventListener);
    this.overlayDiv.removeEventListener('click', this.skipClickListener);

    this.textElement.removeEventListener(
      'animationend',
      this.animationEndListener
    );
  }

  changeBackgroundImage(imagePath) {
    if (!imagePath) return;

    const nextIndex = (this.currentBackgroundIndex + 1) % 2;
    const nextImage = this.backgroundImages[nextIndex];
    const currentImage = this.backgroundImages[this.currentBackgroundIndex];

    nextImage.src = imagePath;
    nextImage.style.display = 'block';
    nextImage.style.zIndex = '-1';

    nextImage.onload = () => {
      nextImage.classList.add('active');

      if (currentImage.classList.contains('active')) {
        currentImage.classList.remove('active');
      }
    };

    if (nextImage.complete && nextImage.naturalHeight !== 0) {
      nextImage.onload();
    }

    this.currentBackgroundIndex = nextIndex;
  }

  startOpeningSequence(onComplete) {
    this.onSequenceCompleteCallback = onComplete;
    this.currentStep = 'showingText';

    this.overlayDiv.style.display = 'flex';
    this.overlayDiv.className = 'sequence-overlay-fade-in';
    this.game.sceneManager.setCamera(this.sequenceCamera);
    this.game.sceneManager.hideGameElements();

    this.textSequence = [
      '忘れ去られた王国',
      'かつて、この王国は光に満ちていた。',
      'しかし、謎の呪いにより、その輝きは失われた。',
      '今、一匹の猫が目覚める。失われた記憶と、王国を救う使命を胸に。',
      '希望の光は、再びこの地に灯るのか。',
    ];

    this.backgroundImagePaths = [
      './assets/images/opening-bg-01.jpg',
      './assets/images/opening-bg-02.jpg',
      './assets/images/opening-bg-03.jpg',
      './assets/images/opening-bg-04.jpg',
      './assets/images/opening-bg-05.jpg',
    ];
    this.currentTextIndex = 0;
    this.textTimer = 0;
    this.textElement.textContent = this.textSequence[this.currentTextIndex];
    this.textElement.style.display = 'block';

    this.textElement.className = 'sequence-text-large';
    this.staffRollElement.style.display = 'none';

    setTimeout(() => {
      this.changeBackgroundImage(this.backgroundImagePaths[0]);
    }, 500);

    this.game.bgmAudios[AssetNames.BGM_OPENING]?.play();

    this.enableSkip();

    this.textElement.addEventListener(
      'animationend',
      this.animationEndListener
    );

    const originalCallback = onComplete;
    this.onSequenceCompleteCallback = () => {
      this.currentStep = 'fadingOut';

      this.disableSkip();

      this.overlayDiv.className = 'sequence-overlay-fade-out';
      this.fadeOutAudio(this.game.bgmAudios[AssetNames.BGM_OPENING], 3000);

      this.backgroundImages.forEach((img) => {
        if (img.classList.contains('active')) {
          img.classList.remove('active');
        }
      });

      setTimeout(() => {
        this.overlayDiv.style.display = 'none';
        this.overlayDiv.className = '';
        this.textElement.style.display = 'none';
        this.textElement.className = '';

        this.backgroundImages.forEach((img) => {
          img.src = '';
          img.style.display = 'none';
        });
        this.game.sceneManager.restoreGameElements();
        this.game.sceneManager.resetCamera();
        originalCallback();
        this.currentStep = 'idle';
      }, 1500);
    };
  }

  startEndingSequence(onComplete) {
    this.onSequenceCompleteCallback = onComplete;
    this.currentStep = 'showingText';

    this.overlayDiv.style.display = 'flex';
    this.overlayDiv.className = 'sequence-overlay-fade-in';

    this.overlayDiv.style.backgroundColor = 'black';
    setTimeout(() => {
      this.overlayDiv.style.backgroundColor = 'transparent';
    }, 1000);

    this.game.sceneManager.setCamera(this.sequenceCamera);
    this.game.sceneManager.hideGameElements();

    this.textSequence = [
      '呪いは解かれ、王国に平和が戻った。',
      'しかし、冒険はまだ始まったばかりだ…',
    ];

    this.backgroundImagePaths = [
      './assets/images/ending-bg-01.jpg',
      './assets/images/ending-bg-02.jpg',
    ];
    this.currentTextIndex = 0;
    this.textTimer = 0;
    this.textElement.textContent = this.textSequence[this.currentTextIndex];
    this.textElement.style.display = 'block';

    this.textElement.className = 'sequence-text-large';
    this.staffRollElement.style.display = 'none';

    this.changeBackgroundImage(this.backgroundImagePaths[0]);

    this.game.bgmAudios[AssetNames.BGM_ENDING]?.play();

    this.enableSkip();

    this.textElement.addEventListener(
      'animationend',
      this.animationEndListener
    );

    const originalCallback = onComplete;
    this.endingSequenceCallback = () => {
      this.currentStep = 'showingStaffRoll';

      this.textElement.style.display = 'none';
      this.textElement.className = '';

      this.backgroundImages.forEach((img) => {
        if (img.classList.contains('active')) {
          img.classList.remove('active');
        }
      });

      setTimeout(() => {
        this.staffRollElement.style.display = 'block';
        this.staffRollElement.innerHTML = `
          <p>Director: AI Agent</p>
          <p>Programmer: AI Agent</p>
          <p>Artist: AI Agent</p>
          <p>Sound: AI Agent</p>
          <p>Special Thanks: User</p>
        `;
        this.staffRollElement.style.animation = 'scroll-up 30s linear forwards';

        setTimeout(() => {
          this.staffRollElement.style.display = 'none';
          this.textElement.style.display = 'block';
          this.textElement.textContent = 'おわり';
          this.textElement.className = 'sequence-text-fin';
          this.currentStep = 'showingFin';

          setTimeout(() => {
            this.disableSkip();
            this.overlayDiv.className = 'sequence-overlay-fade-out';
            this.fadeOutAudio(this.game.bgmAudios[AssetNames.BGM_ENDING], 1500);
            setTimeout(() => {
              this.overlayDiv.style.display = 'none';
              this.overlayDiv.className = '';
              this.textElement.className = '';

              this.backgroundImages.forEach((img) => {
                img.classList.remove('active');
                img.src = '';
                img.style.display = 'none';
              });
              this.game.sceneManager.restoreGameElements();
              this.game.sceneManager.resetCamera();
              originalCallback();
              this.currentStep = 'idle';
            }, 1500);
          }, 3500);
        }, 30000);
      }, 500);
    };
  }

  fadeOutAudio(audio, duration) {
    if (!audio || !audio.isPlaying) return;

    const startVolume = audio.getVolume();
    const startTime = this.game.clock.getElapsedTime();

    const fade = () => {
      const elapsedTime = this.game.clock.getElapsedTime() - startTime;
      if (elapsedTime < duration / 1000) {
        const newVolume = startVolume * (1 - elapsedTime / (duration / 1000));
        audio.setVolume(newVolume);
        requestAnimationFrame(fade);
      } else {
        audio.stop();
        audio.setVolume(startVolume);
      }
    };

    fade();
  }
}
