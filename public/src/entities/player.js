import * as THREE from 'three';
import { Character } from './character.js';
import { Projectile } from '../world/projectile.js';
import {
  AnimationNames,
  AssetNames,
  ItemTypes,
  MovementState,
} from '../utils/constants.js';

export class Player extends Character {
  constructor(game) {
    const loadedModel = game.assetLoader.getAsset(AssetNames.PLAYER_MODEL);

    if (loadedModel instanceof THREE.Group) {
      super(game, loadedModel, null, {
        hp: game.data.player.maxHp,
        modelName: AssetNames.PLAYER_MODEL,
        textureName: AssetNames.PLAYER_TEXTURE,
      });
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
    this.inventory = game.data.player.initialInventory || [];

    this.weapons = game.data.player.initialWeapons || [];
    this.currentWeaponIndex = 0;

    this.shields = game.data.player.initialShields || [];
    this.currentShieldIndex = 0;

    this.skills = game.data.player.initialSkills || [];
    this.currentSkillIndex = 0;
    this.currentItemIndex = 0;
    this.isUsingSkill = false;
    this.isAttacking = false;
    this.isAttackingWeak = false;
    this.isAttackingStrong = false;
    this.isRolling = false;
    this.isGuarding = false;

    // Elden Ring style movement states
    this.isJumping = false;
    this.isBackStepping = false;
    this.isDashing = false;

    // Lock-on system
    this.lockedTarget = null;

    this.attackBuffMultiplier = 1.0;
    this.defenseBuffMultiplier = 1.0;

    this.spawn();

    // Footstep sound system
    this.footstepAudio = null;
    this.isPlayingFootsteps = false;
    this.lastMovementState = null;

    // Listen for animation finished event
    if (this.mixer) {
      this.mixer.addEventListener('finished', (e) => {
        const clipName = e.action.getClip().name;
        if (
          clipName === AnimationNames.ATTACK_WEAK ||
          clipName === AnimationNames.ATTACK_STRONG
        ) {
          this.isAttacking = false;
          this.isAttackingWeak = false;
          this.isAttackingStrong = false;
        } else if (clipName === AnimationNames.ROLLING) {
          this.isRolling = false;
        } else if (clipName === AnimationNames.BACK_STEP) {
          this.isBackStepping = false;
        } else if (clipName === AnimationNames.JUMP) {
          this.isJumping = false;
        } else if (clipName === AnimationNames.PICK_UP) {
          this.isPickingUp = false;
        }

        this.updateAnimation();
      });
    }
  }

  spawn() {
    const spawnPoint = this.game.data.player.initialSpawnPoint || {
      x: 0,
      z: 0,
    };
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
    this.updateFootsteps();

    if (
      !this.isDashing &&
      !this.isGuarding &&
      !this.isAttacking &&
      !this.isRolling &&
      !this.isBackStepping &&
      !this.isPickingUp
    ) {
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
    if (
      this.isAttacking ||
      this.isAttackingWeak ||
      this.isAttackingStrong ||
      this.isRolling ||
      this.isBackStepping ||
      this.isPickingUp
    ) {
      return;
    }

    this.onGround = this.physics.onGround;

    let newAnimation = AnimationNames.IDLE;

    if (this.isGuarding) {
      newAnimation = AnimationNames.GUARD;
    } else if (this.physics.velocity.y > 0 && !this.onGround) {
      newAnimation = AnimationNames.JUMP;
    } else if (this.isDashing) {
      newAnimation = AnimationNames.DASH;
    } else if (
      new THREE.Vector2(
        this.physics.velocity.x,
        this.physics.velocity.z
      ).length() > 0.1
    ) {
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

    let finalDamage = amount / this.defenseBuffMultiplier;

    // Apply guard damage reduction if guarding
    if (this.isGuarding) {
      const shieldDefense = this.getShieldDefense();
      const blockPercentage = Math.min(0.8, shieldDefense / 100);
      finalDamage = finalDamage * (1 - blockPercentage);

      // Take stamina damage when guarding
      const staminaDamage = amount * 0.3;
      this.takeStaminaDamage(staminaDamage);

      this.game.playSound(
        this.game.audioBuffers[AssetNames.SFX_GUARD_SUCCESS]
          ? AssetNames.SFX_GUARD_SUCCESS
          : AssetNames.SFX_DAMAGE
      );
    } else {
      this.game.playSound(AssetNames.SFX_DAMAGE);
    }

    super.takeDamage(finalDamage);
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
    this.experienceToNextLevel = Math.floor(
      this.experienceToNextLevel * this.game.data.player.levelUpExpMultiplier
    );
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
      this.playAnimation(AnimationNames.USE_ITEM);
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
    this.defenseBuffMultiplier =
      this.game.data.skills.buff.defenseBuffMultiplier;
  }

  removeDefenseBuff() {
    this.defenseBuffMultiplier = 1.0;
  }

  getCurrentShield() {
    if (this.shields.length === 0) return null;
    const shieldName = this.shields[this.currentShieldIndex];
    return this.game.data.shields[shieldName];
  }

  switchShield() {
    if (this.shields.length > 1) {
      this.currentShieldIndex =
        (this.currentShieldIndex + 1) % this.shields.length;
      this.game.playSound(AssetNames.SFX_SWITCH_SHIELD);
    }
  }

  getShieldDefense() {
    const shield = this.getCurrentShield();
    return shield ? shield.defense : 0;
  }

  getCurrentSkill() {
    if (this.skills.length === 0) return null;
    const skillName = this.skills[this.currentSkillIndex];
    return this.game.data.skills[skillName];
  }

  switchSkill() {
    if (this.skills.length > 1) {
      this.currentSkillIndex =
        (this.currentSkillIndex + 1) % this.skills.length;
      this.game.playSound(AssetNames.SFX_SWITCH_SKILL);
    }
  }

  getCurrentWeapon() {
    if (this.weapons.length === 0) return null;
    const weaponName = this.weapons[this.currentWeaponIndex];
    return this.game.data.weapons[weaponName];
  }

  switchWeapon() {
    if (this.weapons.length > 1) {
      this.currentWeaponIndex =
        (this.currentWeaponIndex + 1) % this.weapons.length;
      this.game.playSound(AssetNames.SFX_SWITCH_WEAPON);
    }
  }

  getCurrentItem() {
    if (this.inventory.length === 0) return null;
    return this.inventory[this.currentItemIndex];
  }

  switchItem() {
    if (this.inventory.length > 1) {
      this.currentItemIndex =
        (this.currentItemIndex + 1) % this.inventory.length;
      this.game.playSound(AssetNames.SFX_SWITCH_ITEM);
    }
  }

  useCurrentItem() {
    if (this.inventory.length === 0) return false;

    const currentItem = this.getCurrentItem();
    if (!currentItem) return false;

    const itemData = this.game.data.items[currentItem];
    if (!itemData) {
      console.warn(`Unknown item type: ${currentItem}`);
      return false;
    }

    // Use the item based on its type
    let itemUsed = false;

    // HP recovery items
    if (itemData.healAmount) {
      this.hp += itemData.healAmount || 50;
      if (this.hp > this.maxHp) this.hp = this.maxHp;
      itemUsed = true;
    }

    // FP recovery items
    if (currentItem === 'fpPotion' || itemData.fpHealAmount) {
      this.fp += itemData.fpHealAmount || 30;
      if (this.fp > this.maxFp) this.fp = this.maxFp;
      itemUsed = true;
    }

    if (itemUsed) {
      this.playAnimation(AnimationNames.USE_ITEM);
      this.game.playSound(AssetNames.SFX_USE_ITEM);

      // Remove item from inventory
      this.inventory.splice(this.currentItemIndex, 1);

      // Adjust current index if needed
      if (
        this.currentItemIndex >= this.inventory.length &&
        this.inventory.length > 0
      ) {
        this.currentItemIndex = this.inventory.length - 1;
      } else if (this.inventory.length === 0) {
        this.currentItemIndex = 0;
      }

      return true;
    }

    return false;
  }

  useCurrentSkill() {
    const currentSkill = this.getCurrentSkill();
    if (!currentSkill) return false;

    if (this.isUsingSkill) {
      return false;
    }

    // Check if we have enough FP
    if (this.fp < currentSkill.fpCost) {
      return false;
    }

    // Use the skill based on its type
    const skillName = this.skills[this.currentSkillIndex];

    if (skillName === 'projectile') {
      return this.useProjectileSkill(currentSkill);
    } else if (skillName === 'buff') {
      return this.useBuffSkill(currentSkill);
    }

    return false;
  }

  useProjectileSkill(skillData) {
    this.isUsingSkill = true;
    this.fp -= skillData.fpCost;
    this.showSkillProjectileEffect();
    this.playAnimation(AnimationNames.USE_SKILL_PROJECTILE);
    this.game.playSound(AssetNames.SFX_USE_SKILL_PROJECTILE);

    const direction = new THREE.Vector3();
    this.mesh.getWorldDirection(direction);
    const projectile = new Projectile(
      this.mesh.position.clone().add(new THREE.Vector3(0, 0.5, 0)),
      direction,
      this.game
    );
    this.game.projectiles.push(projectile);
    this.game.sceneManager.add(projectile.mesh);

    setTimeout(() => {
      this.isUsingSkill = false;
    }, skillData.duration);

    return true;
  }

  useBuffSkill(skillData) {
    this.isUsingSkill = true;
    this.fp -= skillData.fpCost;
    this.game.playSound(AssetNames.SFX_USE_SKILL_BUFF);
    this.showSkillBuffEffect();
    this.playAnimation(AnimationNames.USE_SKILL_BUFF);
    this.applyAttackBuff();
    this.applyDefenseBuff();

    setTimeout(() => {
      this.removeAttackBuff();
      this.removeDefenseBuff();
      this.isUsingSkill = false;
    }, skillData.duration);

    return true;
  }

  updateFootsteps() {
    // Skip footsteps if player is not moving or is doing an action that shouldn't have footsteps
    if (
      this.isDead ||
      this.isJumping ||
      this.isRolling ||
      this.isBackStepping ||
      this.isAttacking ||
      this.isPickingUp
    ) {
      this.stopFootsteps();
      return;
    }

    // Check if player is moving based on velocity
    const velocity = this.physics.velocity;
    if (!velocity) {
      this.stopFootsteps();
      return;
    }
    const isMoving = velocity.length() > 0.1;

    if (!isMoving) {
      this.stopFootsteps();
      return;
    }

    // Determine movement state based on isDashing
    const currentMovementState = this.isDashing
      ? MovementState.DASH
      : MovementState.WALK;

    // If movement state changed, switch footstep sound
    if (currentMovementState !== this.lastMovementState) {
      this.stopFootsteps();
      this.startFootsteps(currentMovementState);
      this.lastMovementState = currentMovementState;
    }

    // If not playing footsteps but should be, start them
    if (!this.isPlayingFootsteps) {
      this.startFootsteps(currentMovementState);
    }
  }

  startFootsteps(movementState) {
    if (this.isPlayingFootsteps) {
      this.stopFootsteps();
    }

    const soundName =
      movementState === MovementState.DASH
        ? AssetNames.SFX_DASH
        : AssetNames.SFX_WALK;

    // Create looping audio for footsteps using common method
    this.footstepAudio = this.game.createAudio(soundName, {
      volume: 0.3,
      loop: true,
    });

    if (this.footstepAudio) {
      this.footstepAudio.play();
    }

    this.isPlayingFootsteps = true;
  }

  stopFootsteps() {
    if (this.footstepAudio) {
      this.footstepAudio.stop();
      this.footstepAudio = null;
    }
    this.isPlayingFootsteps = false;
    this.lastMovementState = null;
  }

  playPickUpAnimation() {
    if (this.isPickingUp || this.isDead) {
      return;
    }

    this.isPickingUp = true;
    this.playAnimation(AnimationNames.PICK_UP);

    // Play pickup sound effect
    this.game.playSound(AssetNames.SFX_PICKUP_ITEM);
  }
}
