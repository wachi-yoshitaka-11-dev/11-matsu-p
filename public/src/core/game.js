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
import { AssetNames, GameState, ItemTypes } from '../utils/constants.js';
import { SequenceManager } from './sequence-manager.js';

export class Game {
  constructor() {
    this.sceneManager = new SceneManager();
    this.assetLoader = new AssetLoader();
    this.clock = new THREE.Clock();

    this.field = null;
    this.player = null;
    this.inputController = null;
    this.hud = null;

    this.enemies = [];
    this.items = [];
    this.projectiles = [];

    this.boss = null;
    this.npcs = [];
    this.data = {};

    this.initAudio();

    this.gameState = GameState.TITLE;
    this.titleScreen = new TitleScreen(() => this.startGame());
    this.pauseMenu = new PauseMenu(this);
    this.dialogBox = new DialogBox(this);
    this.sequenceManager = new SequenceManager(this);
  }

  initAudio() {
    this.listener = new THREE.AudioListener();
    this.sceneManager.camera.add(this.listener);
    this.audioBuffers = {};
    this.bgmAudios = {};
  }

  async init() {
    this.sceneManager.init();
    this.titleScreen.showSplash();

    const loadStartTime = Date.now();

    await this.loadGameData();
    await this.loadAudio();
    await this.loadModels();

    const elapsedTime = Date.now() - loadStartTime;
    const minDisplayTime = 2000;
    const remainingTime = Math.max(0, minDisplayTime - elapsedTime);

    setTimeout(() => {
      this.playOpeningSequence();
    }, remainingTime);

    this.field = new Field(this);
    this.sceneManager.add(this.field.mesh);

    this.player = new Player(this, {
      modelName: AssetNames.PLAYER_MODEL,
      textureName: AssetNames.PLAYER_TEXTURE,
    });
    this.sceneManager.add(this.player.mesh);

    this.hud = new Hud(this, this.player);

    this.inputController = new InputController(
      this.player,
      this.sceneManager.camera,
      this,
      this.sceneManager.renderer.domElement
    );

    // Load and place entities from data
    this.loadEntities();
  }

  async loadGameData() {
    const dataFiles = [
      'player',
      'weapons',
      'enemies',
      'npcs',
      'items',
      'skills',
    ];
    for (const fileName of dataFiles) {
      const data = await this.assetLoader.loadJSON(
        fileName,
        `data/${fileName}.json`
      );
      this.data[fileName] = data;
    }
  }

  async loadAudio() {
    const audioAssets = [
      AssetNames.BGM_PLAYING,
      AssetNames.BGM_TITLE,
      AssetNames.BGM_OPENING,
      AssetNames.BGM_ENDING,
      AssetNames.SFX_ATTACK_STRONG,
      AssetNames.SFX_ATTACK_WEAK,
      AssetNames.SFX_CLICK,
      AssetNames.SFX_DAMAGE,
      AssetNames.SFX_DEATH,
      AssetNames.SFX_GUARD,
      AssetNames.SFX_JUMP,
      AssetNames.SFX_KILL,
      AssetNames.SFX_LEVEL_UP,
      AssetNames.SFX_LOCK_ON,
      AssetNames.SFX_PAUSE,
      AssetNames.SFX_ROLLING,
      AssetNames.SFX_START,
      AssetNames.SFX_SWITCH_WEAPON,
      AssetNames.SFX_TALK,
      AssetNames.SFX_USE_ITEM,
      AssetNames.SFX_PICKUP_ITEM,
      AssetNames.SFX_USE_SKILL_BUFF,
      AssetNames.SFX_USE_SKILL_PROJECTILE,
    ];

    for (const assetName of audioAssets) {
      const buffer = await this.assetLoader.loadAudio(
        assetName,
        `assets/audio/${assetName}.mp3`
      );
      this.audioBuffers[assetName] = buffer;

      if (
        assetName === AssetNames.BGM_PLAYING ||
        assetName === AssetNames.BGM_TITLE ||
        assetName === AssetNames.BGM_OPENING ||
        assetName === AssetNames.BGM_ENDING
      ) {
        this.bgmAudios[assetName] = new THREE.Audio(this.listener);
        this.bgmAudios[assetName].setBuffer(buffer);
        this.bgmAudios[assetName].setLoop(true);
        this.bgmAudios[assetName].setVolume(0.2);
      }
    }
  }

  loadEntities() {
    // Example: Load enemies from data (assuming enemies.json has a structure for initial placement)
    // For simplicity, let's hardcode some initial entities based on data for now
    // In a real game, you'd have a level data file defining entity placements

    // Place a potion item
    const item = new Item(ItemTypes.POTION, new THREE.Vector3(0, 2, -5), this);
    this.items.push(item);
    this.sceneManager.add(item.mesh);

    // Place a grunt enemy
    const enemy = new Enemy(this, this.player, new THREE.Vector3(5, 0, 0), {
      modelName: AssetNames.ENEMY_MODEL,
      textureName: AssetNames.ENEMY_TEXTURE,
    });

    this.enemies.push(enemy);
    this.sceneManager.add(enemy.mesh);

    // Place the boss
    const boss = new Boss(this, this.player, {
      modelName: AssetNames.BOSS_MODEL,
      textureName: AssetNames.BOSS_TEXTURE,
    });
    this.boss = boss;
    this.enemies.push(boss);
    this.sceneManager.add(boss.mesh);

    // Place an NPC
    const npc = new Npc(
      'こんにちは、冒険者よ。この先には強力なボスが待ち構えているぞ。',
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
      { texture: AssetNames.CLOUD_TEXTURE }, // 雲のテクスチャを明示的に追加
      { texture: AssetNames.GROUND_TEXTURE }, // 地面テクスチャを明示的に追加
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
        } catch (textureError) {
          console.warn(
            `Texture for ${asset.model || asset.texture} not found at ${texturePath}. Using default material.`
          );
        }
      } catch (error) {
        console.error(
          `Could not load model ${asset.model}. A placeholder will be used.`
        );
      }
    }
  }

  startGame() {
    if (this.gameState !== GameState.TITLE) return;

    this.gameState = GameState.PLAYING;
    this.hud.container.style.display = 'block';
    if (this.titleScreen) {
      this.titleScreen.hideAll();
    }
    if (this.bgmAudios[AssetNames.BGM_TITLE]?.isPlaying) {
      this.bgmAudios[AssetNames.BGM_TITLE].stop();
    }
    if (
      this.bgmAudios[AssetNames.BGM_PLAYING] &&
      !this.bgmAudios[AssetNames.BGM_PLAYING].isPlaying
    ) {
      this.bgmAudios[AssetNames.BGM_PLAYING].play();
    }
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
      this.bgmAudios[AssetNames.BGM_PLAYING]?.pause();
      document.exitPointerLock();
    } else if (this.gameState === GameState.PAUSED) {
      this.gameState = GameState.PLAYING;
      this.bgmAudios[AssetNames.BGM_PLAYING]?.play();
      this.sceneManager.renderer.domElement.requestPointerLock();
    }
  }

  setPauseMenuVisibility(visible) {
    this.pauseMenu.toggle(visible);
  }

  reloadGame() {
    location.reload();
  }

  playSound(name) {
    if (this.audioBuffers[name]) {
      const sound = new THREE.Audio(this.listener);
      sound.setBuffer(this.audioBuffers[name]);
      sound.setVolume(1);
      sound.play();
    }
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
    if (this.gameState === GameState.SEQUENCE) {
      this.sequenceManager.update(deltaTime);
    } else if (this.gameState !== GameState.PAUSED) {
      this.player?.update(deltaTime);
      this.inputController?.update(deltaTime);

      if (this.gameState === GameState.PLAYING) {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
          const enemy = this.enemies[i];
          if (enemy.isDead) {
            this.player?.addExperience(enemy.experience);
            this.sceneManager.remove(enemy.mesh);
            this.enemies.splice(i, 1);
          } else {
            enemy.update(deltaTime);
          }
        }

        if (this.boss && !this.boss.isDead) {
          this.boss.update(deltaTime);
        } else if (this.boss?.isDead) {
          this.player?.addExperience(this.boss.experience);
          this.sceneManager.remove(this.boss.mesh);
          this.boss = null;
          this.endingTimer = 3; // 3秒のタイマー
          this.isEndingSequenceReady = false;
        }

        // エンディングタイマーの更新とレベルアップのチェック
        if (this.endingTimer > 0) {
          // レベルアップメニューが表示されていない場合のみタイマーを減らす
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
            this.player?.inventory.push(item.type);
            this.playSound(AssetNames.SFX_PICKUP_ITEM);
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

  // 追加
  playOpeningSequence() {
    this.gameState = GameState.SEQUENCE;
    this.titleScreen.hideSplash();
    this.titleScreen.hideMenu();
    this.sequenceManager.startOpeningSequence(() => {
      this.gameState = GameState.TITLE;
      this.titleScreen.showMenu();
      if (this.bgmAudios[AssetNames.BGM_TITLE] && !this.bgmAudios[AssetNames.BGM_TITLE].isPlaying) {
        this.bgmAudios[AssetNames.BGM_TITLE].play();
      }
    });
  }

  // 追加
  playEndingSequence() {
    this.gameState = GameState.SEQUENCE;
    this.hud.container.style.display = 'none';
    this.titleScreen.hideSplash();
    this.titleScreen.hideMenu();
    if (this.bgmAudios[AssetNames.BGM_PLAYING]?.isPlaying) {
      this.bgmAudios[AssetNames.BGM_PLAYING].stop();
    }
    this.sequenceManager.startEndingSequence(() => {
      this.gameState = GameState.TITLE;
      this.titleScreen.showMenu();
    });
  }
}
