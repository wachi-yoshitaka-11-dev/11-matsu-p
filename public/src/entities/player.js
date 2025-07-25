import * as THREE from 'three';
import { Character } from './character.js';

export class Player extends Character {
    constructor(game) {
        const loadedModel = game.assetLoader.getAsset('player');

        if (loadedModel instanceof THREE.Group) {
            super(game, loadedModel, null, { hp: game.data.player.maxHp, modelName: 'player' });
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
        this.isAttacking = false;
        this.isWeakAttacking = false;
        this.isStrongAttacking = false;
        this.isRolling = false;

        this.attackBuffMultiplier = 1.0;
        this.defenseBuffMultiplier = 1.0;
        this.isAttackBuffed = false;
        this.isDefenseBuffed = false;

        this.spawn();

        // Listen for animation finished event
        if (this.mixer) {
            this.mixer.addEventListener('finished', (e) => {
                const clipName = e.action.getClip().name;
                if (clipName.startsWith('attack-')) {
                    this.isAttacking = false;
                    this.isWeakAttacking = false;
                    this.isStrongAttacking = false;
                } else if (clipName === 'roll') {
                    this.isRolling = false;
                }

                // After a one-shot animation, determine the next logical state
                this.updateAnimation();
            });
        }
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
        this.updateAnimation();

        if (!this.isDashing && !this.isGuarding && !this.isAttacking && !this.isRolling) {
            this.stamina += this.game.data.player.staminaRegenRate * deltaTime;
            if (this.stamina > this.maxStamina) {
                this.stamina = this.maxStamina;
            }
        }
    }

    updateAnimation() {
        if (this.isDead) {
            this.playAnimation('die');
            return;
        }

        // Don't switch animations if a one-shot animation is in progress
        if (this.isAttacking || this.isStrongAttacking || this.isRolling) {
            return;
        }

        this.onGround = this.physics.onGround;

        if (this.isLockedOn && this.lockedOnTarget) {
            this.mesh.lookAt(this.lockedOnTarget.mesh.position);
        }

        let newAnimation = 'idle';

        if (this.isGuarding) {
            newAnimation = 'guard';
        } else if (this.physics.velocity.y > 0 && !this.onGround) {
            newAnimation = 'jump';
        } else if (this.isDashing) {
            newAnimation = 'sprint';
        } else if (new THREE.Vector2(this.physics.velocity.x, this.physics.velocity.z).length() > 0.1) {
            newAnimation = 'walk';
        }

        this.playAnimation(newAnimation);
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