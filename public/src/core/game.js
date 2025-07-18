import * as THREE from 'three';
import { Hud } from '../ui/hud.js';
import { TitleScreen } from '../ui/title-screen.js';
import { PauseMenu } from '../ui/pause-menu.js';
import { SceneManager } from './scene-manager.js';
import { AssetLoader } from './asset-loader.js';
import { Item as ItemConst, Projectile as ProjectileConst } from '../utils/constants.js';

const GameState = {
    TITLE: 'title',
    PLAYING: 'playing',
    PAUSED: 'paused'
};

export class Game {
    constructor(player) {
        this.player = player;
        this.sceneManager = new SceneManager(this);
        this.assetLoader = new AssetLoader();
        this.clock = new THREE.Clock();
        this.enemies = [];
        this.items = [];
        this.projectiles = [];
        this.boss = null;
        this.npcs = [];

        // Audio
        this.listener = new THREE.AudioListener();
        this.sceneManager.camera.add(this.listener);
        this.bgm = new THREE.Audio(this.listener);
        this.audioBuffers = {}; // Store loaded audio buffers

        this.gameState = GameState.TITLE;
        this.titleScreen = new TitleScreen(() => this.startGame());
        this.pauseMenu = new PauseMenu(this);
        this.hud = new Hud(this.player);

        this.init();
        this.loadAudio();
    }

    init() {
        this.sceneManager.init();
    }

    startGame() {
        this.gameState = GameState.PLAYING;
        this.hud.container.style.display = 'block';
        if (!this.bgm.isPlaying) {
            this.bgm.play();
        }
    }

    togglePause() {
        if (this.gameState === GameState.PLAYING) {
            this.gameState = GameState.PAUSED;
            this.pauseMenu.toggle(true);
            document.exitPointerLock();
        } else if (this.gameState === GameState.PAUSED) {
            this.gameState = GameState.PLAYING;
            this.pauseMenu.toggle(false);
            document.body.requestPointerLock();
        }
    }

    async loadAudio() {
        const bgmBuffer = await this.assetLoader.loadAudio('bgm', 'assets/audio/bgm.mp3');
        this.bgm.setBuffer(bgmBuffer);
        this.bgm.setLoop(true);
        this.bgm.setVolume(0.5);

        this.audioBuffers['attack'] = await this.assetLoader.loadAudio('attack', 'assets/audio/attack.mp3');
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
        this.animate();
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));

        if (this.gameState === GameState.PAUSED) {
            this.sceneManager.render();
            return;
        }

        if (this.gameState !== GameState.PLAYING) {
            this.sceneManager.render();
            return;
        }

        const deltaTime = this.clock.getDelta();

        this.player?.update(deltaTime);
        this.inputController?.update();

        this.enemies.forEach((enemy, index) => {
            if (enemy.isDead) {
                this.player?.addExperience(enemy.experience);
                this.sceneManager.remove(enemy.mesh);
                this.enemies.splice(index, 1);
            } else {
                enemy.update(deltaTime);
            }
        });

        this.items.forEach((item, index) => {
            const distance = this.player?.mesh.position.distanceTo(item.mesh.position);
            if (distance < ItemConst.PICKUP_RANGE) {
                this.player?.inventory.push(item.type);
                this.sceneManager.remove(item.mesh);
                this.items.splice(index, 1);
            }
        });

        this.projectiles.forEach((projectile, pIndex) => {
            projectile.update(deltaTime);
            if (projectile.lifespan <= 0) {
                this.sceneManager.remove(projectile.mesh);
                this.projectiles.splice(pIndex, 1);
            }

            this.enemies.forEach(enemy => {
                const distance = projectile.mesh.position.distanceTo(enemy.mesh.position);
                if (distance < 1) { // Projectile hit range
                    enemy.takeDamage(ProjectileConst.DAMAGE);
                    this.sceneManager.remove(projectile.mesh);
                    this.projectiles.splice(pIndex, 1);
                }
            });
        });

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

        // カメラの更新
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

        this.hud.update();
        this.sceneManager.render();
    }
}
