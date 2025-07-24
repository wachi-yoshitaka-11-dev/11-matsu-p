import * as THREE from 'three';
import { Character } from './character.js';

export class Player extends Character {
    constructor(game) {
        const loadedModel = game.assetLoader.getAsset('player');

        if (loadedModel instanceof THREE.Group) {
            super(game, loadedModel, null, { hp: game.data.player.maxHp });
        } else {
            console.warn('GLTF player model not loaded or not a THREE.Group. Falling back to BoxGeometry.');
            const geometry = new THREE.BoxGeometry(0.5, 1.0, 0.5);
            const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
            super(game, geometry, material, { hp: game.data.player.maxHp });
        }

        this.maxFp = game.data.player.maxFp;
        this.fp = this.maxFp;
        this.maxStamina = game.data.player.maxStamina;
        this.stamina = this.maxStamina;

        this.level = game.data.player.initialLevel;
        this.experience = game.data.player.initialExperience;
        this.experienceToNextLevel = game.data.player.initialExpToNextLevel;
        this.statusPoints = game.data.player.initialStatusPoints;
        this.inventory = [];

        this.weapons = ['sword', 'claws'];
        this.currentWeaponIndex = 0;
        this.isUsingSkill = false;

        this.attackBuffMultiplier = 1.0;
        this.defenseBuffMultiplier = 1.0;
        this.isAttackBuffed = false;
        this.isDefenseBuffed = false;

        this.spawn();
    }

    spawn() {
        const spawnPoint = this.game.data.player.initialSpawnPoint || { x: 0, z: 0 };
        this.placeOnGround(spawnPoint.x, spawnPoint.z);
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
        this.game.reloadGame();
    }

    update(deltaTime) {
        super.update(deltaTime);

        if (this.isDead) return;

        this.onGround = this.physics.onGround;

        if (this.isLockedOn && this.lockedOnTarget) {
            this.mesh.lookAt(this.lockedOnTarget.mesh.position);
        }

        if (!this.isDashing && !this.isGuarding && !this.isAttacking && !this.isRolling) {
            this.stamina += this.game.data.player.staminaRegenRate * deltaTime;
            if (this.stamina > this.maxStamina) {
                this.stamina = this.maxStamina;
            }
        }
    }

    onDeath() {
        this.game.playSound('death');
        this.game.hud.showDeathScreen();
        setTimeout(() => this.respawn(), this.game.data.player.respawnDelay);
    }

    takeDamage(amount) {
        if (this.isInvincible) return;
        super.takeDamage(amount);
        this.game.playSound('damage');
    }

    takeStaminaDamage(amount) {
        this.stamina -= amount;
        if (this.stamina < 0) {
            this.stamina = 0;
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
        this.experienceToNextLevel = Math.floor(this.experienceToNextLevel * this.game.data.player.levelUpExpMultiplier);
        this.statusPoints += this.game.data.player.statusPointsPerLevel;
    }

    useItem(index) {
        if (this.inventory.length > index) {
            const itemType = this.inventory[index];
            const itemData = this.game.data.items[itemType];

            if (!itemData) {
                console.warn(`Unknown item type: ${itemType}`);
                return;
            }

            if (itemType === 'potion') {
                this.hp += itemData.healAmount;
                if (this.hp > this.maxHp) this.hp = this.maxHp;
            }
            this.game.playSound('use-item');

            this.inventory.splice(index, 1);
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