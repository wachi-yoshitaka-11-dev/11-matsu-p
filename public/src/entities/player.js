import * as THREE from 'three';
import { Character } from './character.js';
import { AnimationNames, AssetNames } from '../utils/constants.js';

export class Player extends Character {
    constructor(game) {
        const loadedModel = game.assetLoader.getAsset(AssetNames.PLAYER_MODEL);

        if (loadedModel instanceof THREE.Group) {
            super(game, loadedModel, null, { hp: game.data.player.maxHp, modelName: AssetNames.PLAYER_MODEL, textureName: AssetNames.PLAYER_TEXTURE });
        } else {
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
        this.isAttackingWeak = false;
        this.isAttackingStrong = false;
        this.isRolling = false;

        this.attackBuffMultiplier = 1.0;
        this.defenseBuffMultiplier = 1.0;

        this.spawn();

        // Listen for animation finished event
        if (this.mixer) {
            this.mixer.addEventListener('finished', (e) => {
                const clipName = e.action.getClip().name;
                if (clipName === AnimationNames.ATTACK_WEAK || clipName === AnimationNames.ATTACK_STRONG) {
                    this.isAttacking = false;
                    this.isAttackingWeak = false;
                    this.isAttackingStrong = false;
                } else if (clipName === AnimationNames.ROLLING) {
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
            this.playAnimation(AnimationNames.DIE);
            return;
        }

        // Don't switch animations if a one-shot animation is in progress
        if (this.isAttacking || this.isRolling) {
            return;
        }

        this.onGround = this.physics.onGround;

        if (this.isLockedOn && this.lockedOnTarget) {
            this.mesh.lookAt(this.lockedOnTarget.mesh.position);
        }

        let newAnimation = AnimationNames.IDLE;

        if (this.isGuarding) {
            newAnimation = AnimationNames.GUARD;
        } else if (this.isRolling) {
            newAnimation = AnimationNames.ROLLING;
        } else if (this.physics.velocity.y > 0 && !this.onGround) {
            newAnimation = AnimationNames.JUMP;
        } else if (this.isDashing) {
            newAnimation = AnimationNames.DASH;
        } else if (new THREE.Vector2(this.physics.velocity.x, this.physics.velocity.z).length() > 0.1) {
            newAnimation = AnimationNames.WALK;
        }

        this.playAnimation(newAnimation);
    }

    onDeath() {
        this.game.playSound(AssetNames.SFX_DEATH);
        this.game.hud.showDeathScreen();
        setTimeout(() => this.respawn(), this.game.data.player.respawnDelay);
    }

    takeDamage(amount) {
        if (this.isInvincible) return;
        const finalDamage = amount / this.defenseBuffMultiplier;
        super.takeDamage(finalDamage);
        this.game.playSound(AssetNames.SFX_DAMAGE);
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
        this.game.playSound(AssetNames.SFX_LEVEL_UP);
    }

    useItem(index) {
        if (this.inventory.length > index) {
            const itemType = this.inventory[index];
            const itemData = this.game.data.items[itemType];

            if (!itemData) {
                console.warn(`Unknown item type: ${itemType}`);
                return;
            }

            if (itemType === ItemTypes.POTION) {
                this.hp += itemData.healAmount;
                if (this.hp > this.maxHp) this.hp = this.maxHp;
            }
            this.playAnimation(AnimationNames.USE_ITEM); // Use interact-right for item use
            this.game.playSound(AssetNames.SFX_USE_ITEM);

            this.inventory.splice(index, 1);
        }
    }

    applyAttackBuff() {
        this.attackBuffMultiplier = this.game.data.skills.buff.attackBuffMultiplier;
    }

    removeAttackBuff() {
        this.attackBuffMultiplier = 1.0;
    }

    applyDefenseBuff() {
        this.defenseBuffMultiplier = this.game.data.skills.buff.defenseBuffMultiplier;
    }

    removeDefenseBuff() {
        this.defenseBuffMultiplier = 1.0;
    }
}