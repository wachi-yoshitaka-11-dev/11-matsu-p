import * as THREE from 'three';
import { GameState, AssetNames } from '../utils/constants.js';

export class SequenceManager {
  constructor(game) {
    this.game = game;
    this.currentSequence = null;
    this.sequenceCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.sequenceCamera.position.set(0, 5, 10);
    this.sequenceCamera.lookAt(0, 0, 0);

    this.overlayDiv = document.createElement('div');
    this.overlayDiv.id = 'sequence-overlay';
    this.overlayDiv.style.position = 'fixed';
    this.overlayDiv.style.top = '0';
    this.overlayDiv.style.left = '0';
    this.overlayDiv.style.width = '100%';
    this.overlayDiv.style.height = '100%';
    this.overlayDiv.style.backgroundColor = 'black';
    this.overlayDiv.style.color = 'white';
    this.overlayDiv.style.display = 'none';
    this.overlayDiv.style.flexDirection = 'column';
    this.overlayDiv.style.justifyContent = 'center';
    this.overlayDiv.style.alignItems = 'center';
    this.overlayDiv.style.fontSize = '2em';
    this.overlayDiv.style.textAlign = 'center';
    this.overlayDiv.style.overflow = 'hidden';
    this.overlayDiv.style.zIndex = '9999';
    document.body.appendChild(this.overlayDiv);

    this.textElement = document.createElement('div');
    this.textElement.style.transition = 'opacity 0.5s ease-in-out, font-size 0.5s ease-in-out, transform 0.5s ease-in-out'; // Set transition once
    this.overlayDiv.appendChild(this.textElement);

    this.logoImage = document.createElement('img');
    this.logoImage.src = './assets/images/logo.png';
    this.logoImage.style.maxWidth = '80%';
    this.logoImage.style.maxHeight = '80%';
    this.logoImage.style.objectFit = 'contain';
    this.logoImage.style.display = 'none';
    this.overlayDiv.appendChild(this.logoImage);

    this.staffRollElement = document.createElement('div');
    this.staffRollElement.style.position = 'absolute';
    this.staffRollElement.style.bottom = '0';
    this.staffRollElement.style.width = '100%';
    this.staffRollElement.style.textAlign = 'center';
    this.staffRollElement.style.fontSize = '1.5em';
    this.staffRollElement.style.display = 'none';
    this.overlayDiv.appendChild(this.staffRollElement);

    this.currentTextIndex = 0;
    this.textSequence = [];
    this.textDisplayDuration = 4000; // 4 seconds
    this.textFadeDuration = 500; // 0.5 seconds for fade in/out
    this.textTimer = 0;
    this.onSequenceCompleteCallback = null;
    this.currentStep = 'idle';

    this.initialFontSize = 2;
    this.minFontSize = 1.5;
    this.maxFontSize = 2.5;
    this.currentFontSize = this.initialFontSize;
    this.currentRotation = 0;
    this.rotationDirection = 1; // 1 for clockwise, -1 for counter-clockwise

    this.backgroundImages = [
      './assets/images/opening-bg-1.png',
      './assets/images/opening-bg-2.png',
      './assets/images/opening-bg-3.png',
      './assets/images/opening-bg-4.png',
      './assets/images/opening-bg-5.png',
      './assets/images/opening-bg-6.png',
      './assets/images/opening-bg-7.png',
      './assets/images/opening-bg-8.png',
    ];
    this.currentImageIndex = 0;
    this.imageElements = [];
    this.createBackgroundImages();
    this.skipSequenceBound = this.skipSequence.bind(this);
  }

  createBackgroundImages() {
    this.backgroundImages.forEach(src => {
      const img = document.createElement('img');
      img.src = src;
      img.style.position = 'absolute';
      img.style.top = '0';
      img.style.left = '0';
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      img.style.opacity = '0';
      img.style.transition = 'opacity 1.5s ease-in-out, transform 10s linear';
      this.overlayDiv.insertBefore(img, this.textElement);
      this.imageElements.push(img);
    });
  }

  skipSequence() {
    if (this.currentStep === 'showingText' || this.currentStep === 'showingStaffRoll') {
      // Immediately complete the current sequence
      if (this.onSequenceCompleteCallback) {
        this.onSequenceCompleteCallback();
      }
      this.currentStep = 'idle'; // Reset step
      this.removeEventListeners();
    }
  }

  addEventListeners() {
    this.overlayDiv.addEventListener('keydown', this.skipSequenceBound);
    this.overlayDiv.addEventListener('mousedown', this.skipSequenceBound);
  }

  removeEventListeners() {
    this.overlayDiv.removeEventListener('keydown', this.skipSequenceBound);
    this.overlayDiv.removeEventListener('mousedown', this.skipSequenceBound);
  }

  update(deltaTime) {
    if (this.currentSequence) {
      this.currentSequence.update(deltaTime);
    }

    // テキスト表示の進行をdeltaTimeで管理
    if (this.currentStep === 'showingText') {
      this.textTimer += deltaTime * 1000; // deltaTimeは秒なのでミリ秒に変換

      // フェードイン
      if (this.textTimer < this.textFadeDuration) {
        this.textElement.style.opacity = (this.textTimer / this.textFadeDuration).toString();
      } else if (this.textTimer < this.textDisplayDuration - this.textFadeDuration) {
        // 表示維持
        this.textElement.style.opacity = '1';
      } else if (this.textTimer < this.textDisplayDuration) {
        // フェードアウト
        this.textElement.style.opacity = (1 - (this.textTimer - (this.textDisplayDuration - this.textFadeDuration)) / this.textFadeDuration).toString();
      } else {
        this.textTimer = 0;
        this.currentTextIndex++;
        if (this.currentTextIndex < this.textSequence.length) {
          this.textElement.textContent = this.textSequence[this.currentTextIndex];
          // Reset opacity for the new text to fade in
          this.textElement.style.opacity = '0';

          // Text size animation
          const progress = this.currentTextIndex / (this.textSequence.length - 1);
          const targetFontSize = (this.currentTextIndex % 2 === 0) ? this.minFontSize : this.maxFontSize;
          this.textElement.style.fontSize = `${targetFontSize}em`;

          // Image crossfade and rotation
          this.imageElements[this.currentImageIndex].style.opacity = '0';
          this.currentImageIndex = (this.currentImageIndex + 1) % this.backgroundImages.length;
          this.imageElements[this.currentImageIndex].style.opacity = '1';

          this.rotationDirection *= -1; // Alternate rotation direction
          this.imageElements[this.currentImageIndex].style.transform = `rotate(${this.rotationDirection * 90}deg)`;

        } else {
          // All texts have been displayed and faded out
          this.currentStep = 'textComplete';
          if (this.onSequenceCompleteCallback) {
            this.onSequenceCompleteCallback();
          }
        }
      }
    }
  }

  startOpeningSequence(onComplete) {
    this.onSequenceCompleteCallback = onComplete;
    this.isEndingSequence = false; // Set flag for opening sequence
    this.currentStep = 'showingText';

    this.overlayDiv.style.display = 'flex';
    this.overlayDiv.style.opacity = '1';
    this.game.sceneManager.setCamera(this.sequenceCamera);
    this.game.sceneManager.hideGameElements();

    this.textSequence = [
      '忘れ去られた王国',
      'かつて、この王国は光に満ちていた。',
      'しかし、謎の呪いにより、その輝きは失われた。',
      '今、一匹の猫が目覚める。失われた記憶と、王国を救う使命を胸に。',
      '希望の光は、再びこの地に灯るのか。',
    ];
    this.currentTextIndex = 0;
    this.textTimer = 0;
    this.textElement.textContent = this.textSequence[this.currentTextIndex];
    this.textElement.style.display = 'block';
    this.textElement.style.fontSize = `${this.initialFontSize}em`; // Set initial font size
    this.logoImage.style.display = 'none';
    this.staffRollElement.style.display = 'none';

    // Initialize background images
    this.imageElements.forEach((img, index) => {
      img.style.opacity = index === 0 ? '1' : '0';
      img.style.transform = 'rotate(0deg)'; // Reset rotation
    });
    this.currentImageIndex = 0;
    this.rotationDirection = 1; // Reset rotation direction

    this.game.playAudio(this.game.bgmAudios[AssetNames.BGM_OPENING]);

    this.addEventListeners(); // Add event listeners for skipping

    // Callback for when all opening texts are displayed and faded out
    this.onSequenceCompleteCallback = () => {
      this.currentStep = 'fadingOut';
      // Fade out text and BGM
      this.textElement.style.opacity = '0';
      this.fadeOutAudio(this.game.bgmAudios[AssetNames.BGM_OPENING], 3000);

      // Wait 4 seconds then transition to title
      setTimeout(() => {
        this.overlayDiv.style.display = 'none';
        this.textElement.style.display = 'none'; // Fully hide
        this.game.sceneManager.restoreGameElements();
        this.game.sceneManager.resetCamera();
        onComplete();
        this.currentStep = 'idle'; // Reset step
        this.removeEventListeners(); // Remove event listeners after sequence completes
      }, 4000);
    };
  }

  startEndingSequence(onComplete) {
    this.currentStep = 'showingText';

    this.overlayDiv.style.display = 'flex';
    this.overlayDiv.style.opacity = '0'; // Initial opacity to 0
    this.overlayDiv.style.transition = 'opacity 1.5s ease-in-out'; // Fade in/out transition
    // Start fade in
    setTimeout(() => {
      this.overlayDiv.style.opacity = '1';
    }, 100);

    this.textElement.style.opacity = '0'; // Initial opacity to 0
    this.textElement.style.transition = 'opacity 0.5s ease-in-out'; // Fade in/out transition
    this.game.sceneManager.setCamera(this.sequenceCamera);
    this.game.sceneManager.hideGameElements();

    this.textSequence = [
      '呪いは解かれ、王国に平和が戻った。',
      'しかし、冒険はまだ始まったばかりだ…'
    ];
    this.currentTextIndex = 0;
    this.textTimer = 0;
    this.textElement.textContent = this.textSequence[this.currentTextIndex];
    this.textElement.style.display = 'block';
    this.logoImage.style.display = 'none';
    this.staffRollElement.style.display = 'none';

    this.game.playAudio(this.game.bgmAudios[AssetNames.BGM_ENDING]);

    this.addEventListeners(); // Add event listeners for skipping

    // This callback will be triggered by the update method when all texts are displayed
    this.onSequenceCompleteCallback = () => {
      this.currentStep = 'showingStaffRoll';
      this.textElement.style.display = 'none';
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
        this.textElement.textContent = 'Fin';
        this.textElement.style.opacity = '0';
        this.textElement.style.transition = 'opacity 1.5s ease-in-out';
        this.currentStep = 'showingFin';

        setTimeout(() => {
          this.textElement.style.opacity = '1';
        }, 100);

        setTimeout(() => {
          this.textElement.style.opacity = '0';
          this.fadeOutAudio(this.game.bgmAudios[AssetNames.BGM_ENDING], 1500);
          setTimeout(() => {
            this.overlayDiv.style.display = 'none';
            this.game.sceneManager.restoreGameElements();
            this.game.sceneManager.resetCamera();
            onComplete();
            this.currentStep = 'idle';
            this.removeEventListeners(); // Remove event listeners after sequence completes
          }, 1500); // Wait for fade out to complete
        }, 3500); // 3.5 seconds after Fin display starts, start fade out
      }, 30000); // Staff roll duration 30 seconds
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
        audio.setVolume(startVolume); // Restore original volume for next play
      }
    };

    fade();
  }

  _showNextText(onSequenceComplete) {
    if (this.currentTextIndex < this.textSequence.length) {
      this.textElement.textContent = this.textSequence[this.currentTextIndex];
      this.textElement.style.display = 'block';
      this.currentTextIndex++;
      this.textTimer = 0;
      setTimeout(() => {
        this._showNextText(onSequenceComplete);
      }, this.textDisplayDuration);
    } else {
      onSequenceComplete();
    }
  }
}
