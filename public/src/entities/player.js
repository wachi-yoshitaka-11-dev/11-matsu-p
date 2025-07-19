import * as THREE from 'three';
import { GRAVITY } from '../utils/constants.js';

export class Player {
    constructor(game, field) {
        this.game = game;
        this.field = field;
        const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        this.mesh = new THREE.Mesh(geometry, material);

        // 初期位置を地形の高さに合わせる
        this.spawn();

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
        this.effectTimeout = null;
    }

    spawn() {
        this.mesh.position.set(0, 50, 0); // 仮の高い位置に設定
        if (this.field?.mesh) {
            const raycaster = new THREE.Raycaster(this.mesh.position, new THREE.Vector3(0, -1, 0));
            const intersects = raycaster.intersectObject(this.field.mesh);
            if (intersects.length > 0) {
                this.mesh.position.y = intersects[0].point.y + 0.25; // 地面の少し上に配置
            } else {
                this.mesh.position.y = 0.25; // 地形が見つからない場合のフォールバック
            }
        } else {
            this.mesh.position.y = 0.25; // フィールドが存在しない場合のフォールバック
        }
    }

    // Visual feedback for actions
    showAttackEffect() {
        this.mesh.material.color.set(0xffffff); // White
        this.clearEffectTimeout();
        this.effectTimeout = setTimeout(() => this.mesh.material.color.copy(this.originalColor), 100);
    }

    showSkillEffect() {
        this.mesh.material.color.set(0x8a2be2); // BlueViolet
        this.clearEffectTimeout();
        this.effectTimeout = setTimeout(() => this.mesh.material.color.copy(this.originalColor), 100);
    }

    startChargingEffect() {
        this.mesh.material.color.set(0xffff00); // Yellow
        this.clearEffectTimeout();
    }

    stopChargingEffect() {
        this.mesh.material.color.copy(this.originalColor);
    }

    clearEffectTimeout() {
        if (this.effectTimeout) {
            clearTimeout(this.effectTimeout);
            this.effectTimeout = null;
        }
    }

    useItem(index) {
        if (this.inventory.length > index) {
            const itemType = this.inventory[index];
            if (itemType === 'potion') {
                this.hp += this.game.data.items.potion.HEAL_AMOUNT;
                if (this.hp > this.maxHp) this.hp = this.maxHp;
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
        this.experienceToNextLevel = Math.floor(this.experienceToNextLevel * this.game.data.player.LEVEL_UP_EXP_MULTIPLIER);
        this.statusPoints += this.game.data.player.STATUS_POINTS_PER_LEVEL;
    }

    respawn() {
        this.spawn();
        this.hp = this.maxHp;
        this.stamina = this.maxStamina;
        this.isDead = false;
    }

    update(deltaTime) {
        if (this.hp <= 0 && !this.isDead) {
            this.isDead = true;
            setTimeout(() => this.respawn(), this.game.data.player.RESPAWN_DELAY);
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
    }

    removeAttackBuff() {
        this.isAttackBuffed = false;
    }

    applyDefenseBuff() {
        this.isDefenseBuffed = true;
    }

    removeDefenseBuff() {
        this.isDefenseBuffed = false;
    }

    takeDamage(amount) {
        if (this.isInvincible) return;
        this.hp -= amount;
    }

    takeStaminaDamage(amount) {
        this.stamina -= amount;
    }
}