import * as THREE from 'three';
import { StageBGMConditions } from '../utils/constants.js';

export class StageManager {
  constructor(game) {
    this.game = game;
    this.currentLevel = null;
    this.currentStageData = null;
    this.loadedStageAssets = new Set();
  }

  async loadStage(level) {
    // Get stage ID from level
    const stageId = this.getStageIdFromLevel(level);
    if (!stageId || !this.game.data.stages?.stages?.[stageId]) {
      throw new Error(`Stage not found: ${level}`);
    }

    const stageData = this.game.data.stages.stages[stageId];

    // Unload current stage if exists
    if (this.currentLevel) {
      await this.unloadCurrentStage();
    }

    // Load stage itself (base model + textures)
    await this.loadStageModelsAndAssets(stageData);

    // Set current level
    this.currentLevel = level;
    this.currentStageData = stageData;

    return stageData;
  }

  getStageIdFromLevel(level) {
    const stageOrder = this.game.data.stages?.stageOrder;
    if (!stageOrder || level < 1 || level > stageOrder.length) {
      return null;
    }
    return stageOrder[level - 1];
  }

  async loadStageModelsAndAssets(stageData) {
    // Load stage base model (土台glb)
    if (stageData.model) {
      try {
        const modelKey = stageData.model.replace('.glb', '');
        await this.game.assetLoader.loadGLTF(
          modelKey,
          `assets/models/${stageData.model}`
        );
        this.loadedStageAssets.add(modelKey);
      } catch (error) {
        console.warn(
          `Failed to load stage base model: ${stageData.model}`,
          error
        );
      }
    }

    // Load stage-specific textures
    if (stageData.texture) {
      try {
        const textureKey = stageData.texture.replace('.png', '');
        await this.game.assetLoader.loadTexture(
          textureKey,
          `assets/textures/${stageData.texture}`
        );
        this.loadedStageAssets.add(textureKey);
      } catch (error) {
        console.warn(
          `Failed to load stage texture: ${stageData.texture}`,
          error
        );
      }
    }
  }

  async loadStageBGM(stageData) {
    if (!stageData.bgm || !Array.isArray(stageData.bgm)) return;

    for (const bgmConfig of stageData.bgm) {
      if (!bgmConfig.file) continue;

      try {
        const bgmKey = bgmConfig.file.replace('.mp3', '');
        const buffer = await this.game.assetLoader.loadAudio(
          bgmKey,
          `assets/audio/${bgmConfig.file}`
        );

        // Create BGM audio object
        const bgmAudio = new THREE.Audio(this.game.listener);
        bgmAudio.setBuffer(buffer);
        bgmAudio.setLoop(bgmConfig.loop !== false);
        bgmAudio.setVolume(0.4);

        this.game.bgmAudios[bgmKey] = bgmAudio;
        this.loadedStageAssets.add(bgmKey);
      } catch (error) {
        console.warn(`Failed to load stage BGM: ${bgmConfig.file}`, error);
      }
    }
  }

  playDefaultBGM() {
    if (!this.currentStageData?.bgm) return;

    for (const bgmConfig of this.currentStageData.bgm) {
      if (
        bgmConfig.condition === StageBGMConditions.DEFAULT &&
        bgmConfig.file
      ) {
        const bgmKey = bgmConfig.file.replace('.mp3', '');
        this.game.playBGM(bgmKey);
        break;
      }
    }
  }

  async unloadCurrentStage() {
    if (!this.currentLevel) return;

    // Stop current BGM
    this.game.stopBGM();

    // Clear loaded stage assets
    this.loadedStageAssets.clear();

    // Reset stage data
    this.currentLevel = null;
    this.currentStageData = null;
  }

  getCurrentStageData() {
    return this.currentStageData;
  }

  getCurrentLevel() {
    return this.currentLevel;
  }

  getStageProgressNotification() {
    // For future progress notification implementation
    return {
      level: this.currentLevel,
      loaded: this.loadedStageAssets.size,
    };
  }
}
