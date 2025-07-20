import * as THREE from 'three';
import { Character } from './character.js';

export class Player extends Character {
    constructor(game) {
        const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        super(game, geometry, material, { hp: game.data.player.MAX_HP });

        // Player-specific stats
        this.maxFp = game.data.player.MAX_FP;
        this.fp = this.maxFp;
        this.maxStamina = game.data.player.MAX_STAMINA;
        this.stamina = this.maxStamina;

        // Leveling and inventory
        this.level = game.data.player.INITIAL_LEVEL;
        this.experience = game.data.player.INITIAL_EXPERIENCE;
        this.experienceToNextLevel = game.data.player.INITIAL_EXP_TO_NEXT_LEVEL;
        this.statusPoints = game.data.player.INITIAL_STATUS_POINTS;
        this.inventory = [];

        // Weapons and skills
        this.weapons = ['sword', 'claws'];
        this.currentWeaponIndex = 0;
        this.isUsingSkill = false;

        // Effects
        this.originalColor = this.mesh.material.color.clone();
        this.effectTimeout = null;

        this.spawn();
    }

    spawn() {
        const spawnPoint = this.game.data.player.INITIAL_SPAWN_POINT || { x: 0, z: 0 };
        const x = spawnPoint.x;
        const z = spawnPoint.z;
        const y = this.game.field.getHeightAt(x, z) + this.mesh.geometry.parameters.height / 2;
        this.mesh.position.set(x, y, z);
        if (this.physics) {
            this.physics.velocity.set(0, 0, 0);
        }
    }

    respawn() {
        this.spawn();
        this.hp = this.maxHp;
        this.stamina = this.maxStamina;
        this.fp = this.maxFp;
        this.isDead = false;
        this.game.hud.hideDeathScreen();
    }

    update(deltaTime) {
        super.update(deltaTime); // Call parent update for physics

        if (this.isDead) return;

        this.onGround = this.physics.onGround;

        if (this.isLockedOn && this.lockedOnTarget) {
            this.mesh.lookAt(this.lockedOnTarget.mesh.position);
        }

        // Stamina regeneration
        if (!this.isDashing && !this.isGuarding && !this.isAttacking && !this.isRolling) {
            this.stamina += this.game.data.player.STAMINA_REGEN_RATE * deltaTime;
            if (this.stamina > this.maxStamina) {
                this.stamina = this.maxStamina;
            }
        }
    }

    onDeath() {
        this.game.playSound('death');
        this.game.hud.showDeathScreen();
        setTimeout(() => location.reload(), this.game.data.player.RESPAWN_DELAY);
    }

    takeDamage(amount) {
        if (this.isInvincible) return;
        super.takeDamage(amount); // Use parent method for HP reduction
        this.game.hud.showDamageEffect();
        this.game.playSound('damage');
    }

    takeStaminaDamage(amount) {
        this.stamina -= amount;
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

    useItem(index) {
        if (this.inventory.length > index) {
            const itemType = this.inventory[index];
            const itemData = this.game.data.items[itemType]; // Get item data from game.data

            if (!itemData) {
                console.warn(`Unknown item type: ${itemType}`);
                return; // Do not consume unknown items
            }

            if (itemType === 'potion') {
                this.hp += itemData.HEAL_AMOUNT;
                if (this.hp > this.maxHp) this.hp = this.maxHp;
            }
            // Add more item types here as needed

            this.inventory.splice(index, 1); // Consume item
        }
    }

    // Visual effect methods
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
}
