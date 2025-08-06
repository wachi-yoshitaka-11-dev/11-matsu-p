import * as THREE from 'three';
import { SceneManager } from './scene-manager.js';
import { AssetLoader } from './asset-loader.js';
import { Field } from '../world/field.js';
import { Player } from '../entities/player.js';
import { Enemy } from '../entities/enemy.js';
import { Boss } from '../entities/boss.js';
import { Npc } from '../entities/npc.js';
import { Item } from '../world/item.js';
import { InputController } from '../controls/input-controller.js';
import { Hud } from '../ui/hud.js';
import { TitleScreen } from '../ui/title-screen.js';
import { PauseMenu } from '../ui/pause-menu.js';
import { DialogBox } from '../ui/dialog-box.js';
import { EnemyHealthBar } from '../ui/enemy-health-bar.js';
import { LockOnUI } from '../ui/lock-on-ui.js';
import { AssetNames, GameState, ItemTypes } from '../utils/constants.js';
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

    this.boss = null;
    this.npcs = [];
    this.data = {};

    this.minDisplayTimeTimeoutId = null;
    this.splashSkipped = false;

    this.initAudio();

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

  async init() {
    this.sceneManager.init();
    this.titleScreen.showSplash();

    const loadStartTime = Date.now();

    await this.loadGameData();
    await this.loadAudio();
    await this.loadModels();

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

    this.field = new Field(this);
    this.sceneManager.add(this.field.mesh);

    this.player = new Player(this, {
      modelName: AssetNames.PLAYER_MODEL,
      textureName: AssetNames.PLAYER_TEXTURE,
    });
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
      AssetNames.BGM_ENDING,
      AssetNames.BGM_OPENING,
      AssetNames.BGM_TITLE,
      AssetNames.SFX_ATTACK_STRONG,
      AssetNames.SFX_ATTACK_WEAK,
      AssetNames.SFX_BACK_STEP,
      AssetNames.SFX_CLICK,
      AssetNames.SFX_DAMAGE,
      AssetNames.SFX_DASH,
      AssetNames.SFX_DEATH,
      AssetNames.SFX_GUARD,
      AssetNames.SFX_JUMP,
      AssetNames.SFX_KILL,
      AssetNames.SFX_LEVEL_UP,
      AssetNames.SFX_LOCK_ON,
      AssetNames.SFX_PAUSE,
      AssetNames.SFX_PICKUP_ITEM,
      AssetNames.SFX_ROLLING,
      AssetNames.SFX_START,
      AssetNames.SFX_SWITCH_ITEM,
      AssetNames.SFX_SWITCH_SHIELD,
      AssetNames.SFX_SWITCH_SKILL,
      AssetNames.SFX_SWITCH_WEAPON,
      AssetNames.SFX_TALK,
      AssetNames.SFX_UNPAUSE,
      AssetNames.SFX_USE_ITEM,
      AssetNames.SFX_USE_SKILL_BUFF,
      AssetNames.SFX_USE_SKILL_PROJECTILE,
      AssetNames.SFX_WALK,
    ];

    for (const assetName of audioAssets) {
      const buffer = await this.assetLoader.loadAudio(
        assetName,
        `assets/audio/${assetName}.mp3`
      );
      this.audioBuffers[assetName] = buffer;

      if (
        assetName === AssetNames.BGM_TITLE ||
        assetName === AssetNames.BGM_OPENING ||
        assetName === AssetNames.BGM_ENDING
      ) {
        this.bgmAudios[assetName] = new THREE.Audio(this.listener);
        this.bgmAudios[assetName].setBuffer(buffer);
        this.bgmAudios[assetName].setLoop(true);
        this.bgmAudios[assetName].setVolume(0.4);
      }
    }
  }

  loadEntities() {
    const item = new Item(ItemTypes.POTION, new THREE.Vector3(0, 2, -5), this);
    this.items.push(item);
    this.sceneManager.add(item.mesh);

    const enemy = new Enemy(this, this.player, new THREE.Vector3(5, 0, 0), {
      modelName: AssetNames.ENEMY_MODEL,
      textureName: AssetNames.ENEMY_TEXTURE,
    });

    this.enemies.push(enemy);
    this.sceneManager.add(enemy.mesh);

    const boss = new Boss(this, this.player, {
      modelName: AssetNames.BOSS_MODEL,
      textureName: AssetNames.BOSS_TEXTURE,
    });
    this.boss = boss;
    this.enemies.push(boss);
    this.sceneManager.add(boss.mesh);

    const npc = new Npc(
      'guide', // NPCタイプ
      new THREE.Vector3(-5, 0.5, -5),
      this,
      { modelName: AssetNames.NPC_MODEL, textureName: AssetNames.NPC_TEXTURE }
    );
    this.npcs.push(npc);
    this.sceneManager.add(npc.mesh);
  }

  async loadModels() {
    const assetsToLoad = [
      { model: AssetNames.PLAYER_MODEL, texture: AssetNames.PLAYER_TEXTURE },
      { model: AssetNames.ENEMY_MODEL, texture: AssetNames.ENEMY_TEXTURE },
      { model: AssetNames.BOSS_MODEL, texture: AssetNames.BOSS_TEXTURE },
      { model: AssetNames.NPC_MODEL, texture: AssetNames.NPC_TEXTURE },
      { model: AssetNames.ITEM_MODEL, texture: AssetNames.ITEM_TEXTURE },
      { model: AssetNames.TREE_MODEL, texture: AssetNames.TREE_TEXTURE },
      { model: AssetNames.ROCK_MODEL, texture: AssetNames.ROCK_TEXTURE },
      { model: AssetNames.GRASS_MODEL, texture: AssetNames.GRASS_TEXTURE },
      { texture: AssetNames.CLOUD_TEXTURE },
      { texture: AssetNames.GROUND_TEXTURE },
    ];

    for (const asset of assetsToLoad) {
      try {
        if (asset.model) {
          await this.assetLoader.loadGLTF(
            asset.model,
            `assets/models/${asset.model}.glb`
          );
        }
        const texturePath = `assets/textures/${asset.model || asset.texture}.png`;
        try {
          await this.assetLoader.loadTexture(asset.texture, texturePath);
        } catch (error) {
          console.warn(
            `Texture for ${asset.model || asset.texture} not found at ${texturePath}. Using default material.`,
            error
          );
        }
      } catch (error) {
        console.error(
          `Could not load model ${asset.model}. A placeholder will be used.`,
          error
        );
      }
    }

    // Explicitly load ground texture
    try {
      await this.assetLoader.loadTexture(
        AssetNames.GROUND_TEXTURE,
        `assets/textures/${AssetNames.GROUND_TEXTURE}.png`
      );
    } catch (error) {
      console.warn('Error loading ground texture:', error);
    }
  }

  async startGame() {
    if (this.gameState !== GameState.TITLE) return;

    this.gameState = GameState.PLAYING;
    this.sceneManager.showCanvas();
    this.hud.show();

    if (this.titleScreen) {
      this.titleScreen.hideAll();
    }
    if (this.bgmAudios[AssetNames.BGM_TITLE]?.isPlaying) {
      this.bgmAudios[AssetNames.BGM_TITLE].stop();
    }
    // Start current level BGM
    await this.startLevelBGM();
    this.playSound(AssetNames.SFX_START);
    this.sceneManager.renderer.domElement.requestPointerLock();
  }

  isTextureAppliedToModel(modelName) {
    const model = this.assetLoader.getAsset(modelName);
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
      this.playSound(AssetNames.SFX_PAUSE);
    } else if (this.gameState === GameState.PAUSED) {
      this.gameState = GameState.PLAYING;
      this.resumeBGM();
      this.sceneManager.renderer.domElement.requestPointerLock();
      this.playSound(AssetNames.SFX_UNPAUSE);
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
        `assets/audio/${bgmName}.mp3`
      );
      this.audioBuffers[bgmName] = buffer;

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

    return AssetNames[bgmKey] || null;
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
      this.bgmAudios[this.currentBGM].play();
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
    if (this.audioBuffers[name]) {
      const sound = new THREE.Audio(this.listener);
      sound.setBuffer(this.audioBuffers[name]);
      sound.setVolume(1);
      sound.play();
    }
  }

  createAudio(name, options = {}) {
    if (this.audioBuffers[name]) {
      const sound = new THREE.Audio(this.listener);
      sound.setBuffer(this.audioBuffers[name]);
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
            this.enemies.splice(i, 1);
          }
        }

        if (this.boss && !this.boss.isDead) {
          this.boss.update(deltaTime);
        } else if (this.boss?.isDead) {
          this.player?.addExperience(this.boss.experience);
          this.sceneManager.remove(this.boss.mesh);
          this.boss = null;
          this.endingTimer = 1;
          this.isEndingSequenceReady = false;
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
          if (distance < (this.data.items?.generic?.pickupRange || 0.5)) {
            // Skip if player is already picking up an item
            if (this.player?.isPickingUp) {
              continue;
            }

            this.player?.inventory.push(item.type);
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
            for (const enemy of this.enemies) {
              const distance = projectile.mesh.position.distanceTo(
                enemy.mesh.position
              );
              const hitRange = this.data.skills?.projectile?.hitRange || 1.0;
              if (distance < hitRange) {
                enemy.takeDamage(projectile.damage);
                shouldRemove = true;
                break;
              }
            }
          }

          if (shouldRemove) {
            this.sceneManager.remove(projectile.mesh);
            this.projectiles.splice(i, 1);
          }
        }

        this.npcs.forEach((npc) => {
          npc.update(this.player?.mesh.position);
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
      this.playOpeningSequence();
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
        this.hud.hide();
        this.titleScreen.showMenu();
        if (
          this.bgmAudios[AssetNames.BGM_TITLE] &&
          !this.bgmAudios[AssetNames.BGM_TITLE].isPlaying
        ) {
          this.bgmAudios[AssetNames.BGM_TITLE].play();
        }
      }, 500);
    });
  }

  playEndingSequence() {
    this.gameState = GameState.ENDING;

    // Hide HUD immediately when ending starts
    this.hud.hide();

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
