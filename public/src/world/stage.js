import * as THREE from 'three';
import { Field } from './field.js';
import { Enemy } from '../entities/enemy.js';
import { Boss } from '../entities/boss.js';
import { Npc } from '../entities/npc.js';
import { Item } from './item.js';
import { TerrainObject } from './terrain-object.js';
import {
  StageIds,
  StageTypes,
  StageClearConditions,
  StageEnvironment,
  LevelBGM,
} from '../utils/constants.js';

export class Stage {
  constructor(game, stageData) {
    this.game = game;
    this.id = stageData.id;
    this.name = stageData.name;
    this.description = stageData.description;
    this.type = stageData.type;
    this.clearCondition = stageData.clearCondition;
    this.config = stageData.config;

    this.field = null;
    this.enemies = [];
    this.npcs = [];
    this.items = [];
    this.terrainObjects = [];
    this.spawnPoints = stageData.spawnPoints || [];
    this.exitPoints = stageData.exitPoints || [];

    this.isCleared = false;
    this.isLoaded = false;
    this.isFieldLoaded = false;
    this.entitiesSpawned = false;
    this.isNearClear = false;
    this.currentBgmState = 'normal';

    this.environment = {
      lighting:
        stageData.environment?.lighting || StageEnvironment.LIGHTING.BRIGHT,
      fog: stageData.environment?.fog || StageEnvironment.FOG.NONE,
      weather: stageData.environment?.weather || StageEnvironment.WEATHER.CLEAR,
      bgm: stageData.environment?.bgm || null,
    };
  }

  async load() {
    if (this.isLoaded) return;

    try {
      this.createField();
      this.setupEnvironment();
      this.spawnEnemies();
      this.spawnNpcs();
      this.spawnItems();
      this.spawnTerrainObjects();
      this.setupExitPoints();
      this.playBGM();

      this.isLoaded = true;
      console.log(`Stage "${this.name}" loaded successfully`);
    } catch (error) {
      console.error(`Failed to load stage "${this.name}":`, error);
      throw error;
    }
  }

  async loadField() {
    if (this.isFieldLoaded) return;

    try {
      this.createField();
      this.setupEnvironment();
      this.spawnTerrainObjects();
      this.setupExitPoints();
      this.playBGM();

      this.isFieldLoaded = true;
      console.log(`Stage field "${this.name}" loaded successfully`);
    } catch (error) {
      console.error(`Failed to load stage field "${this.name}":`, error);
      throw error;
    }
  }

  async spawnEntities() {
    if (this.entitiesSpawned) return;

    try {
      this.spawnEnemies();
      this.spawnNpcs();
      this.spawnItems();

      this.entitiesSpawned = true;
      this.isLoaded = true;
      console.log(`Stage entities "${this.name}" spawned successfully`);
    } catch (error) {
      console.error(`Failed to spawn stage entities "${this.name}":`, error);
      throw error;
    }
  }

  unload() {
    if (!this.isLoaded) return;

    this.cleanupEntities();
    this.cleanupField();
    this.stopBGM();

    this.isLoaded = false;
    console.log(`Stage "${this.name}" unloaded successfully`);
  }

  createField() {
    if (this.field) {
      this.cleanupField();
    }

    // Pass stage-specific field configuration from stages.json
    const fieldConfig = this.config.fieldConfig || null;
    this.field = new Field(this.game, fieldConfig);
    this.game.field = this.field; // Set reference in game object
    this.customizeField();
    this.game.sceneManager.add(this.field.mesh);
  }

  customizeField() {
    // Field customization is now handled by fieldConfig in stages.json
    // This method can be used for additional field effects if needed

    // Apply stage-specific effects that aren't in fieldConfig
    if (this.type === StageTypes.MOUNTAIN && this.field.mesh) {
      // Add snow effect or ice materials here if needed
    }
  }

  setupEnvironment() {
    this.setupLighting();
    this.setupFog();
    this.setupWeatherEffects();
  }

  setupLighting() {
    const lighting = this.environment.lighting;
    const ambientLight =
      this.game.sceneManager.scene.getObjectByName('ambientLight');

    if (ambientLight) {
      ambientLight.intensity = lighting.intensity;
      ambientLight.color.setHex(lighting.color);
    }
  }

  setupFog() {
    const fog = this.environment.fog;

    if (fog.density > 0) {
      this.game.sceneManager.scene.fog = new THREE.Fog(
        fog.color || 0xcccccc,
        1,
        100 / fog.density
      );
    } else {
      this.game.sceneManager.scene.fog = null;
    }
  }

  setupWeatherEffects() {
    switch (this.environment.weather) {
      case StageEnvironment.WEATHER.SNOWY:
        this.createSnowEffect();
        break;
      case StageEnvironment.WEATHER.FOGGY:
        this.setupFog();
        break;
    }
  }

  createSnowEffect() {
    const particleCount = 1000;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 200;
      positions[i + 1] = Math.random() * 100 + 10;
      positions[i + 2] = (Math.random() - 0.5) * 200;
    }

    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 2,
      transparent: true,
      opacity: 0.8,
    });

    this.snowSystem = new THREE.Points(particles, material);
    this.game.sceneManager.add(this.snowSystem);
  }

  spawnEnemies() {
    if (!this.config.enemies) return;

    this.config.enemies.forEach((enemyConfig) => {
      for (let i = 0; i < enemyConfig.count; i++) {
        const enemy = this.createEnemy(enemyConfig);
        if (enemy) {
          this.enemies.push(enemy);
          this.game.enemies.push(enemy);
        }
      }
    });
  }

  createEnemy(enemyConfig) {
    const position = this.getRandomSpawnPosition(enemyConfig.spawnArea);

    let enemy;
    if (enemyConfig.type === 'boss') {
      enemy = new Boss(this.game, this.game.player, enemyConfig.enemyType);
    } else {
      enemy = new Enemy(this.game, this.game.player, position, {
        enemyType: enemyConfig.enemyType,
      });
    }

    enemy.mesh.position.copy(position);
    this.game.sceneManager.add(enemy.mesh);

    return enemy;
  }

  spawnNpcs() {
    if (!this.config.npcs) return;

    this.config.npcs.forEach((npcConfig) => {
      const npc = this.createNpc(npcConfig);
      if (npc) {
        this.npcs.push(npc);
        this.game.npcs.push(npc);
      }
    });
  }

  createNpc(npcConfig) {
    const position = new THREE.Vector3(
      npcConfig.position.x,
      npcConfig.position.y,
      npcConfig.position.z
    );

    const npc = new Npc(npcConfig.type, position, this.game);
    npc.mesh.position.copy(position);
    this.game.sceneManager.add(npc.mesh);

    return npc;
  }

  spawnItems() {
    if (!this.config.items) return;

    this.config.items.forEach((itemConfig) => {
      for (let i = 0; i < itemConfig.count; i++) {
        const item = this.createItem(itemConfig);
        if (item) {
          this.items.push(item);
          this.game.items.push(item);
        }
      }
    });
  }

  createItem(itemConfig) {
    const position = this.getRandomSpawnPosition(itemConfig.spawnArea);
    const item = new Item(itemConfig.type, position, this.game);
    item.mesh.position.copy(position);
    this.game.sceneManager.add(item.mesh);

    return item;
  }

  spawnTerrainObjects() {
    if (!this.config.terrain) return;

    this.config.terrain.forEach((terrainConfig) => {
      for (let i = 0; i < terrainConfig.count; i++) {
        const terrainObject = this.createTerrainObject(terrainConfig);
        if (terrainObject) {
          this.terrainObjects.push(terrainObject);
        }
      }
    });
  }

  createTerrainObject(terrainConfig) {
    const position = this.getRandomSpawnPosition(terrainConfig.spawnArea);
    const terrainObject = new TerrainObject(
      this.game,
      terrainConfig.type,
      position
    );

    if (terrainObject.mesh) {
      this.game.sceneManager.add(terrainObject.mesh);
    }

    return terrainObject;
  }

  setupExitPoints() {
    this.exitPoints.forEach((exitPoint) => {
      const exitGeometry = new THREE.CylinderGeometry(5, 5, 0.5, 16);
      const exitMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        transparent: true,
        opacity: 0.3,
      });

      const exitMesh = new THREE.Mesh(exitGeometry, exitMaterial);
      exitMesh.position.set(exitPoint.x, exitPoint.y, exitPoint.z);
      exitMesh.userData = { type: 'exit', targetStage: exitPoint.targetStage };

      this.game.sceneManager.add(exitMesh);
    });
  }

  getRandomSpawnPosition(spawnArea) {
    const x = spawnArea.center.x + (Math.random() - 0.5) * spawnArea.size.x;
    const z = spawnArea.center.z + (Math.random() - 0.5) * spawnArea.size.z;
    const y = this.field.getHeightAt(x, z) + (spawnArea.center.y || 1);

    return new THREE.Vector3(x, y, z);
  }

  playBGM() {
    if (this.environment.bgm && this.game.audioManager) {
      const bgmToPlay =
        typeof this.environment.bgm === 'string'
          ? this.environment.bgm
          : this.environment.bgm[this.currentBgmState];

      this.game.audioManager.playBGM(bgmToPlay);
    }
  }

  switchBgmToNearClear() {
    if (
      this.environment.bgm &&
      typeof this.environment.bgm === 'object' &&
      !this.isNearClear
    ) {
      this.isNearClear = true;
      this.currentBgmState = 'nearClear';

      if (this.game.audioManager) {
        this.game.audioManager.playBGM(this.environment.bgm.nearClear);
        console.log('BGM switched to near-clear state');
      }
    }
  }

  stopBGM() {
    if (this.game.audioManager) {
      this.game.audioManager.stopBGM();
    }
  }

  checkClearCondition() {
    if (this.isCleared) return true;

    let progress = 0;
    let isNearClear = false;

    switch (this.clearCondition.type) {
      case StageClearConditions.KILL_ALL_ENEMIES:
        const totalEnemies = this.enemies.length;
        const deadEnemies = this.enemies.filter((enemy) => enemy.isDead).length;
        progress = totalEnemies > 0 ? deadEnemies / totalEnemies : 1;
        this.isCleared = progress === 1;
        isNearClear = progress >= 0.5;
        break;
      case StageClearConditions.DEFEAT_BOSS:
        const boss = this.enemies.find((enemy) => enemy instanceof Boss);
        if (boss) {
          this.isCleared = boss.isDead;

          // Check if player is near boss (within 15 units)
          if (this.game.player && boss.mesh) {
            const distanceToBoss = this.game.player.mesh.position.distanceTo(
              boss.mesh.position
            );
            isNearClear = distanceToBoss <= 15;
          }
        }
        break;
      case StageClearConditions.COLLECT_ITEM:
        // TODO: Implement item collection check
        break;
      case StageClearConditions.REACH_EXIT:
        // TODO: Implement exit reaching check
        break;
    }

    // Switch BGM when near clear
    if (isNearClear && !this.isNearClear) {
      this.switchBgmToNearClear();
    }

    if (this.isCleared) {
      this.onStageCleared();
    }

    return this.isCleared;
  }

  onStageCleared() {
    console.log(`Stage "${this.name}" cleared!`);
    this.showExitPoints();
  }

  showExitPoints() {
    this.exitPoints.forEach((exitPoint) => {
      const exitIndicator = this.game.sceneManager.scene.children.find(
        (child) => child.userData?.type === 'exit'
      );
      if (exitIndicator) {
        exitIndicator.material.opacity = 0.8;
        exitIndicator.material.color.setHex(0x00ff00);
      }
    });
  }

  cleanupEntities() {
    [...this.enemies, ...this.npcs, ...this.items].forEach((entity) => {
      if (entity.mesh) {
        this.game.sceneManager.remove(entity.mesh);
      }
    });

    this.terrainObjects.forEach((terrainObject) => {
      if (terrainObject.mesh) {
        this.game.sceneManager.remove(terrainObject.mesh);
      }
      terrainObject.dispose();
    });

    this.enemies = [];
    this.npcs = [];
    this.items = [];
    this.terrainObjects = [];

    this.game.enemies = this.game.enemies.filter(
      (enemy) => !this.enemies.includes(enemy)
    );
    this.game.npcs = this.game.npcs.filter((npc) => !this.npcs.includes(npc));
    this.game.items = this.game.items.filter(
      (item) => !this.items.includes(item)
    );
  }

  cleanupField() {
    if (this.field?.mesh) {
      this.game.sceneManager.remove(this.field.mesh);
      this.field = null;
    }

    if (this.snowSystem) {
      this.game.sceneManager.remove(this.snowSystem);
      this.snowSystem = null;
    }
  }

  update(deltaTime) {
    if (!this.isLoaded) return;

    if (this.snowSystem) {
      const positions = this.snowSystem.geometry.attributes.position.array;
      for (let i = 1; i < positions.length; i += 3) {
        positions[i] -= deltaTime * 10;
        if (positions[i] < 0) {
          positions[i] = 100;
        }
      }
      this.snowSystem.geometry.attributes.position.needsUpdate = true;
    }

    // Update terrain objects
    this.terrainObjects.forEach((terrainObject) => {
      terrainObject.update(deltaTime);
    });

    this.checkClearCondition();
  }
}
