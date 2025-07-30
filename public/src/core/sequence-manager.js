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
    this.overlayDiv.style.zIndex = '9999';
    document.body.appendChild(this.overlayDiv);

    this.textElement = document.createElement('div');
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
    this.onSequenceCompleteCallback = null; // 追加
    this.currentStep = 'idle'; // 追加
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
        } else {
          // テキスト表示完了
          this.currentStep = 'textComplete';
          if (this.onSequenceCompleteCallback) {
            this.onSequenceCompleteCallback();
          }
        }
      }
    }
  }

  startOpeningSequence(onComplete) {
    this.onSequenceCompleteCallback = onComplete; // コールバックを保存
    this.currentStep = 'showingText'; // ステップを設定

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
    this.textElement.textContent = this.textSequence[this.currentTextIndex]; // 最初のテキストを表示
    this.textElement.style.display = 'block';
    this.logoImage.style.display = 'none';
    this.staffRollElement.style.display = 'none';

    this.game.bgmAudios[AssetNames.BGM_OPENING]?.play();

    // テキスト表示完了後の処理
    this.onSequenceCompleteCallback = () => {
      this.currentStep = 'fadingOut';
      // テキストとBGMをフェードアウト
      this.textElement.style.transition = 'opacity 1.5s ease-out';
      this.textElement.style.opacity = '0';
      this.fadeOutAudio(this.game.bgmAudios[AssetNames.BGM_OPENING], 3000);

      // 4秒待ってからタイトルへ
      setTimeout(() => {
        this.overlayDiv.style.display = 'none';
        this.textElement.style.display = 'none'; // 完全に非表示に
        this.game.sceneManager.restoreGameElements();
        this.game.sceneManager.resetCamera();
        onComplete();
        this.currentStep = 'idle'; // ステップをリセット
      }, 4000);
    };
  }

  startEndingSequence(onComplete) {
    this.onSequenceCompleteCallback = onComplete;
    this.currentStep = 'showingText';

    this.overlayDiv.style.display = 'flex';
    this.overlayDiv.style.opacity = '1'; // 初期透明度を0に設定

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

    this.game.bgmAudios[AssetNames.BGM_ENDING]?.play();

    this.onSequenceCompleteCallback = () => {
      this.currentStep = 'showingStaffRoll';
      this.textElement.style.transition = 'opacity 1.5s ease-out';
      this.textElement.style.opacity = '0';

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
          }, 1500); // フェードアウト完了を待つ
        }, 3500); // Fin表示開始から3.5秒後にフェードアウト開始
      }, 30000); // スタッフロール36秒
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
}
