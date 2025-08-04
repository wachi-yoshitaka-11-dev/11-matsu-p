import * as THREE from 'three';
import { Stage } from '../world/stage.js';
import { StageIds } from '../utils/constants.js';
import { localization } from '../utils/localization.js';

export class StageManager {
  constructor(game) {
    this.game = game;
    this.currentStage = null;
    this.stages = new Map();
    this.stageOrder = [
      StageIds.TUTORIAL_PLAINS,
      StageIds.CURSED_FOREST,
      StageIds.ANCIENT_RUINS,
      StageIds.SNOWY_MOUNTAIN,
      StageIds.ABYSS_CAVE,
    ];
    this.currentStageIndex = 0;
    this.isTransitioning = false;
  }

  async initialize() {
    try {
      const stageData = await this.loadStageData();
      this.createStages(stageData);
      console.log('Stage manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize stage manager:', error);
      throw error;
    }
  }

  async loadStageData() {
    try {
      const response = await fetch('/data/stages.json');
      if (!response.ok) {
        throw new Error(`Failed to load stage data: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Stage data loading error:', error);
      throw new Error('Failed to load stage data and no fallback available');
    }
  }

  createStages(stageData) {
    stageData.stages.forEach((data) => {
      const stage = new Stage(this.game, data);
      this.stages.set(data.id, stage);
    });
  }

  async loadStage(stageId) {
    if (this.isTransitioning) {
      console.warn('Stage transition in progress. Please wait.');
      return false;
    }

    const stage = this.stages.get(stageId);
    if (!stage) {
      console.error(`Stage not found: ${stageId}`);
      return false;
    }

    this.isTransitioning = true;

    try {
      if (this.currentStage) {
        await this.unloadCurrentStage();
      }

      this.showLoadingScreen();
      await stage.load();
      this.currentStage = stage;
      this.currentStageIndex = this.stageOrder.indexOf(stageId);
      this.hideLoadingScreen();

      this.onStageLoaded(stage);
      console.log(`Stage "${stage.name}" loaded successfully`);
      return true;
    } catch (error) {
      console.error(`Failed to load stage "${stage.name}":`, error);
      this.hideLoadingScreen();
      return false;
    } finally {
      this.isTransitioning = false;
    }
  }

  async unloadCurrentStage() {
    if (!this.currentStage) return;

    try {
      this.currentStage.unload();
      console.log(`Stage "${this.currentStage.name}" unloaded successfully`);
    } catch (error) {
      console.error(`Failed to unload stage:`, error);
    }
  }

  showLoadingScreen() {
    let loadingElement = document.getElementById('stage-loading');
    if (!loadingElement) {
      loadingElement = document.createElement('div');
      loadingElement.id = 'stage-loading';
      loadingElement.textContent = localization.getText('stages.loading');
      document.body.appendChild(loadingElement);
    }
    loadingElement.style.display = 'flex';
  }

  hideLoadingScreen() {
    const loadingElement = document.getElementById('stage-loading');
    if (loadingElement) {
      loadingElement.style.display = 'none';
    }
  }

  onStageLoaded(stage) {
    if (this.game.player) {
      const spawnPoint = this.getPlayerSpawnPoint(stage);
      this.game.player.mesh.position.copy(spawnPoint);
    }

    this.game.onStageChanged?.(stage);
  }

  getPlayerSpawnPoint(stage) {
    const spawnPoints = stage.spawnPoints;
    if (spawnPoints && spawnPoints.length > 0) {
      const spawn = spawnPoints[0];
      return new THREE.Vector3(spawn.x, spawn.y, spawn.z);
    }
    return new THREE.Vector3(0, 5, 0);
  }

  async goToNextStage() {
    if (this.currentStageIndex >= this.getTotalStagesCount() - 1) {
      console.log('Already at final stage');
      return false;
    }

    const nextStageId = this.stageOrder[this.currentStageIndex + 1];
    return await this.loadStage(nextStageId);
  }

  async goToPreviousStage() {
    if (this.currentStageIndex <= 0) {
      console.log('Already at first stage');
      return false;
    }

    const prevStageId = this.stageOrder[this.currentStageIndex - 1];
    return await this.loadStage(prevStageId);
  }

  async goToStage(stageId) {
    return await this.loadStage(stageId);
  }

  getCurrentStage() {
    return this.currentStage;
  }

  getCurrentStageId() {
    return this.currentStage?.id || null;
  }

  getCurrentStageName() {
    if (!this.currentStage?.name) return '';

    const currentLanguage = this.game.currentLanguage || 'ja';
    if (typeof this.currentStage.name === 'object') {
      return (
        this.currentStage.name[currentLanguage] ||
        this.currentStage.name.ja ||
        ''
      );
    }
    return this.currentStage.name;
  }

  isStageCleared(stageId) {
    const stage = this.stages.get(stageId);
    return stage?.isCleared || false;
  }

  getClearedStagesCount() {
    return Array.from(this.stages.values()).filter((stage) => stage.isCleared)
      .length;
  }

  getTotalStagesCount() {
    return this.stages.size;
  }

  getProgress() {
    return {
      current: this.currentStageIndex + 1,
      total: this.getTotalStagesCount(),
      cleared: this.getClearedStagesCount(),
      percentage: Math.round(
        (this.getClearedStagesCount() / this.getTotalStagesCount()) * 100
      ),
    };
  }

  checkExitCollision(playerPosition) {
    if (!this.currentStage || this.isTransitioning) return null;

    for (const exitPoint of this.currentStage.exitPoints) {
      const distance = playerPosition.distanceTo(
        new THREE.Vector3(exitPoint.x, exitPoint.y, exitPoint.z)
      );

      if (distance < 5) {
        return exitPoint;
      }
    }

    return null;
  }

  async handleExitInteraction(exitPoint) {
    if (!exitPoint.targetStage) return false;

    if (this.currentStage?.isCleared) {
      return await this.loadStage(exitPoint.targetStage);
    } else {
      console.log('Please clear the stage before proceeding');
      return false;
    }
  }

  update(deltaTime) {
    if (this.currentStage && !this.isTransitioning) {
      this.currentStage.update(deltaTime);

      if (this.game.player) {
        const exitPoint = this.checkExitCollision(
          this.game.player.mesh.position
        );
        if (exitPoint) {
          this.showExitPrompt(exitPoint);
        } else {
          this.hideExitPrompt();
        }
      }
    }
  }

  showExitPrompt(exitPoint) {
    let promptElement = document.getElementById('exit-prompt');
    if (!promptElement) {
      promptElement = document.createElement('div');
      promptElement.id = 'exit-prompt';
      document.body.appendChild(promptElement);
    }

    const targetStageName =
      this.stages.get(exitPoint.targetStage)?.name || 'Next Stage';
    const enterToMoveText = localization
      .getText('stages.enterToMove')
      .replace('{0}', targetStageName);
    const statusText = this.currentStage?.isCleared
      ? localization.getText('stages.canProceed')
      : localization.getText('stages.needToClear');

    promptElement.innerHTML = `
      <div>${enterToMoveText}</div>
      <div style="font-size: 12px; margin-top: 10px;">
        ${statusText}
      </div>
    `;
    promptElement.style.display = 'block';
  }

  hideExitPrompt() {
    const promptElement = document.getElementById('exit-prompt');
    if (promptElement) {
      promptElement.style.display = 'none';
    }
  }

  async startFirstStage() {
    const firstStageId = this.stageOrder[0];
    return await this.loadStage(firstStageId);
  }

  reset() {
    this.stages.forEach((stage) => {
      stage.isCleared = false;
    });
    this.currentStageIndex = 0;
  }

  destroy() {
    if (this.currentStage) {
      this.currentStage.unload();
    }

    this.stages.clear();
    this.currentStage = null;
    this.hideLoadingScreen();
    this.hideExitPrompt();
  }
}
