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
        this.bgm = new THREE.Audio(this.listener);
        this.audioBuffers = {};

        this.gameState = GameState.TITLE;
        this.titleScreen = new TitleScreen(() => this.startGame());
        this.pauseMenu = new PauseMenu(this);
        this.dialogBox = new DialogBox(this);
    }

    async init() {
        this.sceneManager.init();
        await this.loadGameData();
        await this.loadAudio();
        await this.loadModels();

        this.titleScreen.enableInteraction(); // ロード完了後にクリックを有効にする

        this.field = new Field();
        this.sceneManager.add(this.field.mesh);

        this.player = new Player(this);
        this.sceneManager.add(this.player.mesh);

        this.hud = new Hud(this, this.player);

        this.inputController = new InputController(this.player, this.sceneManager.camera, this, this.sceneManager.renderer.domElement);

        // 5. 敵やアイテムなどを生成してシーンとゲーム管理リストに追加
        const enemyX = 5;
        const enemyZ = 0;
        const enemy = new Enemy(this, this.player, new THREE.Vector3(enemyX, 0, enemyZ));
        this.enemies.push(enemy);
        this.sceneManager.add(enemy.mesh);

        const item = new Item('potion', new THREE.Vector3(3, 0.2, 3), this);
        this.items.push(item);
        this.sceneManager.add(item.mesh);

        const boss = new Boss(this, this.player);
        this.boss = boss;
        this.sceneManager.add(boss.mesh);

        const npc = new Npc('こんにちは、冒険者よ。この先には強力なボスが待ち構えているぞ。', new THREE.Vector3(-5, 0.5, -5), this);
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
        const bgmBuffer = await this.assetLoader.loadAudio('bgm', 'assets/audio/bgm.mp3');
        this.bgm.setBuffer(bgmBuffer);
        this.bgm.setLoop(true);
        this.bgm.setVolume(0.2);

        this.audioBuffers['damage'] = await this.assetLoader.loadAudio('damage', 'assets/audio/damage.mp3');
        this.audioBuffers['death'] = await this.assetLoader.loadAudio('death', 'assets/audio/death.mp3');
        this.audioBuffers['guard'] = await this.assetLoader.loadAudio('guard', 'assets/audio/guard.mp3');
        this.audioBuffers['jump'] = await this.assetLoader.loadAudio('jump', 'assets/audio/jump.mp3');
        this.audioBuffers['lock-on'] = await this.assetLoader.loadAudio('lock-on', 'assets/audio/lock-on.mp3');
        this.audioBuffers['pause'] = await this.assetLoader.loadAudio('pause', 'assets/audio/pause.mp3');
        this.audioBuffers['rolling'] = await this.assetLoader.loadAudio('rolling', 'assets/audio/rolling.mp3');
        this.audioBuffers['start'] = await this.assetLoader.loadAudio('start', 'assets/audio/start.mp3');
        this.audioBuffers['strong-attack'] = await this.assetLoader.loadAudio('strong-attack', 'assets/audio/strong-attack.mp3');
        this.audioBuffers['switch-weapon'] = await this.assetLoader.loadAudio('switch-weapon', 'assets/audio/switch-weapon.mp3');
        this.audioBuffers['talk'] = await this.assetLoader.loadAudio('talk', 'assets/audio/talk.mp3');
        this.audioBuffers['use-item'] = await this.assetLoader.loadAudio('use-item', 'assets/audio/use-item.mp3');
        this.audioBuffers['use-skill-buff'] = await this.assetLoader.loadAudio('use-skill-buff', 'assets/audio/use-skill-buff.mp3');
        this.audioBuffers['use-skill-projectile'] = await this.assetLoader.loadAudio('use-skill-projectile', 'assets/audio/use-skill-projectile.mp3');
        this.audioBuffers['weak-attack'] = await this.assetLoader.loadAudio('weak-attack', 'assets/audio/weak-attack.mp3');
    }

    async loadModels() {
        const models = ['player', 'enemy', 'boss', 'npc'];
        for (const modelName of models) {
            try {
                await this.assetLoader.loadGLTF(modelName, `assets/models/${modelName}.glb`);
            } catch (error) {
                console.error(`Could not load model ${modelName}. A placeholder will be used.`);
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
        if (!this.bgm.isPlaying) {
            this.bgm.play();
        }
        this.playSound('start');
        // Request pointer lock now that the game has started from a user click
        this.sceneManager.renderer.domElement.requestPointerLock();
    }

    togglePause() {
        if (this.gameState === GameState.PLAYING) {
            this.gameState = GameState.PAUSED;
            this.pauseMenu.toggle(true);
            this.bgm.pause(); // BGMを停止
            document.exitPointerLock();
        } else if (this.gameState === GameState.PAUSED) {
            this.gameState = GameState.PLAYING;
            this.pauseMenu.toggle(false);
            this.bgm.play(); // BGMを再開
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
        // Always update game logic, except when paused
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

        // Update camera and HUD regardless of the state (as long as not paused)
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