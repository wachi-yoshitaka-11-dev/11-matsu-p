import * as THREE from 'three';
import {
  StageBGMConditions,
  Fall,
  EnvironmentTypes,
} from '../utils/constants.js';

export class StageManager {
  constructor(game) {
    this.game = game;
    this.currentLevel = null;
    this.currentStageData = null;
    this.loadedStageAssets = new Set();
    this.stageBaseModel = null;
    this.raycaster = new THREE.Raycaster();
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

    // Note: Stage world and entities will be loaded separately by Game.js

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

  async loadStageWorld(stageData) {
    if (!stageData.world) return;

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
    if (stageData.world.lights) {
      this.setupLights(stageData.world.lights);
    }
  }

  async loadTerrains(terrains, areas) {
    const { Terrain } = await import('../entities/world/terrain.js');

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
    const { Environment } = await import('../entities/world/environment.js');

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

  setupLights(lights) {
    // Use the Light class for consistent lighting management
    if (this.game.sceneManager.light) {
      this.game.sceneManager.light.setupLightsFromConfig(lights);
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

      if (config.areas && areas) {
        for (const areaName of config.areas) {
          const areaInfo = areas[areaName];
          if (!areaInfo) continue;

          const areaCount = Math.floor(count / config.areas.length);
          for (let i = 0; i < areaCount; i++) {
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
    const { Enemy } = await import('../entities/characters/enemy.js');
    const { Boss } = await import('../entities/characters/boss.js');

    for (const enemyConfig of enemies) {
      const enemyData = this.game.data.enemies?.[enemyConfig.id];
      if (!enemyData) continue;

      const positions = this.generatePositionsFromConfig(enemyConfig, areas);

      for (const position of positions) {
        // Skip height adjustment - use original position
        const adjustedPosition = position.clone();

        let enemy;
        if (enemyData.type === 'boss') {
          enemy = new Boss(this.game, enemyConfig.id, adjustedPosition);
          this.game.entities.characters.boss = enemy;
        } else {
          enemy = new Enemy(this.game, enemyConfig.id, adjustedPosition);
        }

        this.game.entities.characters.enemies.push(enemy);
        this.game.sceneManager.add(enemy.mesh);
      }
    }
  }

  async loadNPCs(npcs, areas) {
    const { Npc } = await import('../entities/characters/npc.js');

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
    const { Item } = await import('../entities/items/item.js');

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

    // Clean up stage base model
    if (this.stageBaseModel) {
      this.game.sceneManager.remove(this.stageBaseModel);
      this.stageBaseModel = null;
    }

    // Clean up stage lights
    if (this.game.stageLights) {
      this.game.stageLights.forEach((light) => {
        this.game.sceneManager.remove(light);
      });
      this.game.stageLights = [];
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

  getHeightAt(x, z) {
    let highestY = Fall.MAX_FALL_DEPTH;
    const rayStartHeight = 100; // A safe height above everything
    this.raycaster.set(
      new THREE.Vector3(x, rayStartHeight, z),
      new THREE.Vector3(0, -1, 0)
    );

    const objectsToCheck = [];

    // 1. Stage base model
    if (this.stageBaseModel) {
      objectsToCheck.push(this.stageBaseModel);
    }

    // 2. Ground environment
    const groundEnv = this.game.entities.world.environments.find(
      (env) => env.id === EnvironmentTypes.GROUND && env.mesh
    );
    if (groundEnv) {
      objectsToCheck.push(groundEnv.mesh);
    }

    // 3. All terrain objects (trees, rocks, etc.)
    const terrainMeshes = this.game.entities.world.terrains.map((t) => t.mesh);
    objectsToCheck.push(...terrainMeshes);

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

    return highestY;
  }
}
