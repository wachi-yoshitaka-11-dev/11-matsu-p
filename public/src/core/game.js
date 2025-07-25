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
import { AssetNames } from '../utils/constants.js';

const GameState = {
    TITLE: 'title',
    PLAYING: 'playing',
    PAUSED: 'paused'
};

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

        this.listener = new THREE.AudioListener();
        this.sceneManager.camera.add(this.listener);
        this.gameBGM = new THREE.Audio(this.listener);
        this.audioBuffers = {};

        this.gameState = GameState.TITLE;
        this.titleScreen = new TitleScreen(() => this.startGame());
        this.pauseMenu = new PauseMenu(this);
        this.dialogBox = new DialogBox(this);
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
            this.titleScreen.showMenu();
            this.titleBGM = new THREE.Audio(this.listener);
            this.titleBGM.setBuffer(this.audioBuffers[AssetNames.BGM_TITLE]);
            this.titleBGM.setLoop(true);
            this.titleBGM.setVolume(0.5);
            this.titleBGM.play();
        }, remainingTime);

        this.field = new Field(this);
        this.sceneManager.add(this.field.mesh);

        this.player = new Player(this, { modelName: AssetNames.PLAYER_MODEL, textureName: AssetNames.PLAYER_TEXTURE });
        this.sceneManager.add(this.player.mesh);

        this.hud = new Hud(this, this.player);

        this.inputController = new InputController(this.player, this.sceneManager.camera, this, this.sceneManager.renderer.domElement);

        const enemyX = 5;
        const enemyZ = 0;
        const enemy = new Enemy(this, this.player, new THREE.Vector3(enemyX, 0, enemyZ), { modelName: AssetNames.ENEMY_MODEL, textureName: AssetNames.ENEMY_TEXTURE });
        this.enemies.push(enemy);
        this.sceneManager.add(enemy.mesh);

        const item = new Item('potion', new THREE.Vector3(3, 0.2, 3), this);
        this.items.push(item);
        this.sceneManager.add(item.mesh);

        const boss = new Boss(this, this.player, { modelName: AssetNames.BOSS_MODEL, textureName: AssetNames.BOSS_TEXTURE });
        this.boss = boss;
        this.sceneManager.add(boss.mesh);

        const npc = new Npc('こんにちは、冒険者よ。この先には強力なボスが待ち構えているぞ。', new THREE.Vector3(-5, 0.5, -5), this, { modelName: AssetNames.NPC_MODEL, textureName: AssetNames.NPC_TEXTURE });
        this.npcs.push(npc);
        this.sceneManager.add(npc.mesh);
    }

    async loadGameData() {
        const dataFiles = ['player', 'weapons', 'enemies', 'items', 'skills'];
        for (const fileName of dataFiles) {
            const data = await this.assetLoader.loadJSON(fileName, `data/${fileName}.json`);
            this.data[fileName] = data;
        }
    }

    async loadAudio() {
        const gameBGMBuffer = await this.assetLoader.loadAudio(AssetNames.BGM_GAME, `assets/audio/${AssetNames.BGM_GAME}.mp3`);
        this.gameBGM.setBuffer(gameBGMBuffer);
        this.gameBGM.setLoop(true);
        this.gameBGM.setVolume(0.2);

        this.audioBuffers[AssetNames.BGM_TITLE] = await this.assetLoader.loadAudio(AssetNames.BGM_TITLE, `assets/audio/${AssetNames.BGM_TITLE}.mp3`);
        this.audioBuffers[AssetNames.SFX_DAMAGE] = await this.assetLoader.loadAudio(AssetNames.SFX_DAMAGE, `assets/audio/${AssetNames.SFX_DAMAGE}.mp3`);
        this.audioBuffers[AssetNames.SFX_DEATH] = await this.assetLoader.loadAudio(AssetNames.SFX_DEATH, `assets/audio/${AssetNames.SFX_DEATH}.mp3`);
        this.audioBuffers[AssetNames.SFX_GUARD] = await this.assetLoader.loadAudio(AssetNames.SFX_GUARD, `assets/audio/${AssetNames.SFX_GUARD}.mp3`);
        this.audioBuffers[AssetNames.SFX_JUMP] = await this.assetLoader.loadAudio(AssetNames.SFX_JUMP, `assets/audio/${AssetNames.SFX_JUMP}.mp3`);
        this.audioBuffers[AssetNames.SFX_LOCK_ON] = await this.assetLoader.loadAudio(AssetNames.SFX_LOCK_ON, `assets/audio/${AssetNames.SFX_LOCK_ON}.mp3`);
        this.audioBuffers[AssetNames.SFX_PAUSE] = await this.assetLoader.loadAudio(AssetNames.SFX_PAUSE, `assets/audio/${AssetNames.SFX_PAUSE}.mp3`);
        this.audioBuffers[AssetNames.SFX_ROLLING] = await this.assetLoader.loadAudio(AssetNames.SFX_ROLLING, `assets/audio/${AssetNames.SFX_ROLLING}.mp3`);
        this.audioBuffers[AssetNames.SFX_START] = await this.assetLoader.loadAudio(AssetNames.SFX_START, `assets/audio/${AssetNames.SFX_START}.mp3`);
        this.audioBuffers[AssetNames.SFX_STRONG_ATTACK] = await this.assetLoader.loadAudio(AssetNames.SFX_STRONG_ATTACK, `assets/audio/${AssetNames.SFX_STRONG_ATTACK}.mp3`);
        this.audioBuffers[AssetNames.SFX_SWITCH_WEAPON] = await this.assetLoader.loadAudio(AssetNames.SFX_SWITCH_WEAPON, `assets/audio/${AssetNames.SFX_SWITCH_WEAPON}.mp3`);
        this.audioBuffers[AssetNames.SFX_TALK] = await this.assetLoader.loadAudio(AssetNames.SFX_TALK, `assets/audio/${AssetNames.SFX_TALK}.mp3`);
        this.audioBuffers[AssetNames.SFX_USE_ITEM] = await this.assetLoader.loadAudio(AssetNames.SFX_USE_ITEM, `assets/audio/${AssetNames.SFX_USE_ITEM}.mp3`);
        this.audioBuffers[AssetNames.SFX_USE_SKILL_BUFF] = await this.assetLoader.loadAudio(AssetNames.SFX_USE_SKILL_BUFF, `assets/audio/${AssetNames.SFX_USE_SKILL_BUFF}.mp3`);
        this.audioBuffers[AssetNames.SFX_USE_SKILL_PROJECTILE] = await this.assetLoader.loadAudio(AssetNames.SFX_USE_SKILL_PROJECTILE, `assets/audio/${AssetNames.SFX_USE_SKILL_PROJECTILE}.mp3`);
        this.audioBuffers[AssetNames.SFX_WEAK_ATTACK] = await this.assetLoader.loadAudio(AssetNames.SFX_WEAK_ATTACK, `assets/audio/${AssetNames.SFX_WEAK_ATTACK}.mp3`);
    }

    async loadModels() {
        const assetsToLoad = [
            { model: AssetNames.PLAYER_MODEL, texture: AssetNames.PLAYER_TEXTURE },
            { model: AssetNames.ENEMY_MODEL, texture: AssetNames.ENEMY_TEXTURE },
            { model: AssetNames.BOSS_MODEL, texture: AssetNames.BOSS_TEXTURE },
            { model: AssetNames.NPC_MODEL, texture: AssetNames.NPC_TEXTURE },
            { model: AssetNames.TREE_MODEL, texture: AssetNames.TREE_TEXTURE },
            { model: AssetNames.ROCK_MODEL, texture: AssetNames.ROCK_TEXTURE },
            { model: AssetNames.GRASS_MODEL, texture: AssetNames.GRASS_TEXTURE },
            { model: AssetNames.CLOUD_MODEL, texture: AssetNames.CLOUD_TEXTURE },
            { model: AssetNames.SUN_MODEL, texture: AssetNames.SUN_TEXTURE },
        ];

        for (const asset of assetsToLoad) {
            try {
                await this.assetLoader.loadGLTF(asset.model, `assets/models/${asset.model}.glb`);
                const texturePath = `assets/textures/${asset.model}.png`;
                try {
                    await this.assetLoader.loadTexture(asset.texture, texturePath);
                } catch (textureError) {
                    console.warn(`Texture for ${asset.model} not found at ${texturePath}. Using default material.`);
                }
            } catch (error) {
                console.error(`Could not load model ${asset.model}. A placeholder will be used.`);
            }
        }
    }

    startGame() {
        if (this.gameState !== GameState.TITLE) return;

        this.gameState = GameState.PLAYING;
        this.hud.container.style.display = 'block';
        if (this.titleScreen) {
            this.titleScreen.dispose();
            this.titleScreen = null;
        }
        // タイトルBGMを停止し、ゲームBGMを再生
        if (this.titleBGM && this.titleBGM.isPlaying) {
            this.titleBGM.stop();
        }
        if (!this.gameBGM.isPlaying) {
            this.gameBGM.play();
        }
        this.playSound(AssetNames.SFX_START);
        // Request pointer lock now that the game has started from a user click
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
            this.pauseMenu.toggle(true);
            this.gameBGM.pause(); // BGMを停止
            document.exitPointerLock();
        } else if (this.gameState === GameState.PAUSED) {
            this.gameState = GameState.PLAYING;
            this.pauseMenu.toggle(false);
            this.gameBGM.play(); // BGMを再開
            this.sceneManager.renderer.domElement.requestPointerLock();
        }
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
        if (this.gameState !== GameState.PAUSED) {
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

                this.items.forEach((item, index) => {
                    const distance = this.player?.mesh.position.distanceTo(item.mesh.position);
                    if (distance < this.data.items.generic.pickupRange) {
                        this.player?.inventory.push(item.type);
                        this.sceneManager.remove(item.mesh);
                        this.itemsToRemove.push(item);
                    }
                });

                for (let i = this.projectiles.length - 1; i >= 0; i--) {
                    const projectile = this.projectiles[i];
                    projectile.update(deltaTime);
                    let shouldRemove = false;

                    if (projectile.lifespan <= 0) {
                        shouldRemove = true;
                    }

                    if (!shouldRemove) {
                        for (const enemy of this.enemies) {
                            const distance = projectile.mesh.position.distanceTo(enemy.mesh.position);
                            const hitRange = this.data.weapons.projectileHitRange;
                            if (distance < hitRange) {
                                enemy.takeDamage(projectile.damage);
                                shouldRemove = true;
                                break; // 1度ヒットしたら敵ループを抜ける
                            }
                        }
                    }

                    if (shouldRemove) {
                        this.sceneManager.remove(projectile.mesh);
                        this.projectiles.splice(i, 1);
                    }
                }

                if (this.boss && !this.boss.isDead) {
                    this.boss.update(deltaTime);
                } else if (this.boss?.isDead) {
                    this.player?.addExperience(this.boss.experience);
                    this.sceneManager.remove(this.boss.mesh);
                    this.boss = null;
                }

                this.npcs.forEach(npc => {
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
    }
}