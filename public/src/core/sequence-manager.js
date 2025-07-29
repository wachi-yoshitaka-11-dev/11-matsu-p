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
    this.textDisplayDuration = 3000; // 3 seconds
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
      if (this.textTimer >= this.textDisplayDuration) {
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
    this.game.sceneManager.setCamera(this.sequenceCamera);
    this.game.sceneManager.hideGameElements();

    this.textSequence = [
      '忘れ去られた王国',
      'かつて、この王国は光に満ちていた。'
      ,'しかし、謎の呪いにより、その輝きは失われた。'
      ,'今、一匹の猫が目覚める。失われた記憶と、王国を救う使命を胸に。'
      ,'希望の光は、再びこの地に灯るのか。'
    ];
    this.currentTextIndex = 0;
    this.textTimer = 0;
    this.textElement.textContent = this.textSequence[this.currentTextIndex]; // 最初のテキストを表示
    this.textElement.style.display = 'block';
    this.logoImage.style.display = 'none';
    this.staffRollElement.style.display = 'none';

    this.game.bgmAudios[AssetNames.BGM_TITLE]?.play();

    // テキスト表示完了後の処理をupdateメソッドに移行するため、setTimeoutを削除
    // _showNextText() の代わりに update メソッドで進行を管理
    // ここではテキスト表示完了後の処理を onSequenceCompleteCallback に設定
    this.onSequenceCompleteCallback = () => {
      this.textElement.style.display = 'none';
      this.logoImage.style.display = 'block';
      this.currentStep = 'showingLogo'; // ステップを設定
      setTimeout(() => {
        this.overlayDiv.style.display = 'none';
        this.game.sceneManager.restoreGameElements();
        this.game.sceneManager.resetCamera();
        this.game.bgmAudios[AssetNames.BGM_TITLE]?.stop();
        onComplete();
        this.currentStep = 'idle'; // ステップをリセット
      }, 2000); // ロゴ表示2秒
    };
  }

  startEndingSequence(onComplete) {
    this.overlayDiv.style.display = 'flex';
    this.game.sceneManager.setCamera(this.sequenceCamera);
    this.game.sceneManager.hideGameElements(); // ゲーム要素を非表示にするメソッドを仮定

    this.textSequence = [
      '呪いは解かれ、王国に平和が戻った。',
      'しかし、冒険はまだ始まったばかりだ…'
    ];
    this.currentTextIndex = 0;
    this.textTimer = 0;
    this.textElement.textContent = this.textSequence[this.currentTextIndex]; // 最初のテキストを表示
    this.textElement.style.display = 'block';
    this.logoImage.style.display = 'none';
    this.staffRollElement.style.display = 'none';

    this.game.bgmAudios[AssetNames.BGM_PLAYING]?.play();

    // テキスト表示完了後の処理をupdateメソッドに移行するため、setTimeoutを削除
    // _showNextText() の代わりに update メソッドで進行を管理
    // ここではテキスト表示完了後の処理を onSequenceCompleteCallback に設定
    this.onSequenceCompleteCallback = () => {
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
      this.currentStep = 'showingStaffRoll'; // ステップを設定

      setTimeout(() => {
        this.staffRollElement.style.display = 'none';
        this.textElement.style.display = 'block';
        this.textElement.textContent = 'Fin';
        this.currentStep = 'showingFin'; // ステップを設定
        setTimeout(() => {
          this.overlayDiv.style.display = 'none';
          this.game.sceneManager.restoreGameElements();
          this.game.sceneManager.resetCamera();
          this.game.bgmAudios[AssetNames.BGM_PLAYING]?.stop();
          onComplete();
          this.currentStep = 'idle'; // ステップをリセット
        }, 5000); // Fin表示5秒
      }, 30000); // スタッフロール30秒
    };
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
