import * as THREE from 'three';
import {
    GRAVITY,
    PLAYER_RESPAWN_DELAY,
    PLAYER_LEVEL_UP_EXP_MULTIPLIER,
    PLAYER_STATUS_POINTS_PER_LEVEL,
    POTION_HEAL_AMOUNT,
    PLAYER_ATTACK_BUFF_MULTIPLIER
} from '../utils/constants.js';

export class Player {
    constructor(field) {
        this.field = field;
        const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        this.mesh = new THREE.Mesh(geometry, material);

        // 初期位置を地形の高さに合わせる
        this.mesh.position.set(0, 50, 0); // 仮の高い位置に設定
        const raycaster = new THREE.Raycaster(this.mesh.position, new THREE.Vector3(0, -1, 0));
        const intersects = raycaster.intersectObject(this.field.mesh);
        if (intersects.length > 0) {
            this.mesh.position.y = intersects[0].point.y + 0.25; // 地面の少し上に配置
        } else {
            this.mesh.position.y = 0.25; // 地形が見つからない場合のフォールバック
        }

        // ステータス
        this.maxHp = 100;
        this.hp = this.maxHp;
        this.maxFp = 50;
        this.fp = this.maxFp;
        this.maxStamina = 100;
        this.stamina = this.maxStamina;
        this.isDashing = false;

        // 物理演算用
        this.velocity = new THREE.Vector3();
        this.onGround = true;
        this.isRolling = false;
        this.isInvincible = false;
        this.isAttacking = false;
        this.isGuarding = false;
        this.isLockedOn = false;
        this.lockedOnTarget = null;
        this.isDead = false;

        // レベルと経験値
        this.level = 1;
        this.experience = 0;
        this.experienceToNextLevel = 100;
        this.statusPoints = 0;
        this.inventory = [];

        // 武器
        this.weapons = ['sword', 'claws'];
        this.currentWeaponIndex = 0;
        this.isUsingSkill = false;
        this.originalColor = this.mesh.material.color.clone();
    }

    // Visual feedback for actions
    showAttackEffect() {
        this.mesh.material.color.set(0xffffff); // White
        setTimeout(() => this.mesh.material.color.copy(this.originalColor), 100);
    }

    showSkillEffect() {
        this.mesh.material.color.set(0x8a2be2); // BlueViolet
        setTimeout(() => this.mesh.material.color.copy(this.originalColor), 100);
    }

    startChargingEffect() {
        this.mesh.material.color.set(0xffff00); // Yellow
    }

    stopChargingEffect() {
        this.mesh.material.color.copy(this.originalColor);
    }

    useItem(index) {
        if (this.inventory.length > index) {
            const item = this.inventory[index];
            if (item === 'potion') {
                this.hp += POTION_HEAL_AMOUNT;
                if (this.hp > this.maxHp) this.hp = this.maxHp;
                console.log('Used potion! HP restored.');
            }
            this.inventory.splice(index, 1);
        }
    }

    addExperience(amount) {
        this.experience += amount;
        if (this.experience >= this.experienceToNextLevel) {
            this.levelUp();
        }
    }

    levelUp() {
        this.level++;
        this.experience -= this.experienceToNextLevel;
        this.experienceToNextLevel = Math.floor(this.experienceToNextLevel * PLAYER_LEVEL_UP_EXP_MULTIPLIER);
        this.statusPoints += PLAYER_STATUS_POINTS_PER_LEVEL;
        console.log('Level Up!');
    }

    respawn() {
        this.mesh.position.set(0, 0.25, 0);
        this.hp = this.maxHp;
        this.stamina = this.maxStamina;
        this.isDead = false;
        console.log('Player Respawned!');
    }

    update(deltaTime) {
        if (this.hp <= 0 && !this.isDead) {
            this.isDead = true;
            console.log('Player Died!');
            // TODO: Show YOU DIED screen
            setTimeout(() => this.respawn(), PLAYER_RESPAWN_DELAY);
        }

        if (this.isDead) return;

        // Raycaster for ground detection
        const raycaster = new THREE.Raycaster(this.mesh.position, new THREE.Vector3(0, -1, 0));
        const intersects = raycaster.intersectObject(this.field.mesh);

        let groundHeight = -Infinity;
        if (intersects.length > 0) {
            groundHeight = intersects[0].point.y;
        }

        // 物理演算
        this.velocity.y -= GRAVITY * deltaTime; // 重力
        this.mesh.position.add(this.velocity.clone().multiplyScalar(deltaTime));

        // 地面との衝突判定
        if (this.mesh.position.y < groundHeight + 0.25) {
            this.mesh.position.y = groundHeight + 0.25;
            this.velocity.y = 0;
            this.onGround = true;
        }

        if (this.isLockedOn && this.lockedOnTarget) {
            this.mesh.lookAt(this.lockedOnTarget.mesh.position);
        }
    }

    applyAttackBuff() {
        this.isAttackBuffed = true;
        console.log('Attack buff applied!');
    }

    removeAttackBuff() {
        this.isAttackBuffed = false;
        console.log('Attack buff removed!');
    }

    applyDefenseBuff() {
        this.isDefenseBuffed = true;
        console.log('Defense buff applied!');
    }

    removeDefenseBuff() {
        this.isDefenseBuffed = false;
        console.log('Defense buff removed!');
    }
}
