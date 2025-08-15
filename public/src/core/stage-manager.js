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
        const terrain = new Terrain(this.game, terrainConfig.id, position);
        this.game.sceneManager.add(terrain.mesh);
        // Store reference for cleanup
        if (!this.game.terrains) this.game.terrains = [];
        this.game.terrains.push(terrain);
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
        const environment = new Environment(this.game, envConfig.id, position);
        this.game.sceneManager.add(environment.mesh);
        // Store reference for cleanup
        if (!this.game.environments) this.game.environments = [];
        this.game.environments.push(environment);
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
        let enemy;
        if (enemyData.type === 'boss') {
          enemy = new Boss(this.game, enemyConfig.id, position);
          this.game.boss = enemy;
        } else {
          enemy = new Enemy(this.game, enemyConfig.id, position);
        }

        this.game.enemies.push(enemy);
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
        this.game.npcs.push(npc);
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
        this.game.items.push(item);
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

    // Clean up stage lights
    if (this.game.stageLights) {
      this.game.stageLights.forEach((light) => {
        this.game.sceneManager.remove(light);
      });
      this.game.stageLights = [];
    }

    // Clean up terrains
    if (this.game.terrains) {
      this.game.terrains.forEach((terrain) => {
        this.game.sceneManager.remove(terrain.mesh);
      });
      this.game.terrains = [];
    }

    // Clean up environments
    if (this.game.environments) {
      this.game.environments.forEach((environment) => {
        this.game.sceneManager.remove(environment.mesh);
      });
      this.game.environments = [];
    }

    // Clean up stage-loaded enemies
    if (this.game.enemies) {
      this.game.enemies.forEach((enemy) => {
        this.game.sceneManager.remove(enemy.mesh);
      });
      this.game.enemies = [];
      this.game.boss = null;
    }

    // Clean up stage-loaded NPCs
    if (this.game.npcs) {
      this.game.npcs.forEach((npc) => {
        this.game.sceneManager.remove(npc.mesh);
      });
      this.game.npcs = [];
    }

    // Clean up stage-loaded items
    if (this.game.items) {
      this.game.items.forEach((item) => {
        this.game.sceneManager.remove(item.mesh);
      });
      this.game.items = [];
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
}
