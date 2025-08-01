import * as THREE from 'three';
import { GameState, AssetNames } from '../utils/constants.js';

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
    this.overlayDiv.style.zIndex = '10000'; // 他の要素より高い値
    document.body.appendChild(this.overlayDiv);

    // 背景画像用の要素を最初に追加（DOM順序で最背面）
    this.backgroundImages = [];
    this.currentBackgroundIndex = 0;

    // 2つの背景画像要素を作成（クロスフェード用）
    for (let i = 0; i < 2; i++) {
      const bgImage = document.createElement('img');
      bgImage.className = 'sequence-background-image';
      this.overlayDiv.appendChild(bgImage); // 最初に追加
      this.backgroundImages.push(bgImage);
    }

    this.textElement = document.createElement('div');
    this.textElement.style.opacity = '0';
    this.overlayDiv.appendChild(this.textElement);

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
    this.animationDuration = 5000; // 5 seconds per text
    this.onSequenceCompleteCallback = null;
    this.currentStep = 'idle';
    this.isSkippable = false;

    // スキップ用のイベントリスナーを追加
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

    // アニメーション終了イベントのリスナー
    this.animationEndListener = (event) => {
      if (event.target === this.textElement) {
        this.handleAnimationEnd();
      }
    };
  }

  // アニメーション終了ハンドラー
  handleAnimationEnd() {
    // 統合アニメーション完了、次のテキストへ
    this.currentTextIndex++;
    if (this.currentTextIndex < this.textSequence.length) {
      this.textElement.textContent = this.textSequence[this.currentTextIndex];
      // テキストインデックスに基づいてサイズを交互に変更
      const isLarge = this.currentTextIndex % 2 === 0;
      this.textElement.className = isLarge
        ? 'sequence-text-large'
        : 'sequence-text-small';

      // 背景画像を変更（オープニングシーケンス中のみ）
      if (
        this.backgroundImagePaths &&
        this.currentTextIndex < this.backgroundImagePaths.length
      ) {
        this.changeBackgroundImage(
          this.backgroundImagePaths[this.currentTextIndex]
        );
      }
    } else {
      // テキスト表示完了
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
    // 統合アニメーションでは、CSSアニメーションが完了するまで待つだけ
    // updateでの特別な処理は不要
  }

  // スキップ機能
  skipSequence() {
    if (!this.isSkippable || this.currentStep === 'idle') return;

    // 即座にシーケンス完了状態にする
    this.currentStep = 'textComplete';

    // アニメーションをすべてクリア
    this.textElement.className = '';
    this.overlayDiv.className = '';

    // オーディオを停止
    if (this.game.bgmAudios[AssetNames.BGM_OPENING]?.isPlaying) {
      this.game.bgmAudios[AssetNames.BGM_OPENING].stop();
    }
    if (this.game.bgmAudios[AssetNames.BGM_ENDING]?.isPlaying) {
      this.game.bgmAudios[AssetNames.BGM_ENDING].stop();
    }

    // イベントリスナーを削除
    this.disableSkip();

    // 即座にシーケンス終了処理を実行
    if (this.onSequenceCompleteCallback) {
      // 通常の終了処理をスキップして直接完了処理を実行
      this.overlayDiv.style.display = 'none';
      this.overlayDiv.className = '';
      this.textElement.style.display = 'none';
      this.textElement.className = '';
      this.staffRollElement.style.display = 'none';
      // 背景画像をクリア
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

      // 次の処理（タイトル画面表示など）を実行
      setTimeout(() => callback(), 100);
    }
  }

  // スキップ機能を有効にする
  enableSkip() {
    this.isSkippable = true;
    document.addEventListener('keydown', this.skipEventListener);
    this.overlayDiv.addEventListener('click', this.skipClickListener);
  }

  // スキップ機能を無効にする
  disableSkip() {
    this.isSkippable = false;
    document.removeEventListener('keydown', this.skipEventListener);
    this.overlayDiv.removeEventListener('click', this.skipClickListener);
    // アニメーションイベントリスナーも削除
    this.textElement.removeEventListener(
      'animationend',
      this.animationEndListener
    );
  }

  // 背景画像を切り替える（クロスフェード）
  changeBackgroundImage(imagePath) {
    if (!imagePath) return;

    // 次の背景画像要素を取得
    const nextIndex = (this.currentBackgroundIndex + 1) % 2;
    const nextImage = this.backgroundImages[nextIndex];
    const currentImage = this.backgroundImages[this.currentBackgroundIndex];

    // 新しい画像を設定
    nextImage.src = imagePath;
    nextImage.style.display = 'block';
    nextImage.style.zIndex = '-1'; // 背景に配置

    // 画像読み込み完了後にクロスフェード実行
    nextImage.onload = () => {
      // 新しい画像を表示
      nextImage.classList.add('active');

      // 前の画像をフェードアウト
      if (currentImage.classList.contains('active')) {
        currentImage.classList.remove('active');
      }
    };

    // 既にキャッシュされている場合に備えて即座に実行も試行
    if (nextImage.complete && nextImage.naturalHeight !== 0) {
      nextImage.onload();
    }

    // インデックスを更新
    this.currentBackgroundIndex = nextIndex;
  }

  startOpeningSequence(onComplete) {
    this.onSequenceCompleteCallback = onComplete; // コールバックを保存
    this.currentStep = 'showingText'; // 統合アニメーション開始

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

    // 背景画像のパスを定義
    this.backgroundImagePaths = [
      './assets/images/opening-bg-01.jpg',
      './assets/images/opening-bg-02.jpg',
      './assets/images/opening-bg-03.jpg',
      './assets/images/opening-bg-04.jpg',
      './assets/images/opening-bg-05.jpg',
    ];
    this.currentTextIndex = 0;
    this.textTimer = 0;
    this.textElement.textContent = this.textSequence[this.currentTextIndex]; // 最初のテキストを表示
    this.textElement.style.display = 'block';
    // 最初のテキストもサイズアニメーションを適用（偶数インデックスなので大きく）
    this.textElement.className = 'sequence-text-large';
    this.staffRollElement.style.display = 'none';

    // 最初の背景画像を表示（フェードイン効果付き）
    setTimeout(() => {
      this.changeBackgroundImage(this.backgroundImagePaths[0]);
    }, 500); // オーバーレイのフェードインと同時に開始

    this.game.bgmAudios[AssetNames.BGM_OPENING]?.play();

    // スキップ機能を有効にする
    this.enableSkip();

    // アニメーションイベントリスナーを追加
    this.textElement.addEventListener(
      'animationend',
      this.animationEndListener
    );

    // テキスト表示完了後の処理
    const originalCallback = onComplete;
    this.onSequenceCompleteCallback = () => {
      this.currentStep = 'fadingOut';
      // スキップ機能を無効にする
      this.disableSkip();
      // オーバーレイ全体をフェードアウト
      this.overlayDiv.className = 'sequence-overlay-fade-out';
      this.fadeOutAudio(this.game.bgmAudios[AssetNames.BGM_OPENING], 3000);

      // 背景画像をフェードアウト
      this.backgroundImages.forEach((img) => {
        if (img.classList.contains('active')) {
          img.classList.remove('active');
        }
      });

      // フェードアウト完了を待ってからタイトルへ
      setTimeout(() => {
        this.overlayDiv.style.display = 'none';
        this.overlayDiv.className = '';
        this.textElement.style.display = 'none';
        this.textElement.className = '';
        // 背景画像をクリア
        this.backgroundImages.forEach((img) => {
          img.src = '';
          img.style.display = 'none';
        });
        this.game.sceneManager.restoreGameElements();
        this.game.sceneManager.resetCamera();
        originalCallback();
        this.currentStep = 'idle'; // ステップをリセット
      }, 1500); // CSSアニメーション時間に合わせる
    };
  }

  startEndingSequence(onComplete) {
    this.onSequenceCompleteCallback = onComplete;
    this.currentStep = 'showingText';

    this.overlayDiv.style.display = 'flex';
    this.overlayDiv.className = 'sequence-overlay-fade-in';
    // エンディング開始時はオーバーレイを黒でフェードイン
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

    // エンディング用背景画像
    this.backgroundImagePaths = [
      './assets/images/ending-bg-01.jpg',
      './assets/images/ending-bg-02.jpg',
    ];
    this.currentTextIndex = 0;
    this.textTimer = 0;
    this.textElement.textContent = this.textSequence[this.currentTextIndex];
    this.textElement.style.display = 'block';
    // 最初のテキストもサイズアニメーションを適用（偶数インデックスなので大きく）
    this.textElement.className = 'sequence-text-large';
    this.staffRollElement.style.display = 'none';

    // 最初の背景画像を表示
    this.changeBackgroundImage(this.backgroundImagePaths[0]);

    this.game.bgmAudios[AssetNames.BGM_ENDING]?.play();

    // スキップ機能を有効にする
    this.enableSkip();

    // アニメーションイベントリスナーを追加
    this.textElement.addEventListener(
      'animationend',
      this.animationEndListener
    );

    const originalCallback = onComplete;
    this.endingSequenceCallback = () => {
      this.currentStep = 'showingStaffRoll';
      // テキストを完全に非表示に
      this.textElement.style.display = 'none';
      this.textElement.className = '';

      // 背景画像をフェードアウト
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
          this.textElement.textContent = 'Fin';
          this.textElement.className = 'sequence-text-fin'; // Fin専用アニメーション
          this.currentStep = 'showingFin';

          setTimeout(() => {
            // スキップ機能を無効にする
            this.disableSkip();
            this.overlayDiv.className = 'sequence-overlay-fade-out';
            this.fadeOutAudio(this.game.bgmAudios[AssetNames.BGM_ENDING], 1500);
            setTimeout(() => {
              this.overlayDiv.style.display = 'none';
              this.overlayDiv.className = '';
              this.textElement.className = '';
              // 背景画像をクリア
              this.backgroundImages.forEach((img) => {
                img.classList.remove('active');
                img.src = '';
                img.style.display = 'none';
              });
              this.game.sceneManager.restoreGameElements();
              this.game.sceneManager.resetCamera();
              originalCallback();
              this.currentStep = 'idle';
            }, 1500); // CSSフェードアウト完了を待つ
          }, 3500); // Fin表示開始から3.5秒後にフェードアウト開始
        }, 30000); // スタッフロール30秒
      }, 500); // テキストフェードアウト完了を待つ
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
