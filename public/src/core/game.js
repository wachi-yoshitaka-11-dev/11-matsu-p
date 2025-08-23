// External libraries
import * as THREE from 'three';

// Utils
import {
  AssetPaths,
  AudioConstants,
  BGMConditionOperators,
  BGMConditionTypes,
  GameState,
  ItemConstants,
} from '../utils/constants.js';
import { localization } from '../utils/localization.js';

// Core
import { AssetLoader } from './asset-loader.js';
import { SceneManager } from './scene-manager.js';
import { SequenceManager } from './sequence-manager.js';
import { StageManager } from './stage-manager.js';

// Entities
import { Player } from '../entities/characters/player.js';

// Other
import { InputController } from '../controls/input-controller.js';
import { DialogBox } from '../ui/dialog-box.js';
import { EnemyHealthBar } from '../ui/enemy-health-bar.js';
import { Hud } from '../ui/hud.js';
import { LoadingScreen } from '../ui/loading-screen.js';
import { LockOnUI } from '../ui/lock-on-ui.js';
import { PauseMenu } from '../ui/pause-menu.js';
import { TitleScreen } from '../ui/title-screen.js';

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
        selfTargets: [],
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
    this.playingVoices = [];
    this.lastBGMCheck = 0;
  }

  setupBeforeUnloadHandler() {
    // Skip beforeunload handler in Electron environment to allow proper app exit
    if (
      typeof window.electronAPI !== 'undefined' ||
      typeof window.require !== 'undefined' ||
      navigator.userAgent.indexOf('Electron') !== -1
    ) {
      return;
    }

    window.addEventListener('beforeunload', (e) => {
      // Prevent only during actual gameplay
      if (
        this.player &&
        !this.player.isDead &&
        (this.gameState === GameState.LOADING ||
          this.gameState === GameState.PLAYING ||
          this.gameState === GameState.PAUSED)
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
      AssetPaths.SFX_STAGE_START,
      AssetPaths.SFX_STAGE_CLEAR,
      AssetPaths.SFX_SWITCH_ITEM,
      AssetPaths.SFX_SWITCH_SHIELD,
      AssetPaths.SFX_SWITCH_SKILL,
      AssetPaths.SFX_SWITCH_WEAPON,
      AssetPaths.SFX_TALK,
      AssetPaths.SFX_UNPAUSE,
      AssetPaths.SFX_USE_ITEM,
      AssetPaths.SFX_USE_SKILL_SELF_TARGET,
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
        this.bgmAudios[assetName].setVolume(AudioConstants.BGM_VOLUME);
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

    await this.assetLoader.loadModelsFromAssets(basicAssetsToLoad);
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
      // Create player and UI components first (needed only on initial start)
      this.player = new Player(this, 'player');
      this.sceneManager.add(this.player.mesh);

      this.hud = new Hud(this);
      this.enemyHealthBar = new EnemyHealthBar(this, this.sceneManager);
      this.lockOnUI = new LockOnUI(this.sceneManager, this.sceneManager.camera);

      this.inputController = new InputController(
        this.player,
        this.sceneManager.camera,
        this,
        this.sceneManager.renderer.domElement
      );

      // Use switchStage for consistent stage loading
      const success = await this.stageManager.switchStage(this.currentLevel);
      if (!success) {
        throw new Error('Failed to load initial stage');
      }

      // Hide loading and start gameplay
      this.loadingScreen.hide();
      this.sceneManager.showCanvas();
      this.gameState = GameState.PLAYING;

      // Stop any remaining sequence voices and BGM to prevent overlap with gameplay
      this.stopAllVoices();

      this.hud?.show();

      try {
        this.sceneManager.renderer.domElement.requestPointerLock();
      } catch (error) {
        console.warn('Failed to request pointer lock on game start:', error);
      }

      // Initialize stage (position, BGM, sound, message) via StageManager
      this.stageManager.initializeStage();
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
      document.exitPointerLock?.();
      this.playSFX(AssetPaths.SFX_PAUSE);
    } else if (this.gameState === GameState.PAUSED) {
      this.gameState = GameState.PLAYING;
      this.resumeBGM();
      try {
        this.sceneManager.renderer.domElement.requestPointerLock();
      } catch (error) {
        console.warn('Failed to request pointer lock on unpause:', error);
      }
      this.playSFX(AssetPaths.SFX_UNPAUSE);
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
    if (this.currentBGM === bgmName) {
      return; // Already playing the requested BGM
    }

    if (this.currentBGM) {
      this.stopBGM();
    }

    if (this.bgmAudios[bgmName] && !this.bgmAudios[bgmName].isPlaying) {
      this.bgmAudios[bgmName].play();
      this.currentBGM = bgmName;
    }
  }

  // Smooth BGM transition with fade effect
  async transitionBGM(newBGMName, fadeTime = 1000) {
    if (this.currentBGM === newBGMName) {
      return; // Already playing the requested BGM
    }

    const currentAudio = this.currentBGM
      ? this.bgmAudios[this.currentBGM]
      : null;
    const newAudio = this.bgmAudios[newBGMName];

    if (!newAudio) {
      console.warn(`BGM not found: ${newBGMName}`);
      return;
    }

    // If there's a current BGM, fade it out
    if (currentAudio && currentAudio.isPlaying) {
      await this.fadeOutBGM(currentAudio, fadeTime);
    }

    // Start new BGM at full volume immediately (no fade-in)
    this.currentBGM = newBGMName;
    if (!newAudio.isPlaying) {
      newAudio.setVolume(AudioConstants.BGM_VOLUME); // Full volume from start
      newAudio.play();
    }
  }

  // Fade out BGM audio
  fadeOutBGM(audio, fadeTime) {
    return new Promise((resolve) => {
      const startVolume = audio.getVolume();
      const startTime = Date.now();

      const fadeOut = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / fadeTime, 1);
        const volume = startVolume * (1 - progress);

        audio.setVolume(volume);

        if (progress >= 1) {
          audio.stop();
          resolve();
        } else {
          requestAnimationFrame(fadeOut);
        }
      };

      fadeOut();
    });
  }

  // Fade in BGM audio
  fadeInBGM(audio, fadeTime) {
    return new Promise((resolve) => {
      const targetVolume = AudioConstants.BGM_VOLUME;
      const startTime = Date.now();

      const fadeIn = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / fadeTime, 1);
        const volume = targetVolume * progress;

        audio.setVolume(volume);

        if (progress >= 1) {
          resolve();
        } else {
          requestAnimationFrame(fadeIn);
        }
      };

      fadeIn();
    });
  }

  // Dynamic BGM switching based on game state
  updateDynamicBGM() {
    if (this.gameState !== GameState.PLAYING) return;

    // Limit BGM condition checking to once per second to avoid excessive switching
    const now = Date.now();
    if (now - this.lastBGMCheck < 1000) return;
    this.lastBGMCheck = now;

    const targetBGM = this.getBGMForCurrentCondition();

    // Only proceed if target BGM exists and is different from current
    if (
      targetBGM &&
      this.currentBGM !== targetBGM &&
      this.bgmAudios[targetBGM]
    ) {
      // Use crossfade for more natural dynamic BGM changes
      this.crossfadeBGM(targetBGM, 1500); // 1.5 second crossfade
    }
  }

  // Crossfade BGM transition (overlap old and new)
  async crossfadeBGM(newBGMName, fadeTime = 1500) {
    if (this.currentBGM === newBGMName) {
      return; // Already playing the requested BGM
    }

    const currentAudio = this.currentBGM
      ? this.bgmAudios[this.currentBGM]
      : null;
    const newAudio = this.bgmAudios[newBGMName];

    if (!newAudio) {
      console.warn(`BGM not found: ${newBGMName}`);
      return;
    }

    // Start new BGM at full volume immediately
    this.currentBGM = newBGMName;
    if (!newAudio.isPlaying) {
      newAudio.setVolume(AudioConstants.BGM_VOLUME);
      newAudio.play();
    }

    // Fade out the old BGM while new one plays
    if (currentAudio && currentAudio.isPlaying) {
      this.fadeOutBGM(currentAudio, fadeTime);
    }
  }

  getBGMForCurrentCondition() {
    const stageData = this.stageManager.currentStageData;
    if (!stageData || !stageData.bgm) return null;

    // Check each BGM condition
    for (const bgmConfig of stageData.bgm) {
      if (bgmConfig.condition && this.checkBGMCondition(bgmConfig.condition)) {
        return bgmConfig.file;
      }
    }

    // Fallback to default BGM (no condition specified)
    const defaultBgm = stageData.bgm.find((bgm) => !bgm.condition);
    if (defaultBgm) {
      return defaultBgm.file;
    }

    return null;
  }

  checkBGMCondition(condition) {
    // Object-based conditions (clearConditions style)
    if (typeof condition === 'object' && condition.type) {
      if (condition.type === BGMConditionTypes.ENEMY_COUNT) {
        const enemies = this.entities.characters.enemies;
        const aliveEnemies = enemies.filter((enemy) => !enemy.isDead);

        // Filter by target types
        const targetEnemies = condition.targets
          ? aliveEnemies.filter((enemy) =>
              condition.targets.includes(enemy.data.type)
            )
          : aliveEnemies;

        // Apply operator
        switch (condition.operator) {
          case BGMConditionOperators.LESS_THAN:
            return targetEnemies.length < (condition.count || 0);
          case BGMConditionOperators.LESS_THAN_OR_EQUAL:
            return targetEnemies.length <= (condition.count || 0);
          case BGMConditionOperators.EQUAL:
            return targetEnemies.length === (condition.count || 0);
          case BGMConditionOperators.GREATER_THAN:
            return targetEnemies.length > (condition.count || 0);
          case BGMConditionOperators.GREATER_THAN_OR_EQUAL:
            return targetEnemies.length >= (condition.count || 0);
          case BGMConditionOperators.ONLY:
            // Only the specified enemy types remain
            return (
              aliveEnemies.length > 0 &&
              targetEnemies.length === aliveEnemies.length
            );
          default:
            return false;
        }
      }
      return false;
    }

    return false;
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

  // Play sound effects with fixed SFX_VOLUME
  playSFX(name) {
    const buffer = this.assetLoader.getAudio(name);
    if (buffer) {
      const sound = new THREE.Audio(this.listener);
      sound.setBuffer(buffer);
      sound.setVolume(AudioConstants.SFX_VOLUME);
      sound.play();
    }
  }

  // Create basic audio (volume set later with setVolume)
  createAudio(name, options = {}) {
    const buffer = this.assetLoader.getAudio(name);
    if (buffer) {
      const sound = new THREE.Audio(this.listener);
      sound.setBuffer(buffer);
      if (options.loop) {
        sound.setLoop(true);
      }
      return sound;
    }
    return null;
  }

  // Create footstep loop audio with calculated volume
  createFootstepAudio(name, volume) {
    const audio = this.createAudio(name, { loop: true });
    if (audio) {
      audio.setVolume(volume);
    }
    return audio;
  }

  // Create talk loop audio with fixed TALK_VOLUME
  createTalkAudio(name) {
    const audio = this.createAudio(name, { loop: true });
    if (audio) {
      audio.setVolume(AudioConstants.TALK_VOLUME);
    }
    return audio;
  }

  // Play voice audio with fixed VOICE_VOLUME
  async playVoice(audioPath) {
    try {
      const audioKey = `voice-${audioPath.replace(/[^a-zA-Z0-9]/g, '-')}`;
      const buffer = await this.assetLoader.loadAudio(
        audioKey,
        `assets/audio/${audioPath}`
      );

      const voiceAudio = new THREE.Audio(this.listener);
      voiceAudio.setBuffer(buffer);
      voiceAudio.setLoop(false);
      voiceAudio.setVolume(AudioConstants.VOICE_VOLUME);

      // Add to internal tracker
      this.playingVoices.push(voiceAudio);

      // Check if sequence is being skipped right before playing
      if (this.sequenceManager && this.sequenceManager.isSkipping) {
        // Remove from tracker if skipped
        const index = this.playingVoices.indexOf(voiceAudio);
        if (index > -1) this.playingVoices.splice(index, 1);
        return null;
      }

      voiceAudio.play();

      // Attach onended handler after play()
      if (voiceAudio.source) {
        voiceAudio.source.onended = () => {
          const index = this.playingVoices.indexOf(voiceAudio);
          if (index > -1) this.playingVoices.splice(index, 1);
        };
      }
      return voiceAudio;
    } catch (error) {
      console.warn(`Failed to load voice audio: ${audioPath}`, error);
      return null;
    }
  }

  // Stop all playing voices
  stopAllVoices() {
    this.playingVoices.forEach((voice) => {
      if (voice) {
        try {
          if (voice.isPlaying) {
            voice.stop();
          }
        } catch (error) {
          console.warn('Error stopping voice:', error);
        }
      }
    });
    this.playingVoices.length = 0;
  }

  // Load stage BGM audio objects
  async loadStageBGM(stageData) {
    if (!stageData.bgm || !Array.isArray(stageData.bgm)) return [];

    const loadedKeys = [];
    for (const bgmConfig of stageData.bgm) {
      if (!bgmConfig.file) continue;

      try {
        const buffer = await this.assetLoader.loadAudio(
          bgmConfig.file,
          `assets/audio/${bgmConfig.file}`
        );

        const bgmAudio = new THREE.Audio(this.listener);
        bgmAudio.setBuffer(buffer);
        bgmAudio.setLoop(bgmConfig.loop !== false);
        bgmAudio.setVolume(AudioConstants.BGM_VOLUME);

        this.bgmAudios[bgmConfig.file] = bgmAudio;
        loadedKeys.push(bgmConfig.file);
      } catch (error) {
        console.warn(`Failed to load stage BGM: ${bgmConfig.file}`, error);
      }
    }
    return loadedKeys;
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

        // Update dynamic BGM based on current conditions
        this.updateDynamicBGM();

        // Update stage progress (check for clear conditions)
        this.stageManager?.updateStageProgress();
        for (let i = this.entities.characters.enemies.length - 1; i >= 0; i--) {
          const enemy = this.entities.characters.enemies[i];
          enemy.update(deltaTime);

          if (enemy.readyForRemoval) {
            this.player?.addExperience(enemy.experience);
            this.sceneManager.remove(enemy.mesh);
            // Clear boss reference if this was the boss
            if (enemy === this.entities.characters.boss) {
              this.entities.characters.boss = null;
            }
            this.entities.characters.enemies.splice(i, 1);
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

        // Update projectiles (collision detection and cleanup handled in Projectile class)
        for (let i = this.entities.skills.projectiles.length - 1; i >= 0; i--) {
          const projectile = this.entities.skills.projectiles[i];
          projectile.update(deltaTime);

          // Remove projectile if lifespan expired
          if (projectile.lifespan <= 0) {
            this.sceneManager.remove(projectile.mesh);
            this.entities.skills.projectiles.splice(i, 1);
          }
        }

        for (let i = this.entities.skills.selfTargets.length - 1; i >= 0; i--) {
          const selfTarget = this.entities.skills.selfTargets[i];
          selfTarget.update(deltaTime);

          if (selfTarget.lifespan <= 0) {
            this.sceneManager.remove(selfTarget.mesh);
            this.entities.skills.selfTargets.splice(i, 1);
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
    document.exitPointerLock?.();

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
    document.exitPointerLock?.();

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
