import * as THREE from 'three';
import { Hud } from '../ui/Hud.js';
import { TitleScreen } from '../ui/TitleScreen.js';
import { PauseMenu } from '../ui/PauseMenu.js';

const GameState = {
    TITLE: 'title',
    PLAYING: 'playing',
    PAUSED: 'paused'
};
import { InputController } from '../controls/InputController.js';

export class Game {
    constructor(player) {
        this.player = player;
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer();
        this.clock = new THREE.Clock();
        this.enemies = [];
        this.items = [];
        this.projectiles = [];
        this.boss = null;
        this.npcs = [];

        // Audio
        this.listener = new THREE.AudioListener();
        this.camera.add(this.listener);
        this.audioLoader = new THREE.AudioLoader();
        this.bgm = new THREE.Audio(this.listener);
        this.attackSound = new THREE.Audio(this.listener);

        this.gameState = GameState.TITLE;
        this.titleScreen = new TitleScreen(() => this.startGame());
        this.pauseMenu = new PauseMenu(this);
        this.hud = new Hud(this.player);

        this.init();
        this.loadAudio();
    }

    init() {
        this.camera.position.z = 5;
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(1, 1, 1).normalize();
        this.scene.add(light);

        window.addEventListener('resize', this.onWindowResize.bind(this), false);
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

    loadAudio() {
        this.audioLoader.load('assets/audio/bgm.mp3', (buffer) => {
            this.bgm.setBuffer(buffer);
            this.bgm.setLoop(true);
            this.bgm.setVolume(0.5);
        });
        this.audioLoader.load('assets/audio/attack.mp3', (buffer) => {
            this.attackSound.setBuffer(buffer);
            this.attackSound.setVolume(1);
        });
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    start() {
        this.animate();
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));

        if (this.gameState === GameState.PAUSED) {
            this.renderer.render(this.scene, this.camera);
            return;
        }

        if (this.gameState !== GameState.PLAYING) {
            this.renderer.render(this.scene, this.camera);
            return;
        }

        const deltaTime = this.clock.getDelta();

        this.player.update(deltaTime);
        if (this.inputController) {
            this.inputController.update();
        }

        this.enemies.forEach((enemy, index) => {
            if (enemy.isDead) {
                this.player.addExperience(enemy.experience);
                this.scene.remove(enemy.mesh);
                this.enemies.splice(index, 1);
            } else {
                enemy.update(deltaTime);
            }
        });

        this.items.forEach((item, index) => {
            const distance = this.player.mesh.position.distanceTo(item.mesh.position);
            if (distance < 0.5) {
                this.player.inventory.push(item.type);
                console.log(`Picked up ${item.type}! Inventory:`, this.player.inventory);
                this.scene.remove(item.mesh);
                this.items.splice(index, 1);
            }
        });

        this.projectiles.forEach((projectile, pIndex) => {
            projectile.update(deltaTime);
            if (projectile.lifespan <= 0) {
                this.scene.remove(projectile.mesh);
                this.projectiles.splice(pIndex, 1);
            }

            this.enemies.forEach(enemy => {
                const distance = projectile.mesh.position.distanceTo(enemy.mesh.position);
                if (distance < 1) {
                    enemy.hp -= projectile.damage;
                    console.log(`Enemy hit by projectile! HP: ${enemy.hp}`);
                    this.scene.remove(projectile.mesh);
                    this.projectiles.splice(pIndex, 1);
                }
            });
        });

        if (this.boss && !this.boss.isDead) {
            this.boss.update(deltaTime);
        } else if (this.boss && this.boss.isDead) {
            this.player.addExperience(this.boss.experience);
            this.scene.remove(this.boss.mesh);
            this.boss = null;
            console.log('Congratulations! You defeated the boss!');
        }

        this.npcs.forEach(npc => {
            npc.update(this.player.mesh.position);
        });

        // カメラの更新
        if (this.player.isLockedOn && this.player.lockedOnTarget) {
            const targetPosition = this.player.lockedOnTarget.mesh.position;
            const playerPosition = this.player.mesh.position;

            const midPoint = new THREE.Vector3().addVectors(playerPosition, targetPosition).multiplyScalar(0.5);
            const cameraPosition = new THREE.Vector3().subVectors(playerPosition, targetPosition).normalize().multiplyScalar(5).add(midPoint);
            cameraPosition.y = playerPosition.y + 2;

            this.camera.position.copy(cameraPosition);
            this.camera.lookAt(midPoint);
        } else {
            const cameraOffset = new THREE.Vector3(0, 2, 5);
            cameraOffset.applyQuaternion(this.player.mesh.quaternion);
            this.camera.position.copy(this.player.mesh.position).add(cameraOffset);
            this.camera.lookAt(this.player.mesh.position);
        }

        this.hud.update();
        this.renderer.render(this.scene, this.camera);
    }
}
