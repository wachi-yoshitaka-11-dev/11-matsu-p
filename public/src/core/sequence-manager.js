import * as THREE from 'three';
import { AssetNames } from '../utils/constants.js';

const SEQUENCE_CAMERA_CONFIG = {
  FOV: 75,
  NEAR: 0.1,
  FAR: 1000,
  POSITION: { x: 0, y: 5, z: 10 },
  LOOK_AT: { x: 0, y: 0, z: 0 },
};

export class SequenceManager {
  constructor(game) {
    this.game = game;
    this.currentSequence = null;
    this.sequencesData = null;

    // 初期化時にsequencesDataを読み込み
    this.loadSequencesData();
    this.sequenceCamera = new THREE.PerspectiveCamera(
      SEQUENCE_CAMERA_CONFIG.FOV,
      window.innerWidth / window.innerHeight,
      SEQUENCE_CAMERA_CONFIG.NEAR,
      SEQUENCE_CAMERA_CONFIG.FAR
    );
    this.sequenceCamera.position.set(
      SEQUENCE_CAMERA_CONFIG.POSITION.x,
      SEQUENCE_CAMERA_CONFIG.POSITION.y,
      SEQUENCE_CAMERA_CONFIG.POSITION.z
    );
    this.sequenceCamera.lookAt(
      SEQUENCE_CAMERA_CONFIG.LOOK_AT.x,
      SEQUENCE_CAMERA_CONFIG.LOOK_AT.y,
      SEQUENCE_CAMERA_CONFIG.LOOK_AT.z
    );

    this.overlayDiv = document.createElement('div');
    this.overlayDiv.id = 'sequence-overlay';
    this.overlayDiv.classList.add('sequence-overlay');
    this.overlayDiv.classList.add('hidden');
    document.body.appendChild(this.overlayDiv);

    this.backgroundImages = [];
    this.currentBackgroundIndex = 0;
    for (let i = 0; i < 2; i++) {
      const bgImage = document.createElement('img');
      bgImage.classList.add('sequence-background-image');
      bgImage.alt = '';
      this.overlayDiv.appendChild(bgImage);
      this.backgroundImages.push(bgImage);
    }

    this.textElement = document.createElement('div');
    this.textElement.classList.add('transparent');
    this.overlayDiv.appendChild(this.textElement);

    this.staffRollElement = document.createElement('div');
    this.staffRollElement.classList.add('staff-roll');
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

  async loadSequencesData() {
    if (!this.sequencesData) {
      try {
        this.sequencesData = await this.game.assetLoader.loadJSON(
          'sequences',
          'data/sequences.json'
        );
      } catch (error) {
        console.error('Failed to load sequences data:', error);
        // フォールバック
        this.sequencesData = {
          opening: {
            texts: [],
            backgroundImages: [],
          },
          ending: {
            texts: [],
            backgroundImages: [],
            staffRoll: [],
            finText: '',
          },
        };
      }
    }
    return this.sequencesData;
  }

  handleAnimationEnd() {
    this.currentTextIndex++;
    if (this.currentTextIndex < this.textSequence.length) {
      this.textElement.textContent = this.textSequence[this.currentTextIndex];
      const isLarge = this.currentTextIndex % 2 === 0;
      if (isLarge) {
        this.textElement.classList.remove('sequence-text-small');
        this.textElement.classList.add('sequence-text-large');
      } else {
        this.textElement.classList.remove('sequence-text-large');
        this.textElement.classList.add('sequence-text-small');
      }

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

    this.textElement.classList.remove(
      'sequence-text-large',
      'sequence-text-small',
      'sequence-text-fin'
    );
    this.overlayDiv.classList.remove(
      'sequence-overlay-fade-in',
      'sequence-overlay-fade-out'
    );

    if (this.game.bgmAudios[AssetNames.BGM_OPENING]?.isPlaying) {
      this.game.bgmAudios[AssetNames.BGM_OPENING].stop();
    }
    if (this.game.bgmAudios[AssetNames.BGM_ENDING]?.isPlaying) {
      this.game.bgmAudios[AssetNames.BGM_ENDING].stop();
    }

    this.disableSkip();

    if (this.onSequenceCompleteCallback) {
      this.overlayDiv.classList.add('hidden');
      this.overlayDiv.classList.remove('visible-flex');
      this.overlayDiv.classList.remove(
        'sequence-overlay-fade-in',
        'sequence-overlay-fade-out'
      );
      this.textElement.classList.add('hidden');
      this.textElement.classList.remove('visible');
      this.textElement.classList.remove(
        'sequence-text-large',
        'sequence-text-small',
        'sequence-text-fin'
      );
      this.staffRollElement.classList.add('hidden');
      this.staffRollElement.classList.remove('visible');

      this.backgroundImages.forEach((img) => {
        img.classList.remove('active');
        img.src = '';
        img.classList.add('hidden');
        img.classList.remove('visible-image');
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

    // ファイルパスを自動補完（./assets/images/プレフィックスを追加）
    const fullImagePath = imagePath.startsWith('./')
      ? imagePath
      : `./assets/images/${imagePath}`;
    nextImage.src = fullImagePath;
    nextImage.classList.remove('hidden');
    nextImage.classList.add('visible-image');
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

    this.overlayDiv.classList.remove('hidden');
    this.overlayDiv.classList.add('visible-flex');
    this.overlayDiv.classList.add('sequence-overlay-fade-in');
    this.game.sceneManager.setCamera(this.sequenceCamera);
    this.game.sceneManager.hideGameElements();

    // 初期化時に読み込まれたデータを使用
    this.textSequence = this.sequencesData.opening.texts;
    this.backgroundImagePaths = this.sequencesData.opening.backgroundImages;
    this.currentTextIndex = 0;
    this.textTimer = 0;
    this.textElement.textContent = this.textSequence[this.currentTextIndex];
    this.textElement.classList.remove('hidden', 'transparent');
    this.textElement.classList.add('visible');

    this.textElement.classList.remove(
      'sequence-text-small',
      'sequence-text-fin'
    );
    this.textElement.classList.add('sequence-text-large');
    this.staffRollElement.classList.add('hidden');
    this.staffRollElement.classList.remove('visible');

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

      this.overlayDiv.classList.add('sequence-overlay-fade-out');
      this.fadeOutAudio(this.game.bgmAudios[AssetNames.BGM_OPENING], 3000);

      this.backgroundImages.forEach((img) => {
        if (img.classList.contains('active')) {
          img.classList.remove('active');
        }
      });

      setTimeout(() => {
        this.overlayDiv.classList.add('hidden');
        this.overlayDiv.classList.remove('visible-flex');
        this.overlayDiv.classList.remove(
          'sequence-overlay-fade-in',
          'sequence-overlay-fade-out'
        );
        this.textElement.classList.add('hidden');
        this.textElement.classList.remove('visible');
        this.textElement.classList.remove(
          'sequence-text-large',
          'sequence-text-small',
          'sequence-text-fin'
        );

        this.backgroundImages.forEach((img) => {
          img.src = '';
          img.classList.add('hidden');
          img.classList.remove('visible-image');
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

    this.overlayDiv.classList.remove('hidden');
    this.overlayDiv.classList.add('visible-flex');
    this.overlayDiv.classList.add('sequence-overlay-fade-in');

    this.overlayDiv.classList.add('bg-black');
    setTimeout(() => {
      this.overlayDiv.classList.remove('bg-black');
      this.overlayDiv.classList.add('bg-transparent');
    }, 1000);

    this.game.sceneManager.setCamera(this.sequenceCamera);
    this.game.sceneManager.hideGameElements();

    // 初期化時に読み込まれたデータを使用
    this.textSequence = this.sequencesData.ending.texts;
    this.backgroundImagePaths = this.sequencesData.ending.backgroundImages;
    this.currentTextIndex = 0;
    this.textTimer = 0;
    this.textElement.textContent = this.textSequence[this.currentTextIndex];
    this.textElement.classList.remove('hidden', 'transparent');
    this.textElement.classList.add('visible');

    this.textElement.classList.remove(
      'sequence-text-small',
      'sequence-text-fin'
    );
    this.textElement.classList.add('sequence-text-large');
    this.staffRollElement.classList.add('hidden');
    this.staffRollElement.classList.remove('visible');

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

      this.textElement.classList.add('hidden');
      this.textElement.classList.remove('visible');
      this.textElement.classList.remove(
        'sequence-text-large',
        'sequence-text-small',
        'sequence-text-fin'
      );

      this.backgroundImages.forEach((img) => {
        if (img.classList.contains('active')) {
          img.classList.remove('active');
        }
      });

      setTimeout(() => {
        this.staffRollElement.classList.remove('hidden');
        this.staffRollElement.classList.add('visible');
        const staffRollHtml = this.sequencesData.ending.staffRoll
          .map((credit) => `<p>${credit}</p>`)
          .join('');
        this.staffRollElement.innerHTML = staffRollHtml;
        this.staffRollElement.classList.add('staff-roll-animation');

        setTimeout(() => {
          this.staffRollElement.classList.add('hidden');
          this.staffRollElement.classList.remove('visible');
          this.textElement.classList.remove('hidden');
          this.textElement.classList.add('visible');
          this.textElement.textContent = this.sequencesData.ending.finText;
          this.textElement.classList.remove(
            'sequence-text-large',
            'sequence-text-small'
          );
          this.textElement.classList.add('sequence-text-fin');
          this.currentStep = 'showingFin';

          setTimeout(() => {
            this.disableSkip();
            this.overlayDiv.classList.add('sequence-overlay-fade-out');
            this.fadeOutAudio(this.game.bgmAudios[AssetNames.BGM_ENDING], 1500);
            setTimeout(() => {
              this.overlayDiv.classList.add('hidden');
              this.overlayDiv.classList.remove('visible-flex');
              this.overlayDiv.classList.remove(
                'sequence-overlay-fade-in',
                'sequence-overlay-fade-out'
              );
              this.textElement.classList.remove(
                'sequence-text-large',
                'sequence-text-small',
                'sequence-text-fin'
              );

              this.backgroundImages.forEach((img) => {
                img.classList.remove('active');
                img.src = '';
                img.classList.add('hidden');
                img.classList.remove('visible-image');
              });
              this.game.sceneManager.restoreGameElements();
              this.game.sceneManager.resetCamera();
              originalCallback();
              this.currentStep = 'idle';
            }, 1500);
          }, 3500);
        }, 25000);
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
