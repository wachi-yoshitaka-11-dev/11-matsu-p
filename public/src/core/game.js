import * as THREE from 'three';
import { SceneManager } from './scene-manager.js';
import { AssetLoader } from './asset-loader.js';
import { Field } from '../world/field.js';
import { Player } from '../entities/characters/player.js';
import { Enemy } from '../entities/characters/enemy.js';
import { Boss } from '../entities/characters/boss.js';
import { Npc } from '../entities/characters/npc.js';
import { Item } from '../entities/items/item.js';
import { InputController } from '../controls/input-controller.js';
import { Hud } from '../ui/hud.js';
import { TitleScreen } from '../ui/title-screen.js';
import { PauseMenu } from '../ui/pause-menu.js';
import { DialogBox } from '../ui/dialog-box.js';
import { EnemyHealthBar } from '../ui/enemy-health-bar.js';
import { LockOnUI } from '../ui/lock-on-ui.js';
import { AssetPaths, GameState, ItemConstants } from '../utils/constants.js';
import { SequenceManager } from './sequence-manager.js';
import { localization } from '../utils/localization.js';

export class Game {
  constructor() {
    this.sceneManager = new SceneManager();
    this.assetLoader = new AssetLoader();
    this.clock = new THREE.Clock();

    this.field = null;
    this.player = null;
    this.inputController = null;
    this.hud = null;
    this.enemyHealthBar = null;

    this.enemies = [];
    this.items = [];
    this.projectiles = [];
    this.areaAttacks = [];

    this.boss = null;
    this.npcs = [];
    this.data = {};

    this.minDisplayTimeTimeoutId = null;
    this.splashSkipped = false;

    this.initAudio();
    this.setupBeforeUnloadHandler();

    this.gameState = GameState.OPENING;
    this.titleScreen = new TitleScreen(
      () => this.startGame(),
      () => this.skipSplashScreenDelay()
    );

    // UI components will be initialized after localization is loaded
    this.pauseMenu = null;
    this.dialogBox = null;
    this.sequenceManager = null;
  }

  initAudio() {
    this.listener = new THREE.AudioListener();
    this.sceneManager.camera.add(this.listener);
    this.audioBuffers = {};
    this.bgmAudios = {};
    this.currentBGM = null;
    this.currentLevel = 1;
    this.currentLevelProgress = 1;
  }

  setupBeforeUnloadHandler() {
    window.addEventListener('beforeunload', (e) => {
      // 実際のゲームプレイ中のみ防止
      if (
        this.player &&
        !this.player.isDead &&
        this.gameState === GameState.PLAYING
      ) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    });
  }

  async init() {
    this.sceneManager.init();
    this.titleScreen.showSplash();

    const loadStartTime = Date.now();

    await this.loadGameData();
    await this.loadAudio();
    await this.loadModels();

    this.field = new Field(this);
    this.sceneManager.add(this.field.mesh);

    this.player = new Player(this, 'player');
    this.sceneManager.add(this.player.mesh);

    this.hud = new Hud(this, this.player);

    // Update UI text after localization is loaded
    this.updateUITexts();
    this.enemyHealthBar = new EnemyHealthBar(this, this.sceneManager);
    this.lockOnUI = new LockOnUI(this.sceneManager, this.sceneManager.camera);

    this.inputController = new InputController(
      this.player,
      this.sceneManager.camera,
      this,
      this.sceneManager.renderer.domElement
    );

    this.loadEntities();

    // All initialization complete - now handle splash screen timing
    const elapsedTime = Date.now() - loadStartTime;
    const minDisplayTime = 10000;
    const remainingTime = Math.max(0, minDisplayTime - elapsedTime);

    if (this.splashSkipped) {
      this.playOpeningSequence();
    } else {
      this.minDisplayTimeTimeoutId = setTimeout(() => {
        this.minDisplayTimeTimeoutId = null;
        this.playOpeningSequence();
      }, remainingTime);
    }
  }

  async loadGameData() {
    const dataFiles = [
      'player',
      'weapons',
      'shields',
      'enemies',
      'npcs',
      'items',
      'skills',
      'localization',
      'terrains',
      'environments',
    ];
    for (const fileName of dataFiles) {
      const data = await this.assetLoader.loadJSON(
        fileName,
        `data/${fileName}.json`
      );
      this.data[fileName] = data;
    }

    // Initialize localization
    localization.init(this.data.localization);

    // Initialize UI components after localization is loaded
    this.pauseMenu = new PauseMenu(this);
    this.dialogBox = new DialogBox(this);
    this.sequenceManager = new SequenceManager(this);

    // Update UI texts after localization is loaded
    if (this.titleScreen) {
      this.titleScreen.updateTexts();
    }
  }

  async loadAudio() {
    const audioAssets = [
      AssetPaths.BGM_ENDING,
      AssetPaths.BGM_OPENING,
      AssetPaths.BGM_TITLE,
      AssetPaths.SFX_ATTACK_STRONG,
      AssetPaths.SFX_ATTACK_WEAK,
      AssetPaths.SFX_BACK_STEP,
      AssetPaths.SFX_CLICK,
      AssetPaths.SFX_DAMAGE,
      AssetPaths.SFX_DASH,
      AssetPaths.SFX_DEATH,
      AssetPaths.SFX_GUARD,
      AssetPaths.SFX_JUMP,
      AssetPaths.SFX_KILL,
      AssetPaths.SFX_LEVEL_UP,
      AssetPaths.SFX_LOCK_ON,
      AssetPaths.SFX_PAUSE,
      AssetPaths.SFX_PICKUP_ITEM,
      AssetPaths.SFX_ROLLING,
      AssetPaths.SFX_START,
      AssetPaths.SFX_SWITCH_ITEM,
      AssetPaths.SFX_SWITCH_SHIELD,
      AssetPaths.SFX_SWITCH_SKILL,
      AssetPaths.SFX_SWITCH_WEAPON,
      AssetPaths.SFX_TALK,
      AssetPaths.SFX_UNPAUSE,
      AssetPaths.SFX_USE_ITEM,
      AssetPaths.SFX_USE_SKILL_BUFF,
      AssetPaths.SFX_USE_SKILL_PROJECTILE,
      AssetPaths.SFX_USE_SKILL_AREA_ATTACK,
      AssetPaths.SFX_WALK,
    ];

    for (const assetName of audioAssets) {
      const buffer = await this.assetLoader.loadAudio(
        assetName,
        `assets/audio/${assetName}`
      );

      if (
        assetName === AssetPaths.BGM_TITLE ||
        assetName === AssetPaths.BGM_OPENING ||
        assetName === AssetPaths.BGM_ENDING
      ) {
        this.bgmAudios[assetName] = new THREE.Audio(this.listener);
        this.bgmAudios[assetName].setBuffer(buffer);
        this.bgmAudios[assetName].setLoop(true);
        this.bgmAudios[assetName].setVolume(0.4);
      }
    }
  }

  loadEntities() {
    const item = new Item(this, 'potion', new THREE.Vector3(0, 2, -5));
    this.items.push(item);
    this.sceneManager.add(item.mesh);

    const enemy = new Enemy(this, 'forestGoblin', new THREE.Vector3(5, 0, 0), {
      player: this.player,
    });

    this.enemies.push(enemy);
    this.sceneManager.add(enemy.mesh);

    const boss = new Boss(this, 'dragonKing', new THREE.Vector3(10, 0.5, 10), {
      player: this.player,
    });
    this.boss = boss;
    this.enemies.push(boss);
    this.sceneManager.add(boss.mesh);

    const npc = new Npc(this, 'guide', new THREE.Vector3(-5, 0.5, -5));
    this.npcs.push(npc);
    this.sceneManager.add(npc.mesh);
  }

  async loadModels() {
    const assetsToLoad = [];

    // Player assets
    assetsToLoad.push({
      model: this.data.player.model,
      texture: this.data.player.texture,
    });

    // Collect all assets from JSON data
    const collections = [
      this.data.enemies,
      this.data.items,
      this.data.npcs,
      this.data.shields,
      this.data.weapons,
      this.data.skills,
      this.data.terrains,
    ];

    for (const collection of collections) {
      if (collection) {
        for (const item of Object.values(collection)) {
          if (item.model || item.texture) {
            assetsToLoad.push({
              model: item.model,
              texture: item.texture,
            });
          }
        }
      }
    }

    // Environment textures
    if (this.data.environments) {
      for (const envData of Object.values(this.data.environments)) {
        if (envData.texture) {
          assetsToLoad.push({
            texture: envData.texture,
          });
        }
      }
    }

    for (const asset of assetsToLoad) {
      try {
        if (asset.model) {
          await this.assetLoader.loadGLTF(
            asset.model.replace('.glb', ''),
            `assets/models/${asset.model}`
          );
        }
        if (asset.texture) {
          try {
            await this.assetLoader.loadTexture(
              asset.texture.replace('.png', ''),
              `assets/textures/${asset.texture}`
            );
          } catch (error) {
            console.warn(
              `Texture for ${asset.model || asset.texture} not found. Using default material.`,
              error
            );
          }
        }
      } catch (error) {
        console.error(
          `Could not load model ${asset.model}. A placeholder will be used.`,
          error
        );
      }
    }
  }

  async startGame() {
    if (this.gameState !== GameState.TITLE) return;

    this.gameState = GameState.PLAYING;
    this.sceneManager.showCanvas();
    this.hud?.show();

    if (this.titleScreen) {
      this.titleScreen.hideAll();
    }
    if (this.bgmAudios[AssetPaths.BGM_TITLE]?.isPlaying) {
      this.bgmAudios[AssetPaths.BGM_TITLE].stop();
    }
    // Start current level BGM
    await this.startLevelBGM();
    this.playSound(AssetPaths.SFX_START);
    this.sceneManager.renderer.domElement.requestPointerLock();
  }

  isTextureAppliedToModel(modelName) {
    const model = this.assetLoader.getModel(modelName);
    if (!model) return false;

    let textureApplied = false;
    model.traverse((child) => {
      if (child.isMesh && child.material && child.material.map) {
        textureApplied = true;
      }
    });
    return textureApplied;
  }

  togglePause() {
    if (this.gameState === GameState.PLAYING) {
      this.gameState = GameState.PAUSED;
      this.pauseBGM();
      document.exitPointerLock();
      this.playSound(AssetPaths.SFX_PAUSE);
    } else if (this.gameState === GameState.PAUSED) {
      this.gameState = GameState.PLAYING;
      this.resumeBGM();
      this.sceneManager.renderer.domElement.requestPointerLock();
      this.playSound(AssetPaths.SFX_UNPAUSE);
    }
  }

  setPauseMenuVisibility(visible) {
    this.pauseMenu.toggle(visible);
  }

  reloadGame() {
    location.reload();
  }

  // Level BGM lazy loading
  async loadLevelBGM(level, progress = null) {
    const bgmName = this.getLevelBGMName(level, progress);
    if (!bgmName) return null;

    if (this.bgmAudios[bgmName]) {
      return bgmName;
    }

    try {
      const buffer = await this.assetLoader.loadAudio(
        bgmName,
        `assets/audio/${bgmName}`
      );

      this.bgmAudios[bgmName] = new THREE.Audio(this.listener);
      this.bgmAudios[bgmName].setBuffer(buffer);
      this.bgmAudios[bgmName].setLoop(true);
      this.bgmAudios[bgmName].setVolume(0.4);

      return bgmName;
    } catch (error) {
      console.warn(`Failed to load level BGM: ${bgmName}`, error);
      return null;
    }
  }

  getLevelBGMName(level, progress = null) {
    const currentProgress = progress || this.currentLevelProgress;

    const progressString = currentProgress.toString().padStart(2, '0');
    const bgmKey = `BGM_LEVEL_${level.toString().padStart(2, '0')}_${progressString}`;

    return AssetPaths[bgmKey] || null;
  }

  // BGM management methods
  playBGM(bgmName) {
    if (this.currentBGM) {
      this.stopBGM();
    }

    if (this.bgmAudios[bgmName] && !this.bgmAudios[bgmName].isPlaying) {
      this.bgmAudios[bgmName].play();
      this.currentBGM = bgmName;
    }
  }

  stopBGM() {
    if (this.currentBGM && this.bgmAudios[this.currentBGM]) {
      this.bgmAudios[this.currentBGM].stop();
      this.currentBGM = null;
    }
  }

  pauseBGM() {
    if (this.currentBGM && this.bgmAudios[this.currentBGM]) {
      this.bgmAudios[this.currentBGM].pause();
    }
  }

  resumeBGM() {
    if (this.currentBGM && this.bgmAudios[this.currentBGM]) {
      const audio = this.bgmAudios[this.currentBGM];
      try {
        const ctx = this.listener?.context;
        if (
          ctx &&
          ctx.state === 'suspended' &&
          typeof ctx.resume === 'function'
        ) {
          ctx.resume();
        }
      } catch (e) {
        console.warn('AudioContext resume attempt failed', e);
      }
      if (!audio.isPlaying) {
        audio.play();
      }
    }
  }

  async startLevelBGM(level = null, progress = null) {
    const targetLevel = level || this.currentLevel;
    const bgmName = await this.loadLevelBGM(targetLevel, progress);
    if (bgmName) {
      this.playBGM(bgmName);
    }
  }

  // Method to change level progress and switch BGM accordingly
  async setLevelProgress(progress) {
    if (progress !== this.currentLevelProgress) {
      this.currentLevelProgress = progress;
      await this.startLevelBGM(this.currentLevel, progress);
    }
  }

  playSound(name) {
    const buffer = this.assetLoader.getAudio(name);
    if (buffer) {
      const sound = new THREE.Audio(this.listener);
      sound.setBuffer(buffer);
      sound.setVolume(1);
      sound.play();
    }
  }

  createAudio(name, options = {}) {
    const buffer = this.assetLoader.getAudio(name);
    if (buffer) {
      const sound = new THREE.Audio(this.listener);
      sound.setBuffer(buffer);
      sound.setVolume(options.volume || 1);
      if (options.loop) {
        sound.setLoop(true);
      }
      return sound;
    }
    return null;
  }

  onWindowResize() {
    this.sceneManager.onWindowResize();
  }

  start() {
    this.isManualUpdate = false;
    this.animate();
  }

  manualUpdate(deltaTime) {
    this.isManualUpdate = true;
    this._updateLoop(deltaTime);
  }

  _updateLoop(deltaTime) {
    if (
      this.gameState === GameState.OPENING ||
      this.gameState === GameState.ENDING
    ) {
      this.sequenceManager.update(deltaTime);
    } else if (this.gameState !== GameState.PAUSED) {
      this.player?.update(deltaTime);
      this.inputController?.update(deltaTime);

      if (this.gameState === GameState.PLAYING) {
        this.enemyHealthBar?.update();
        for (let i = this.enemies.length - 1; i >= 0; i--) {
          const enemy = this.enemies[i];
          enemy.update(deltaTime);

          if (enemy.readyForRemoval) {
            this.player?.addExperience(enemy.experience);
            this.sceneManager.remove(enemy.mesh);
            // If the removed enemy is the boss, trigger ending flow
            if (enemy === this.boss) {
              this.boss = null;
              this.endingTimer = 1;
              this.isEndingSequenceReady = false;
            }
            this.enemies.splice(i, 1);
          }
        }

        if (this.endingTimer > 0) {
          if (this.player?.statusPoints === 0) {
            this.endingTimer -= deltaTime;
          }
          if (this.endingTimer <= 0 && !this.isEndingSequenceReady) {
            this.playEndingSequence();
            this.isEndingSequenceReady = true;
          }
        }

        for (let i = this.items.length - 1; i >= 0; i--) {
          const item = this.items[i];
          const distance = this.player?.mesh.position.distanceTo(
            item.mesh.position
          );
          if (distance < ItemConstants.PICKUP_RANGE) {
            // Skip if player is already picking up an item
            if (this.player?.isPickingUp) {
              continue;
            }

            this.player?.inventory.push(item.id);
            this.player?.playPickUpAnimation();
            this.sceneManager.remove(item.mesh);
            this.items.splice(i, 1);
          }
        }

        for (let i = this.projectiles.length - 1; i >= 0; i--) {
          const projectile = this.projectiles[i];
          projectile.update(deltaTime);
          let shouldRemove = false;

          if (projectile.lifespan <= 0) {
            shouldRemove = true;
          }

          if (!shouldRemove) {
            const hitRange = this.data.skills[projectile.id]?.hitRange || 1.0;

            if (projectile.caster !== this.player) {
              // 敵の攻撃：プレイヤーとの衝突判定
              const playerHitPosition = this.player.mesh.position.clone();
              playerHitPosition.y += 1.0;
              if (
                projectile.mesh.position.distanceTo(playerHitPosition) <
                hitRange
              ) {
                this.player.takeDamage(projectile.damage);
                shouldRemove = true;
              }
            } else {
              // プレイヤーの攻撃：敵との衝突判定
              for (const enemy of this.enemies) {
                const enemyHitPosition = enemy.mesh.position.clone();
                enemyHitPosition.y += 0.5;
                if (
                  projectile.mesh.position.distanceTo(enemyHitPosition) <
                  hitRange
                ) {
                  enemy.takeDamage(projectile.damage);
                  shouldRemove = true;
                  break;
                }
              }
            }
          }

          if (shouldRemove) {
            this.sceneManager.remove(projectile.mesh);
            this.projectiles.splice(i, 1);
          }
        }

        for (let i = this.areaAttacks.length - 1; i >= 0; i--) {
          const areaAttack = this.areaAttacks[i];
          areaAttack.update(deltaTime);

          if (areaAttack.lifespan <= 0) {
            this.sceneManager.remove(areaAttack.mesh);
            this.areaAttacks.splice(i, 1);
          }
        }

        this.npcs.forEach((npc) => {
          npc.update(deltaTime);
        });
      }
    }

    if (this.gameState !== GameState.PAUSED) {
      this.hud?.update();
      this.lockOnUI?.update();

      // Check if locked target is dead and clear lock-on if so
      if (this.player?.lockedTarget?.isDead) {
        this.player.lockedTarget = null;
        this.lockOnUI?.hideLockOnTarget();
      }
    }

    this.sceneManager.render();
  }

  animate = () => {
    if (!this.isManualUpdate) {
      requestAnimationFrame(this.animate);
    }

    const deltaTime = this.clock.getDelta();
    this._updateLoop(deltaTime);
  };

  skipSplashScreenDelay() {
    this.splashSkipped = true;
    if (this.minDisplayTimeTimeoutId) {
      clearTimeout(this.minDisplayTimeTimeoutId);
      this.minDisplayTimeTimeoutId = null;
    }
  }

  playOpeningSequence() {
    this.gameState = GameState.OPENING;
    this.titleScreen.hideSplash();
    this.titleScreen.hideMenu();
    this.sequenceManager.startOpeningSequence(() => {
      setTimeout(() => {
        this.gameState = GameState.TITLE;
        this.sceneManager.hideCanvas();
        this.hud?.hide();
        this.titleScreen.showMenu();
        if (
          this.bgmAudios[AssetPaths.BGM_TITLE] &&
          !this.bgmAudios[AssetPaths.BGM_TITLE].isPlaying
        ) {
          this.bgmAudios[AssetPaths.BGM_TITLE].play();
        }
      }, 500);
    });
  }

  playEndingSequence() {
    this.gameState = GameState.ENDING;

    // Hide HUD immediately when ending starts
    this.hud?.hide();

    this.sceneManager.fadeOutCanvas(1000, () => {
      this.titleScreen.hideSplash();
      this.titleScreen.hideMenu();
      this.stopBGM();
      this.sequenceManager.startEndingSequence(() => {
        this.reloadGame();
      });
    });
  }

  updateUITexts() {
    // Update UI text after localization is loaded
    if (
      this.titleScreen &&
      typeof this.titleScreen.updateTexts === 'function'
    ) {
      this.titleScreen.updateTexts();
    }
    if (this.pauseMenu && typeof this.pauseMenu.updateTexts === 'function') {
      this.pauseMenu.updateTexts();
    }
    if (this.dialogBox && typeof this.dialogBox.updateTexts === 'function') {
      this.dialogBox.updateTexts();
    }
  }
}
