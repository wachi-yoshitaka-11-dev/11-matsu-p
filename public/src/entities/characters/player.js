import * as THREE from 'three';
import { Character } from './character.js';
import {
  AnimationNames,
  SkillTypes,
  AssetPaths,
  MovementState,
} from '../../utils/constants.js';

export class Player extends Character {
  constructor(game, playerId, options = {}) {
    const playerData = game.data[playerId];
    if (!playerData) {
      throw new Error(`Player ID "${playerId}" not found in game data`);
    }
    const modelName = playerData.model.replace('.glb', '');
    const loadedModel = game.assetLoader.getModel(modelName);

    if (loadedModel instanceof THREE.Group) {
      super(game, playerId, playerData, loadedModel, null, {
        hp: playerData.maxHp,
        modelName: modelName,
        textureName: playerData.texture.replace('.png', ''),
      });
    } else {
      const geometry = new THREE.BoxGeometry(0.5, 1.0, 0.5);
      const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
      super(game, playerId, playerData, geometry, material, {
        hp: playerData.maxHp,
      });
    }

    this.maxFp = playerData.maxFp;
    this.fp = this.maxFp;
    this.maxStamina = playerData.maxStamina;
    this.stamina = this.maxStamina;

    this.level = playerData.initialLevel;
    this.totalExperience = playerData.initialExperience; // Cumulative experience
    this.experience = playerData.initialExperience; // Experience at current level
    this.experienceToNextLevel = playerData.initialExpToNextLevel; // Experience needed for next level
    this.statusPoints = playerData.initialStatusPoints;
    this.inventory = playerData.initialInventory || [];

    this.weapons = playerData.initialWeapons || [];
    this.currentWeaponIndex = 0;

    this.shields = playerData.initialShields || [];
    this.currentShieldIndex = 0;

    this.skills = playerData.initialSkills || [];
    this.currentSkillIndex = 0;
    this.currentItemIndex = 0;
    this.isUsingSkill = false;
    this.isAttacking = false;
    this.isAttackingWeak = false;
    this.isAttackingStrong = false;
    this.isRolling = false;
    this.isGuarding = false;

    this.isJumping = false;
    this.isBackStepping = false;
    this.isDashing = false;

    this.lockedTarget = null;

    this.attackBuffMultiplier = 1.0;
    this.defenseBuffMultiplier = 1.0;

    this.spawn();

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
    const spawnPoint = this.data.initialSpawnPoint || {
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

    if (
      !this.isDashing &&
      !this.isGuarding &&
      !this.isAttacking &&
      !this.isRolling &&
      !this.isBackStepping &&
      !this.isPickingUp
    ) {
      this.stamina += this.data.staminaRegenRate * deltaTime;
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

    if (
      this.isAttacking ||
      this.isAttackingWeak ||
      this.isAttackingStrong ||
      this.isRolling ||
      this.isBackStepping ||
      this.isPickingUp ||
      this.isUsingSkill
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

    // Do not re-execute the same animation
    if (this.currentAnimationName !== newAnimation) {
      this.playAnimation(newAnimation);
    }
  }

  onDeath() {
    this.game.playSound(AssetPaths.SFX_DEATH);
    this.game.hud.showDeathScreen();
    setTimeout(() => this.respawn(), this.data.respawnDelay);
  }

  takeDamage(amount) {
    if (this.isInvincible || this.isRolling) return;

    let finalDamage = amount / this.defenseBuffMultiplier;

    if (this.isGuarding) {
      const shieldDefense = this.getShieldDefense();
      const blockPercentage = Math.min(0.8, shieldDefense / 100);
      finalDamage = finalDamage * (1 - blockPercentage);

      const staminaDamage = amount * 0.3;
      this.takeStaminaDamage(staminaDamage);

      this.game.playSound(
        this.game.assetLoader.getAudio(AssetPaths.SFX_GUARD_SUCCESS)
          ? AssetPaths.SFX_GUARD_SUCCESS
          : AssetPaths.SFX_DAMAGE
      );
    } else {
      this.game.playSound(AssetPaths.SFX_DAMAGE);
      if (this.game.hud) {
        this.game.hud.showHpDamageEffect();
      }
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
    this.totalExperience += amount;
    this.experience += amount;
    if (this.experience >= this.experienceToNextLevel) {
      this.levelUp();
    }
  }

  levelUp() {
    this.level++;
    // Reset current level experience and carry over excess to next level
    this.experience -= this.experienceToNextLevel;
    // Increase experience needed for next level
    this.experienceToNextLevel = Math.floor(
      this.experienceToNextLevel * this.data.levelUpExpMultiplier
    );
    this.statusPoints += this.data.statusPointsPerLevel;
    this.game.playSound(AssetPaths.SFX_LEVEL_UP);

    // Check for consecutive level-ups
    if (this.experience >= this.experienceToNextLevel) {
      this.levelUp();
    }
  }

  getCurrentShield() {
    if (this.shields.length === 0) return null;
    const shieldId = this.shields[this.currentShieldIndex];
    return this.game.data.shields[shieldId];
  }

  switchShield() {
    if (this.shields.length > 1) {
      this.currentShieldIndex =
        (this.currentShieldIndex + 1) % this.shields.length;
      this.game.playSound(AssetPaths.SFX_SWITCH_SHIELD);
    }
  }

  getShieldDefense() {
    const shield = this.getCurrentShield();
    return shield ? shield.defense : 0;
  }

  getCurrentSkill() {
    if (this.skills.length === 0) return null;
    const skillId = this.skills[this.currentSkillIndex];
    return this.game.data.skills[skillId];
  }

  switchSkill() {
    if (this.skills.length > 1) {
      this.currentSkillIndex =
        (this.currentSkillIndex + 1) % this.skills.length;
      this.game.playSound(AssetPaths.SFX_SWITCH_SKILL);
    }
  }

  getCurrentWeapon() {
    if (this.weapons.length === 0) return null;
    const weaponId = this.weapons[this.currentWeaponIndex];
    return this.game.data.weapons[weaponId];
  }

  switchWeapon() {
    if (this.weapons.length > 1) {
      this.currentWeaponIndex =
        (this.currentWeaponIndex + 1) % this.weapons.length;
      this.game.playSound(AssetPaths.SFX_SWITCH_WEAPON);
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
      this.game.playSound(AssetPaths.SFX_SWITCH_ITEM);
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

    let itemUsed = false;

    if (itemData.healAmount) {
      this.hp += itemData.healAmount || 50;
      if (this.hp > this.maxHp) this.hp = this.maxHp;
      itemUsed = true;
    }

    if (itemData.fpHealAmount) {
      this.fp += itemData.fpHealAmount;
      if (this.fp > this.maxFp) this.fp = this.maxFp;
      itemUsed = true;
    }

    if (itemUsed) {
      this.playAnimation(AnimationNames.USE_ITEM);
      this.game.playSound(AssetPaths.SFX_USE_ITEM);

      this.inventory.splice(this.currentItemIndex, 1);

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

    if (this.fp < currentSkill.fpCost) {
      this.game.playSound(AssetPaths.SFX_FP_INSUFFICIENT);
      if (this.game.hud) {
        this.game.hud.showFpInsufficientEffect();
      }
      return false;
    }

    const skillType = currentSkill.type;

    this.fp -= currentSkill.fpCost;

    if (this.game.hud) {
      this.game.hud.showFpUseEffect();
    }

    // Player-specific skill execution (FP-based, by type)
    this.isUsingSkill = true;

    if (skillType === SkillTypes.BUFF) {
      this.executeBuffSkill(this.skills[this.currentSkillIndex]);
    } else if (skillType === SkillTypes.PROJECTILE) {
      this.executeProjectileSkill(this.skills[this.currentSkillIndex]);
    } else if (skillType === SkillTypes.AREA_ATTACK) {
      this.executeAreaAttackSkill(this.skills[this.currentSkillIndex]);
    }

    // Set appropriate animation duration for each skill type
    let skillAnimationDuration;
    if (skillType === SkillTypes.BUFF) {
      // Buff skills have shorter animation duration
      skillAnimationDuration = (currentSkill.castTime || 0) + 1000;
    } else {
      // Other skills use the standard duration
      skillAnimationDuration = Math.max(
        (currentSkill.castTime || 0) + 1000,
        currentSkill.duration || 1000
      );
    }

    setTimeout(() => {
      this.isUsingSkill = false;
    }, skillAnimationDuration);

    return true;
  }

  // Player-specific buff skill (with effects and sound)
  executeBuffSkill(skillId) {
    const skillData = this.game.data.skills[skillId];
    if (!skillData) return;

    super.executeBuffSkill(skillId);

    setTimeout(() => {
      this.game.playSound(AssetPaths.SFX_USE_SKILL_BUFF);
      this.showSkillBuffEffect();
    }, skillData.castTime || 0);
  }

  // Player-specific projectile skill (with sound effects)
  executeProjectileSkill(skillId) {
    const skillData = this.game.data.skills[skillId];
    if (!skillData) return;

    super.executeProjectileSkill(skillId);

    setTimeout(() => {
      if (!this.isDead) {
        this.game.playSound(AssetPaths.SFX_USE_SKILL_PROJECTILE);
        this.showSkillProjectileEffect();
      }
    }, skillData.castTime || 0);
  }

  // Player-specific area attack skill (with sound effects)
  executeAreaAttackSkill(skillId) {
    const skillData = this.game.data.skills[skillId];
    if (!skillData) return;

    super.executeAreaAttackSkill(skillId);

    setTimeout(() => {
      if (!this.isDead) {
        this.game.playSound(AssetPaths.SFX_USE_SKILL_AREA_ATTACK);
      }
    }, skillData.castTime || 0);
  }

  // Get movement information (Player-specific complex state checks)
  getMovementInfo() {
    // Check for movement-disabled states
    if (
      this.isDead ||
      this.isJumping ||
      this.isRolling ||
      this.isBackStepping ||
      this.isAttacking ||
      this.isPickingUp
    ) {
      return { shouldPlay: false, state: null };
    }

    const velocity = this.physics.velocity;
    if (!velocity) {
      return { shouldPlay: false, state: null };
    }

    const isMoving = velocity.length() > 0.1;
    if (!isMoving) {
      return { shouldPlay: false, state: null };
    }

    // Determine movement state
    const state = this.isDashing ? MovementState.DASH : MovementState.WALK;
    return { shouldPlay: true, state: state };
  }

  playPickUpAnimation() {
    if (this.isPickingUp || this.isDead) {
      return;
    }

    this.isPickingUp = true;
    this.playAnimation(AnimationNames.PICK_UP);

    this.game.playSound(AssetPaths.SFX_PICKUP_ITEM);
  }
}
