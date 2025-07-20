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

        this.field = new Field();
        this.sceneManager.add(this.field.mesh);

        this.player = new Player(this);
        this.sceneManager.add(this.player.mesh);

        this.hud = new Hud(this, this.player);

        this.inputController = new InputController(this.player, this.sceneManager.camera, this, this.sceneManager.renderer.domElement);

        // 5. 敵やアイテムなどを生成してシーンとゲーム管理リストに追加
        const enemyX = 5;
        const enemyZ = 0;
        const tempEnemy = new Enemy(this, this.player, new THREE.Vector3(0,0,0)); // Create a temporary enemy to get its height
        const enemyY = this.field.getHeightAt(enemyX, enemyZ) + tempEnemy.mesh.geometry.parameters.height / 2;
        tempEnemy.dispose(); // Dispose the temporary enemy
        const enemy = new Enemy(this, this.player, new THREE.Vector3(enemyX, enemyY, enemyZ));
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
        this.bgm.setVolume(0.5);

        this.audioBuffers['attack'] = await this.assetLoader.loadAudio('attack', 'assets/audio/attack.mp3');
        this.audioBuffers['damage'] = await this.assetLoader.loadAudio('damage', 'assets/audio/damage.mp3');
        this.audioBuffers['death'] = await this.assetLoader.loadAudio('death', 'assets/audio/death.mp3');
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
        // Request pointer lock now that the game has started from a user click
        this.sceneManager.renderer.domElement.requestPointerLock();
    }

    togglePause() {
        if (this.gameState === GameState.PLAYING) {
            this.gameState = GameState.PAUSED;
            this.pauseMenu.toggle(true);
            document.exitPointerLock();
        } else if (this.gameState === GameState.PAUSED) {
            this.gameState = GameState.PLAYING;
            this.pauseMenu.toggle(false);
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
            if (this.player?.isLockedOn && this.player?.lockedOnTarget) {
                const targetPosition = this.player.lockedOnTarget.mesh.position;
                const playerPosition = this.player.mesh.position;

                const midPoint = new THREE.Vector3().addVectors(playerPosition, targetPosition).multiplyScalar(0.5);
                const cameraPosition = new THREE.Vector3().subVectors(playerPosition, targetPosition).normalize().multiplyScalar(5).add(midPoint);
                cameraPosition.y = playerPosition.y + 2;

                this.sceneManager.camera.position.copy(cameraPosition);
                this.sceneManager.camera.lookAt(midPoint);
            } else if (this.player) {
                const cameraOffset = new THREE.Vector3(0, 2, 5);
                cameraOffset.applyQuaternion(this.player.mesh.quaternion);
                this.sceneManager.camera.position.copy(this.player.mesh.position).add(cameraOffset);
                this.sceneManager.camera.lookAt(this.player.mesh.position);
            }

            this.hud?.update();
        }

        this.sceneManager.render();
    }

    animate() {
        if (!this.isManualUpdate) {
            requestAnimationFrame(this.animate.bind(this));
        }

        const deltaTime = this.clock.getDelta();
        this._updateLoop(deltaTime);
    }
}