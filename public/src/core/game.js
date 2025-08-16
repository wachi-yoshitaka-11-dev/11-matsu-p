import * as THREE from 'three';
import { SceneManager } from './scene-manager.js';
import { AssetLoader } from './asset-loader.js';
import { StageManager } from './stage-manager.js';
import { Player } from '../entities/characters/player.js';
import { InputController } from '../controls/input-controller.js';
import { Hud } from '../ui/hud.js';
import { TitleScreen } from '../ui/title-screen.js';
import { LoadingScreen } from '../ui/loading-screen.js';
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
    this.stageManager = new StageManager(this);
    this.clock = new THREE.Clock();

    this.player = null;
    this.inputController = null;
    this.hud = null;
    this.enemyHealthBar = null;

    this.entities = {
      characters: {
        enemies: [],
        npcs: [],
        boss: null,
      },
      items: [],
      skills: {
        projectiles: [],
        areaAttacks: [],
      },
      world: {
        terrains: [],
        environments: [],
      },
    };
    this.data = {};

    this.minDisplayTimeTimeoutId = null;
    this.splashSkipped = false;

    this.initAudio();
    this.setupBeforeUnloadHandler();

    this.gameState = GameState.SPLASH_SCREEN;
    this.titleScreen = new TitleScreen(
      () => this.startGame(),
      () => this.skipSplashScreenDelay()
    );
    this.loadingScreen = new LoadingScreen();

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
      // Prevent only during actual gameplay
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
    await this.loadBasicAudio();
    await this.loadBasicModels();

    // Update UI text after localization is loaded
    this.updateUITexts();

    const elapsedTime = Date.now() - loadStartTime;
    const minDisplayTime = 10000;
    const remainingTime = Math.max(0, minDisplayTime - elapsedTime);

    if (this.splashSkipped) {
      this.playOpeningSequence();
    } else {
      this.minDisplayTimeTimeoutId = setTimeout(() => {
        this.minDisplayTimeTimeoutId = null;

        if (!this.splashSkipped) {
          this.playOpeningSequence();
        }
      }, remainingTime);
    }
  }

  async loadGameData() {
    const dataFiles = [
      'localization',
      'player',
      'enemies',
      'npcs',
      'items',
      'weapons',
      'shields',
      'skills',
      'terrains',
      'environments',
      'stages',
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

  async loadBasicAudio() {
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
      AssetPaths.SFX_FP_INSUFFICIENT,
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

  async loadModelsFromAssets(assetsToLoad) {
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

  async loadBasicModels() {
    // Load only player assets during startup
    const basicAssetsToLoad = [];

    // Player assets
    basicAssetsToLoad.push({
      model: this.data.player.model,
      texture: this.data.player.texture,
    });

    await this.loadModelsFromAssets(basicAssetsToLoad);
  }

  async loadStageModels() {
    // Load only models that are actually used in the current stage
    const stageData = this.stageManager.getCurrentStageData();
    if (!stageData) return;

    const assetsToLoad = [];

    // Collect terrain models used in current stage
    if (stageData.world?.terrains) {
      for (const terrainConfig of stageData.world.terrains) {
        const terrainData = this.data.terrains?.[terrainConfig.id];
        if (terrainData && (terrainData.model || terrainData.texture)) {
          assetsToLoad.push({
            model: terrainData.model,
            texture: terrainData.texture,
          });
        }
      }
    }

    // Collect environment assets used in current stage
    if (stageData.world?.environments) {
      for (const envConfig of stageData.world.environments) {
        const envData = this.data.environments?.[envConfig.id];
        if (envData && envData.texture) {
          assetsToLoad.push({
            texture: envData.texture,
          });
        }
      }
    }

    // Collect entity models used in current stage
    if (stageData.entities) {
      // Enemies
      if (stageData.entities.enemies) {
        for (const enemyConfig of stageData.entities.enemies) {
          const enemyData = this.data.enemies?.[enemyConfig.id];
          if (enemyData && (enemyData.model || enemyData.texture)) {
            assetsToLoad.push({
              model: enemyData.model,
              texture: enemyData.texture,
            });
          }
        }
      }

      // NPCs
      if (stageData.entities.npcs) {
        for (const npcConfig of stageData.entities.npcs) {
          const npcData = this.data.npcs?.[npcConfig.id];
          if (npcData && (npcData.model || npcData.texture)) {
            assetsToLoad.push({
              model: npcData.model,
              texture: npcData.texture,
            });
          }
        }
      }

      // Items
      if (stageData.entities.items) {
        for (const itemConfig of stageData.entities.items) {
          const itemData = this.data.items?.[itemConfig.id];
          if (itemData && (itemData.model || itemData.texture)) {
            assetsToLoad.push({
              model: itemData.model,
              texture: itemData.texture,
            });
          }
        }
      }
    }

    await this.loadModelsFromAssets(assetsToLoad);
  }

  async startGame() {
    if (this.gameState !== GameState.TITLE) return;

    // Show loading state
    this.gameState = GameState.LOADING;

    if (this.titleScreen) {
      this.titleScreen.hideAll();
    }
    this.loadingScreen.show();
    if (this.bgmAudios[AssetPaths.BGM_TITLE]?.isPlaying) {
      this.bgmAudios[AssetPaths.BGM_TITLE].stop();
    }

    try {
      // Step 1: Load stage configuration (sets stageData)
      await this.stageManager.loadStage(this.currentLevel);

      // Step 2: Load stage-related assets
      await this.loadStageModels();

      // Step 3: Load stage world with assets available
      const stageData = this.stageManager.getCurrentStageData();
      if (stageData) {
        await this.stageManager.loadStageWorld(stageData);
        await this.stageManager.loadStageBGM(stageData);
      }

      // Field is now handled through environments system

      this.player = new Player(this, 'player');

      // Set player position from stage configuration
      const playerStartPos = stageData.player?.startPosition || [0, 1, 0];
      this.player.mesh.position.set(
        playerStartPos[0],
        playerStartPos[1],
        playerStartPos[2]
      );

      this.sceneManager.add(this.player.mesh);

      // Load stage entities after player is created
      if (stageData) {
        await this.stageManager.loadStageEntities(stageData);
      }

      this.hud = new Hud(this);
      this.enemyHealthBar = new EnemyHealthBar(this, this.sceneManager);
      this.lockOnUI = new LockOnUI(this.sceneManager, this.sceneManager.camera);

      this.inputController = new InputController(
        this.player,
        this.sceneManager.camera,
        this,
        this.sceneManager.renderer.domElement
      );

      // Hide loading and start gameplay
      this.loadingScreen.hide();
      this.sceneManager.showCanvas();
      this.gameState = GameState.PLAYING;
      this.hud?.show();

      this.sceneManager.renderer.domElement.requestPointerLock();

      this.playSound(AssetPaths.SFX_START);

      // Start stage BGM after everything is loaded
      this.stageManager.playDefaultBGM();
    } catch (error) {
      console.error('Failed to start game:', error);
      // Handle error - could show error message and return to title
      this.loadingScreen.hide();
      this.gameState = GameState.TITLE;
      this.titleScreen.showMenu();
    }
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
      this.gameState === GameState.SPLASH_SCREEN ||
      this.gameState === GameState.OPENING ||
      this.gameState === GameState.ENDING
    ) {
      this.sequenceManager.update(deltaTime);
    } else if (this.gameState === GameState.LOADING) {
      // During loading, stop ALL game updates - don't update any entities
      this.sceneManager.render();
      return;
    } else if (this.gameState !== GameState.PAUSED) {
      this.player?.update(deltaTime);
      this.inputController?.update(deltaTime);

      if (this.gameState === GameState.PLAYING) {
        this.enemyHealthBar?.update();
        for (let i = this.entities.characters.enemies.length - 1; i >= 0; i--) {
          const enemy = this.entities.characters.enemies[i];
          enemy.update(deltaTime);

          if (enemy.readyForRemoval) {
            this.player?.addExperience(enemy.experience);
            this.sceneManager.remove(enemy.mesh);
            // If the removed enemy is the boss, trigger ending flow
            if (enemy === this.entities.characters.boss) {
              this.entities.characters.boss = null;
              this.endingTimer = 1;
              this.isEndingSequenceReady = false;
            }
            this.entities.characters.enemies.splice(i, 1);
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

        for (let i = this.entities.items.length - 1; i >= 0; i--) {
          const item = this.entities.items[i];
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
            this.entities.items.splice(i, 1);
          }
        }

        for (let i = this.entities.skills.projectiles.length - 1; i >= 0; i--) {
          const projectile = this.entities.skills.projectiles[i];
          projectile.update(deltaTime);
          let shouldRemove = false;

          if (projectile.lifespan <= 0) {
            shouldRemove = true;
          }

          if (!shouldRemove) {
            const hitRange = this.data.skills[projectile.id]?.hitRange || 1.0;

            if (projectile.caster !== this.player) {
              // Enemy attack: collision detection with player
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
              // Player attack: collision detection with enemies
              for (const enemy of this.entities.characters.enemies) {
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
            this.entities.skills.projectiles.splice(i, 1);
          }
        }

        for (let i = this.entities.skills.areaAttacks.length - 1; i >= 0; i--) {
          const areaAttack = this.entities.skills.areaAttacks[i];
          areaAttack.update(deltaTime);

          if (areaAttack.lifespan <= 0) {
            this.sceneManager.remove(areaAttack.mesh);
            this.entities.skills.areaAttacks.splice(i, 1);
          }
        }

        this.entities.characters.npcs.forEach((npc) => {
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
    if (this.splashSkipped) return;
    this.splashSkipped = true;

    if (this.minDisplayTimeTimeoutId) {
      clearTimeout(this.minDisplayTimeTimeoutId);
      this.minDisplayTimeTimeoutId = null;

      this.playOpeningSequence();
    }
  }

  playOpeningSequence() {
    this.gameState = GameState.OPENING;
    document.exitPointerLock();

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
    document.exitPointerLock();

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
