import * as THREE from 'three';

import {
  AssetPaths,
  CollisionTypes,
  ConditionOperators,
  ConditionTypes,
  EnvironmentTypes,
  EnemyTypes,
  Fall,
  StageMessageTypes,
} from '../utils/constants.js';
import { localization } from '../utils/localization.js';
import { Boss } from '../entities/characters/boss.js';
import { Grunt } from '../entities/characters/grunt.js';
import { Npc } from '../entities/characters/npc.js';
import { Item } from '../entities/items/item.js';
import { Environment } from '../entities/world/environment.js';
import { Terrain } from '../entities/world/terrain.js';

export class StageManager {
  constructor(game) {
    this.game = game;
    this.currentLevel = null;
    this.currentStageData = null;
    this.loadedStageAssets = new Set();
    this.stageBaseModel = null;
    this.raycaster = new THREE.Raycaster();

    // Stage progress tracking
    this.isStageCleared = false;

    // Collision detection performance tracking
    this.collisionStats = {
      totalCalls: 0,
      totalObjects: 0,
      averageObjects: 0,
    };
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

    // Set current level and stage data first
    this.currentLevel = level;
    this.currentStageData = stageData;

    // Load stage base assets (model and textures)
    await this.loadStageBaseAssets(stageData);

    // Load entity assets (enemies, terrains, NPCs, etc.)
    await this.loadEntityAssets();

    // Note: Stage world and entities will be loaded separately by Game.js

    // Reset stage progress tracking
    this.resetStageProgress();

    return stageData;
  }

  getStageIdFromLevel(level) {
    const stageOrder = this.game.data.stages?.stageOrder;
    if (!stageOrder || level < 1 || level > stageOrder.length) {
      return null;
    }
    return stageOrder[level - 1];
  }

  async loadEntityAssets() {
    // Load only models that are actually used in the current stage
    const stageData = this.getCurrentStageData();
    if (!stageData) return;

    const assetsToLoad = [];

    // Collect terrain models used in current stage
    if (stageData.world?.terrains) {
      for (const terrainConfig of stageData.world.terrains) {
        const terrainData = this.game.data.terrains?.[terrainConfig.id];
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
        const envData = this.game.data.environments?.[envConfig.id];
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
          const enemyData = this.game.data.enemies?.[enemyConfig.id];
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
          const npcData = this.game.data.npcs?.[npcConfig.id];
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
          const itemData = this.game.data.items?.[itemConfig.id];
          if (itemData && (itemData.model || itemData.texture)) {
            assetsToLoad.push({
              model: itemData.model,
              texture: itemData.texture,
            });
          }
        }
      }
    }

    await this.game.assetLoader.loadModelsFromAssets(assetsToLoad);
  }

  async loadStageBaseAssets(stageData) {
    // Load stage base model
    if (stageData.model) {
      try {
        const modelKey = stageData.model.replace('.glb', '');
        await this.game.assetLoader.loadGLTF(
          modelKey,
          `assets/models/${stageData.model}`
        );
        this.loadedStageAssets.add(modelKey);

        // Add stage base model to scene
        const stageModel = this.game.assetLoader.getModel(modelKey);
        if (stageModel) {
          const stageModelClone = stageModel.clone();

          // Apply model settings from JSON configuration
          const modelSettings = stageData.modelSettings || {};

          // Set position from JSON or use default
          const position = modelSettings.position || [0, 0, 0];
          stageModelClone.position.set(position[0], position[1], position[2]);

          // Calculate bounding box for auto-scaling
          const boundingBox = new THREE.Box3().setFromObject(stageModelClone);
          const size = boundingBox.getSize(new THREE.Vector3());

          // Ensure stage model is visible and has proper scale
          stageModelClone.visible = true;

          // Apply scale from JSON configuration
          if (modelSettings.scale) {
            // Use explicit scale from JSON
            const scale = modelSettings.scale;
            stageModelClone.scale.set(scale[0], scale[1], scale[2]);
          } else if (
            modelSettings.autoScale &&
            modelSettings.autoScale.enabled
          ) {
            // Use auto-scaling based on JSON configuration
            const autoScale = modelSettings.autoScale;
            const targetSize = autoScale.targetSize || 20000;
            const basedOn = autoScale.basedOn || 'max';

            let referenceDimension;
            if (basedOn === 'max') {
              referenceDimension = Math.max(size.x, size.y, size.z);
            } else if (basedOn === 'xy') {
              referenceDimension = Math.max(size.x, size.y);
            } else if (basedOn === 'xz') {
              referenceDimension = Math.max(size.x, size.z);
            } else {
              referenceDimension = Math.max(size.x, size.z); // Default to XZ plane
            }

            const scaleMultiplier =
              referenceDimension > 0 ? targetSize / referenceDimension : 1;
            stageModelClone.scale.set(
              scaleMultiplier,
              scaleMultiplier,
              scaleMultiplier
            );
          }

          stageModelClone.traverse((child) => {
            if (child.isMesh) {
              child.visible = true;
              child.castShadow = true;
              child.receiveShadow = true;

              // Count vertices

              // Ensure material is visible and not transparent
              if (child.material) {
                // Force material to be fully opaque and visible
                if (child.material.transparent) {
                  child.material.opacity = 1.0;
                  child.material.transparent = false;
                }

                // Ensure material color is visible (not black or transparent)
                if (
                  child.material.color &&
                  child.material.color.r === 0 &&
                  child.material.color.g === 0 &&
                  child.material.color.b === 0
                ) {
                  child.material.color.setHex(0x888888); // Set to gray if black
                }

                // Force material update
                child.material.needsUpdate = true;
              }
            }
          });

          this.game.sceneManager.add(stageModelClone);

          // Store reference for cleanup
          this.stageBaseModel = stageModelClone;
        } else {
          console.error(
            'Failed to get stage model from asset loader:',
            modelKey
          );
        }
      } catch (error) {
        console.warn(
          `Failed to load stage base model: ${stageData.model}`,
          error
        );
      }
    }

    // Load stage-specific textures (check both texture and image properties)
    const textureFile = stageData.texture || stageData.image;
    if (textureFile) {
      try {
        const textureKey = textureFile.replace('.png', '');
        const texturePath = stageData.texture
          ? `assets/textures/${textureFile}`
          : `assets/images/${textureFile}`;
        await this.game.assetLoader.loadTexture(textureKey, texturePath);
        this.loadedStageAssets.add(textureKey);
      } catch (error) {
        console.warn(`Failed to load stage texture: ${textureFile}`, error);
      }
    }
  }

  async loadStageBGM(stageData) {
    const loadedKeys = await this.game.loadStageBGM(stageData);
    loadedKeys.forEach((key) => this.loadedStageAssets.add(key));
  }

  async loadStageWorld(stageData) {
    if (!stageData.world) return;

    // Set up sky first (background should be set before world objects to reduce flicker)
    this.setupSky(stageData.world.sky);

    // Load terrains
    if (stageData.world.terrains) {
      await this.loadTerrains(stageData.world.terrains, stageData.areas);
    }

    // Load environments
    if (stageData.world.environments) {
      await this.loadEnvironments(
        stageData.world.environments,
        stageData.areas
      );
    }

    // Set up lights
    this.setupLights(stageData.world.lights);
  }

  async loadTerrains(terrains, areas) {
    for (const terrainConfig of terrains) {
      const terrainData = this.game.data.terrains?.[terrainConfig.id];
      if (!terrainData) continue;

      const positions = this.generatePositionsFromConfig(terrainConfig, areas);

      for (const position of positions) {
        // Apply random scale from config if specified
        let scale = 1;
        if (terrainConfig.minScale && terrainConfig.maxScale) {
          scale =
            terrainConfig.minScale +
            Math.random() * (terrainConfig.maxScale - terrainConfig.minScale);
        } else if (terrainConfig.scale) {
          scale = terrainConfig.scale;
        }

        const terrain = new Terrain(this.game, terrainConfig.id, position, {
          scale,
        });
        this.game.sceneManager.add(terrain.mesh);
        // Store reference for cleanup
        this.game.entities.world.terrains.push(terrain);
      }
    }
  }

  async loadEnvironments(environments, areas) {
    for (const envConfig of environments) {
      const envData = this.game.data.environments?.[envConfig.id];
      if (!envData) continue;

      const positions = this.generatePositionsFromConfig(envConfig, areas);

      for (const position of positions) {
        // Special handling for different environment types
        let options = {};
        switch (envConfig.id) {
          case EnvironmentTypes.GROUND: {
            // Use placement-specific configuration for ground
            const placement = envConfig.placements?.[0];
            if (placement) {
              options = {
                circle: true,
                scale: placement.scale || 150,
                segments: placement.segments || 50,
              };
            }
            break;
          }

          case EnvironmentTypes.CLOUD: {
            // Cloud-specific options
            let scale = 10;
            if (envConfig.minScale && envConfig.maxScale) {
              scale =
                envConfig.minScale +
                Math.random() * (envConfig.maxScale - envConfig.minScale);
            }

            // Set height for cloud
            let height = 50;
            if (envConfig.height) {
              height =
                envConfig.height.min +
                Math.random() * (envConfig.height.max - envConfig.height.min);
            }

            options = {
              scale: { x: scale, y: scale * 0.5, z: 1 },
              opacity: envConfig.opacity || 0.4,
            };

            // Adjust position for height
            position.y = height;
            break;
          }

          default: {
            // No special options for other environment types
            break;
          }
        }

        const environment = new Environment(
          this.game,
          envConfig.id,
          position,
          options
        );
        this.game.sceneManager.add(environment.mesh);
        // Store reference for cleanup
        this.game.entities.world.environments.push(environment);
      }
    }
  }

  setupSky(skyConfig) {
    // Centralize sky application, including fallback and error guard
    if (!this.game.sceneManager) return;

    try {
      if (skyConfig) {
        this.game.sceneManager.setSkyFromConfig(skyConfig);
      } else {
        this.game.sceneManager.setDefaultSkyColor();
      }
    } catch (err) {
      console.warn(
        'Invalid sky configuration; falling back to default sky.',
        err
      );
      this.game.sceneManager.setDefaultSkyColor();
    }
  }

  setupLights(lights) {
    // Use the Light class for consistent lighting management
    if (!this.game.sceneManager?.light) return;

    try {
      if (lights && lights.length > 0) {
        this.game.sceneManager.light.setupLightsFromConfig(lights);
      } else {
        // Use default lights if no configuration
        this.game.sceneManager.light.setupDefaultLights();
      }
    } catch (err) {
      console.warn(
        'Invalid light configuration; falling back to default lights.',
        err
      );
      this.game.sceneManager.light.setupDefaultLights();
    }
  }

  generatePositionsFromConfig(config, areas) {
    const positions = [];

    if (config.placements) {
      // Handle entity-style placements
      for (const placement of config.placements) {
        if (placement.position) {
          // Specific position
          positions.push(new THREE.Vector3(...placement.position));
        } else if (placement.area && areas?.[placement.area]) {
          // Area-based placement
          const areaInfo = areas[placement.area];
          const count = placement.count || 1;

          for (let i = 0; i < count; i++) {
            const pos = this.generateRandomPositionInArea(areaInfo);
            positions.push(pos);
          }
        }
      }
    } else {
      // Handle terrain/environment style with areas array and count
      const count = config.count || 1;

      if (config.areas && areas && config.areas.length > 0) {
        for (let i = 0; i < count; i++) {
          // Cycle through areas to distribute objects
          const areaName = config.areas[i % config.areas.length];
          const areaInfo = areas[areaName];
          if (areaInfo) {
            const pos = this.generateRandomPositionInArea(areaInfo);
            positions.push(pos);
          }
        }
      }
    }

    return positions;
  }

  generateRandomPositionInArea(areaInfo) {
    const center = new THREE.Vector3(...areaInfo.center);
    const radius = areaInfo.radius;

    // Generate random position within circular area
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * radius;

    const x = center.x + Math.cos(angle) * distance;
    const z = center.z + Math.sin(angle) * distance;

    return new THREE.Vector3(x, center.y, z);
  }

  async loadStageEntities(stageData) {
    if (!stageData.entities) return;

    // Load enemies
    if (stageData.entities.enemies) {
      await this.loadEnemies(stageData.entities.enemies, stageData.areas);
    }

    // Load NPCs
    if (stageData.entities.npcs) {
      await this.loadNPCs(stageData.entities.npcs, stageData.areas);
    }

    // Load items
    if (stageData.entities.items) {
      await this.loadItems(stageData.entities.items, stageData.areas);
    }
  }

  async loadEnemies(enemies, areas) {
    for (const enemyConfig of enemies) {
      const enemyData = this.game.data.enemies?.[enemyConfig.id];
      if (!enemyData) continue;

      const positions = this.generatePositionsFromConfig(enemyConfig, areas);

      for (const position of positions) {
        // Skip height adjustment - use original position
        const adjustedPosition = position.clone();

        let enemy;
        if (enemyData.type === EnemyTypes.BOSS) {
          enemy = new Boss(this.game, enemyConfig.id, adjustedPosition);
          this.game.entities.characters.boss = enemy;
        } else {
          enemy = new Grunt(this.game, enemyConfig.id, adjustedPosition);
        }

        this.game.entities.characters.enemies.push(enemy);
        this.game.sceneManager.add(enemy.mesh);
      }
    }
  }

  async loadNPCs(npcs, areas) {
    for (const npcConfig of npcs) {
      const npcData = this.game.data.npcs?.[npcConfig.id];
      if (!npcData) continue;

      const positions = this.generatePositionsFromConfig(npcConfig, areas);

      for (const position of positions) {
        const npc = new Npc(this.game, npcConfig.id, position);
        this.game.entities.characters.npcs.push(npc);
        this.game.sceneManager.add(npc.mesh);
      }
    }
  }

  async loadItems(items, areas) {
    for (const itemConfig of items) {
      const itemData = this.game.data.items?.[itemConfig.id];
      if (!itemData) continue;

      const positions = this.generatePositionsFromConfig(itemConfig, areas);

      for (const position of positions) {
        const item = new Item(this.game, itemConfig.id, position);
        this.game.entities.items.push(item);
        this.game.sceneManager.add(item.mesh);
      }
    }
  }

  playDefaultBGM() {
    if (!this.currentStageData?.bgm) return;

    // Start with default BGM (no condition specified)
    const defaultBgm = this.currentStageData.bgm.find((bgm) => !bgm.condition);
    if (defaultBgm) {
      this.game.playBGM(defaultBgm.file);
    }
  }

  async unloadCurrentStage() {
    if (!this.currentLevel) return;

    // Stop current BGM
    this.game.stopBGM();

    // Force stop all character footsteps
    const allCharacters = [
      this.game.player,
      ...this.game.entities.characters.enemies,
      ...this.game.entities.characters.npcs,
    ].filter((char) => char); // Remove null/undefined

    allCharacters.forEach((character) => {
      if (character.stopFootsteps) {
        character.stopFootsteps();
      }
      // Force clear footstep audio
      if (character.footstepAudio) {
        character.footstepAudio.stop();
        character.footstepAudio = null;
      }
      character.isPlayingFootsteps = false;
    });

    // Clean up stage base model
    if (this.stageBaseModel) {
      this.game.sceneManager.remove(this.stageBaseModel);
      this.stageBaseModel = null;
    }

    // Clean up stage lights (lights are managed by SceneManager.light)
    // No specific cleanup needed as lights are reset when new stage loads

    // Reset sky to default
    if (this.game.sceneManager) {
      this.game.sceneManager.setDefaultSkyColor();
    }

    // Clean up terrains
    if (this.game.entities.world.terrains) {
      this.game.entities.world.terrains.forEach((terrain) => {
        this.game.sceneManager.remove(terrain.mesh);
      });
      this.game.entities.world.terrains.length = 0;
    }

    // Clean up environments
    if (this.game.entities.world.environments) {
      this.game.entities.world.environments.forEach((environment) => {
        this.game.sceneManager.remove(environment.mesh);
      });
      this.game.entities.world.environments.length = 0;
    }

    // Clean up stage-loaded enemies
    if (this.game.entities.characters.enemies) {
      this.game.entities.characters.enemies.forEach((enemy) => {
        this.game.sceneManager.remove(enemy.mesh);
      });
      this.game.entities.characters.enemies.length = 0;
      this.game.entities.characters.boss = null;
    }

    // Clear enemy health bars
    if (this.game.enemyHealthBar) {
      // Remove all health bar elements but keep the instance
      for (const [, element] of this.game.enemyHealthBar.healthBars) {
        element.remove();
      }
      this.game.enemyHealthBar.healthBars.clear();
    }

    // Clear player lock-on target
    if (this.game.player) {
      this.game.player.lockedTarget = null;
    }
    if (this.game.lockOnUI) {
      this.game.lockOnUI.hideLockOnTarget();
    }

    // Clean up stage-loaded NPCs
    if (this.game.entities.characters.npcs) {
      this.game.entities.characters.npcs.forEach((npc) => {
        this.game.sceneManager.remove(npc.mesh);
      });
      this.game.entities.characters.npcs.length = 0;
    }

    // Clean up stage-loaded items
    if (this.game.entities.items) {
      this.game.entities.items.forEach((item) => {
        this.game.sceneManager.remove(item.mesh);
      });
      this.game.entities.items.length = 0;
    }

    // Clean up skills
    if (this.game.entities.skills.selfTargets) {
      this.game.entities.skills.selfTargets.forEach((selfTarget) => {
        this.game.sceneManager.remove(selfTarget.mesh);
      });
      this.game.entities.skills.selfTargets.length = 0;
    }

    if (this.game.entities.skills.projectiles) {
      this.game.entities.skills.projectiles.forEach((projectile) => {
        this.game.sceneManager.remove(projectile.mesh);
      });
      this.game.entities.skills.projectiles.length = 0;
    }

    if (this.game.entities.skills.areaAttacks) {
      this.game.entities.skills.areaAttacks.forEach((areaAttack) => {
        this.game.sceneManager.remove(areaAttack.mesh);
      });
      this.game.entities.skills.areaAttacks.length = 0;
    }

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

  getCollisionStats() {
    return {
      ...this.collisionStats,
      optimization: 'Stage GLB excluded, terrain collision optimized',
    };
  }

  resetCollisionStats() {
    this.collisionStats = {
      totalCalls: 0,
      totalObjects: 0,
      averageObjects: 0,
    };
  }

  getHeightAt(x, z) {
    let highestY = Fall.MAX_FALL_DEPTH;
    const rayStartHeight = 100; // A safe height above everything
    this.raycaster.set(
      new THREE.Vector3(x, rayStartHeight, z),
      new THREE.Vector3(0, -1, 0)
    );

    const objectsToCheck = [];

    // 1. Ground environment (primary collision surface)
    const groundEnv = this.game.entities.world.environments.find(
      (env) => env.id === EnvironmentTypes.GROUND && env.mesh
    );
    if (groundEnv) {
      objectsToCheck.push(groundEnv.mesh);
    }

    // 2. Terrain objects only (trees, rocks - optimized collision, grass excluded)
    const collisionTerrains = this.game.entities.world.terrains
      .filter((terrain) => {
        if (!terrain.mesh) return false;

        // Check if collision is enabled and type is mesh for this terrain type
        const terrainData = this.game.data.terrains?.[terrain.id];
        return (
          terrainData?.collision?.enabled === true &&
          terrainData?.collision?.type === CollisionTypes.MESH
        );
      })
      .map((terrain) => terrain.mesh);
    objectsToCheck.push(...collisionTerrains);

    // Note: Stage base model (stageBaseModel) excluded for performance optimization
    // The ground environment provides the primary collision surface

    // Update collision statistics
    this.collisionStats.totalCalls++;
    this.collisionStats.totalObjects += objectsToCheck.length;
    this.collisionStats.averageObjects =
      this.collisionStats.totalObjects / this.collisionStats.totalCalls;

    if (objectsToCheck.length > 0) {
      const intersects = this.raycaster.intersectObjects(objectsToCheck, true);

      if (intersects.length > 0) {
        // Find the highest intersection point
        for (const intersect of intersects) {
          if (intersect.point.y > highestY) {
            highestY = intersect.point.y;
          }
        }
      }
    }

    // Return actual height or MAX_FALL_DEPTH if no ground found (allows proper falling)
    return highestY;
  }

  /**
   * Initialize stage (common logic for game start and stage transitions)
   */
  initializeStage() {
    // Set player position from stage configuration
    if (this.game.player && this.currentStageData.player?.startPosition) {
      const startPos = this.currentStageData.player.startPosition;
      this.game.player.mesh.position.set(startPos[0], startPos[1], startPos[2]);

      // Always adjust Y position to ground level for consistency
      const groundHeight = this.getHeightAt(startPos[0], startPos[2]);
      if (groundHeight > Fall.MAX_FALL_DEPTH) {
        this.game.player.mesh.position.y = groundHeight + 1;
      } else {
        // Fallback to spawn position Y if no ground found at spawn point
        this.game.player.mesh.position.y = startPos[1];
      }
    }

    // Start BGM
    this.playDefaultBGM();

    // Play stage start sound and show message
    this.game.playSFX(AssetPaths.SFX_STAGE_START);

    if (this.game.hud && this.currentStageData) {
      const stageName =
        this.currentStageData.name || `Level ${this.currentLevel}`;
      this.game.hud.showStageMessage(stageName, StageMessageTypes.START, 3000);
    }
  }

  /**
   * Switch to a different stage
   * @param {number} targetLevel - The target stage level to switch to
   * @returns {Promise<boolean>} - Returns true if switch was successful
   */
  async switchStage(targetLevel) {
    // Validate target level
    if (!this.isValidLevel(targetLevel)) {
      console.warn(`Invalid stage level: ${targetLevel}`);
      return false;
    }

    // Don't switch if already on target level
    if (this.currentLevel === targetLevel) {
      return true;
    }

    try {
      // Show loading screen during transition
      if (this.game.loadingScreen) {
        this.game.loadingScreen.show();
      }

      // Stop BGM for transition
      this.game.stopBGM();

      // Load the new stage
      await this.loadStage(targetLevel);

      // Stage models are now loaded within loadStage()

      // Load stage world and entities (same as in Game.js startGame)
      await this.loadStageWorld(this.currentStageData);
      await this.loadStageEntities(this.currentStageData);

      // Load stage BGM
      await this.loadStageBGM(this.currentStageData);

      // Update HUD stage display
      if (this.game.hud) {
        this.game.hud.updateStageDisplay();
      }

      // Hide loading screen
      if (this.game.loadingScreen) {
        this.game.loadingScreen.hide();
      }

      // Initialize stage (position, BGM, sound, message)
      this.initializeStage();

      return true;
    } catch (error) {
      console.error(`Failed to switch to stage level ${targetLevel}:`, error);

      // Hide loading screen on error
      if (this.game.loadingScreen) {
        this.game.loadingScreen.hide();
      }

      return false;
    }
  }

  /**
   * Check if a level is valid and available
   * @param {number} level - The level to validate
   * @returns {boolean} - True if level is valid
   */
  isValidLevel(level) {
    const stageOrder = this.game.data.stages?.stageOrder;
    return stageOrder && level >= 1 && level <= stageOrder.length;
  }

  /**
   * Get the maximum available level
   * @returns {number} - The maximum level available
   */
  getMaxLevel() {
    const stageOrder = this.game.data.stages?.stageOrder;
    return stageOrder ? stageOrder.length : 1;
  }

  /**
   * Check if there is a next stage available
   * @returns {boolean} - True if next stage exists
   */
  hasNextStage() {
    return this.currentLevel && this.currentLevel < this.getMaxLevel();
  }

  /**
   * Get the next stage level
   * @returns {number|null} - The next level, or null if no next stage
   */
  getNextLevel() {
    return this.hasNextStage() ? this.currentLevel + 1 : null;
  }

  /**
   * Check if current stage clear conditions are met
   * @returns {boolean} - True if stage is cleared
   */
  checkStageClearConditions() {
    if (!this.currentStageData?.clearConditions) {
      return false;
    }

    const conditions = this.currentStageData.clearConditions;

    return this.checkCondition(conditions);
  }

  /**
   * Check condition (unified condition checker)
   * @param {Object} condition - The condition to check
   * @returns {boolean} - True if condition is met
   */
  checkCondition(condition) {
    if (!condition || typeof condition !== 'object' || !condition.type) {
      return false;
    }

    switch (condition.type) {
      case ConditionTypes.ENEMY_COUNT:
        return this.checkEnemyCountCondition(condition);
      case ConditionTypes.COLLECT_ITEM:
        return this.checkCollectItemCondition(condition);
      case ConditionTypes.COMPOSITE:
        return this.checkCompositeCondition(condition);
      default:
        console.warn(`Unknown condition type: ${condition.type}`);
        return false;
    }
  }

  /**
   * Check enemy count condition
   * @param {Object} condition - The enemy count condition
   * @returns {boolean} - True if enemy count requirement is met
   */
  checkEnemyCountCondition(condition) {
    const enemies = this.game.entities.characters.enemies;
    const aliveEnemies = enemies.filter((enemy) => !enemy.isDead);

    // Filter by target types
    const targetEnemies = condition.targets
      ? aliveEnemies.filter((enemy) =>
          condition.targets.includes(enemy.data.type)
        )
      : aliveEnemies;

    // Apply operator
    switch (condition.operator) {
      case ConditionOperators.EQUAL:
        return targetEnemies.length === (condition.count || 0);
      case ConditionOperators.LESS_THAN:
        return targetEnemies.length < (condition.count || 0);
      case ConditionOperators.LESS_THAN_OR_EQUAL:
        return targetEnemies.length <= (condition.count || 0);
      case ConditionOperators.GREATER_THAN:
        return targetEnemies.length > (condition.count || 0);
      case ConditionOperators.GREATER_THAN_OR_EQUAL:
        return targetEnemies.length >= (condition.count || 0);
      case ConditionOperators.ONLY:
        // Only the specified enemy types remain
        return (
          aliveEnemies.length > 0 &&
          targetEnemies.length === aliveEnemies.length
        );
      default:
        return false;
    }
  }

  /**
   * Check collect item condition
   * @param {Object} conditions - The collect item conditions
   * @returns {boolean} - True if item collection requirement is met
   */
  checkCollectItemCondition(conditions) {
    if (!conditions.itemId) {
      console.warn('Collect item condition missing itemId');
      return false;
    }

    // Check if player has the required item in inventory
    const player = this.game.player;
    if (!player || !player.inventory) {
      return false;
    }

    const requiredCount = conditions.count || 1;
    const currentCount = player.getItemCount(conditions.itemId) || 0;

    return currentCount >= requiredCount;
  }

  /**
   * Check composite conditions (multiple conditions with AND/OR logic)
   * @param {Object} conditions - The composite clear conditions
   * @returns {boolean} - True if composite conditions are met
   */
  checkCompositeCondition(conditions) {
    if (!conditions.conditions || !Array.isArray(conditions.conditions)) {
      console.warn('Composite condition missing conditions array');
      return false;
    }

    const operator = conditions.operator || ConditionOperators.AND; // default to AND logic

    for (const condition of conditions.conditions) {
      let conditionMet = false;

      // Check individual condition
      conditionMet = this.checkCondition(condition);

      // Apply logic based on operator
      if (operator === ConditionOperators.AND) {
        // AND logic: all conditions must be true
        if (!conditionMet && condition.required !== false) {
          return false;
        }
      } else if (operator === ConditionOperators.OR) {
        // OR logic: at least one condition must be true
        if (conditionMet) {
          return true;
        }
      }
    }

    // For AND logic, if we reach here, all required conditions are met
    // For OR logic, if we reach here, no condition was met
    return operator === ConditionOperators.AND;
  }

  /**
   * Process stage clear (called when conditions are met)
   * @returns {boolean} - True if processing was successful
   */
  processStageClear() {
    if (!this.currentStageData?.clearConditions) {
      return false;
    }

    const conditions = this.currentStageData.clearConditions;
    const reward = conditions.reward || {};

    // Mark stage as cleared
    this.isStageCleared = true;

    // Play stage clear sound
    this.game.playSFX(AssetPaths.SFX_STAGE_CLEAR);

    // Show stage clear message
    if (this.game.hud) {
      this.game.hud.showStageMessage(
        localization.getText('ui.stageClear'),
        StageMessageTypes.CLEAR,
        3000
      );
    }

    // Give experience reward after a delay to avoid text overlap
    setTimeout(() => {
      if (reward.experience && this.game.player) {
        this.game.player.addExperience(reward.experience);
      }
    }, 3000);

    // Check if next stage should be unlocked
    if (reward.unlockNextStage && this.hasNextStage()) {
      // For now, just note unlock. In future, this could update save data
    }

    // Trigger stage clear UI or transition
    this.onStageClear();

    return true;
  }

  /**
   * Handle stage clear event
   */
  onStageClear() {
    // Show stage clear message
    if (this.game.hud) {
      // Could show a stage clear dialog here
    }

    // Auto-transition to next stage after delay, but wait for level up processing
    if (this.hasNextStage()) {
      this.startStageTransitionTimer();
    } else {
      // Start ending sequence after delay
      this.startEndingSequenceTimer();
    }
  }

  /**
   * Start the timer for stage transition, checking for level up completion
   */
  startStageTransitionTimer() {
    const checkTransition = async () => {
      // Wait for player to finish allocating status points
      if (this.game.player && this.game.player.statusPoints > 0) {
        // Still has status points to allocate, check again in 1 second
        setTimeout(checkTransition, 1000);
        return;
      }

      // No status points remaining, proceed with stage transition
      const nextLevel = this.getNextLevel();
      if (nextLevel) {
        const success = await this.switchStage(nextLevel);
        if (!success) {
          console.error('Failed to transition to next stage');
        }
      }
    };

    // Initial delay before checking
    setTimeout(checkTransition, 5000);
  }

  /**
   * Start the timer for ending sequence, checking for level up completion
   */
  startEndingSequenceTimer() {
    const checkEnding = () => {
      // Wait for player to finish allocating status points
      if (this.game.player && this.game.player.statusPoints > 0) {
        // Still has status points to allocate, check again in 1 second
        setTimeout(checkEnding, 1000);
        return;
      }

      // No status points remaining, proceed with ending sequence
      this.game.playEndingSequence();
    };

    // Initial delay before checking
    setTimeout(checkEnding, 3000);
  }

  /**
   * Update stage progress (should be called in game loop)
   */
  updateStageProgress() {
    if (!this.currentStageData || this.isStageCleared) {
      return;
    }

    // Check clear conditions
    if (this.checkStageClearConditions()) {
      this.processStageClear();
    }
  }

  /**
   * Reset stage progress tracking
   */
  resetStageProgress() {
    this.isStageCleared = false;
  }
}
