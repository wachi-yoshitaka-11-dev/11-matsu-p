import * as THREE from 'three';
import { Character } from './character.js';
import { Projectile } from '../skills/projectile.js';
import { AreaAttack } from '../skills/area-attack.js';
import {
  AnimationNames,
  SkillTypes,
  AssetPaths,
  MovementState,
} from '../../utils/constants.js';

export class Player extends Character {
  constructor(game, playerType, options = {}) {
    const playerData = game.data[playerType];
    if (!playerData) {
      throw new Error(`Player type "${playerType}" not found in game data`);
    }
    const modelName = playerData.model.replace('.glb', '');
    const loadedModel = game.assetLoader.getModel(modelName);

    if (loadedModel instanceof THREE.Group) {
      super(game, playerType, playerData, loadedModel, null, {
        hp: playerData.maxHp,
        modelName: modelName,
        textureName: playerData.texture.replace('.png', ''),
      });
    } else {
      const geometry = new THREE.BoxGeometry(0.5, 1.0, 0.5);
      const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
      super(game, playerType, playerData, geometry, material, {
        hp: playerData.maxHp,
      });
    }

    this.maxFp = playerData.maxFp;
    this.fp = this.maxFp;
    this.maxStamina = playerData.maxStamina;
    this.stamina = this.maxStamina;

    this.level = playerData.initialLevel;
    this.experience = playerData.initialExperience;
    this.experienceToNextLevel = playerData.initialExpToNextLevel;
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

    this.footstepAudio = null;
    this.isPlayingFootsteps = false;
    this.lastMovementState = null;

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
    this.updateFootsteps();

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
    this.game.playSound(AssetPaths.SFX_DEATH);
    this.game.hud.showDeathScreen();
    setTimeout(() => this.respawn(), this.data.respawnDelay);
  }

  takeDamage(amount) {
    if (this.isInvincible) return;

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
      this.experienceToNextLevel * this.data.levelUpExpMultiplier
    );
    this.statusPoints += this.data.statusPointsPerLevel;
    this.game.playSound(AssetPaths.SFX_LEVEL_UP);
  }

  useItem(index) {
    if (this.inventory.length > index) {
      const itemType = this.inventory[index];
      const itemData = this.game.data.items[itemType];

      if (!itemData) {
        console.warn(`Unknown item type: ${itemType}`);
        return;
      }

      if (itemData.healAmount) {
        this.hp += itemData.healAmount;
        if (this.hp > this.maxHp) this.hp = this.maxHp;
      }

      if (itemData.fpHealAmount) {
        this.fp += itemData.fpHealAmount;
        if (this.fp > this.maxFp) this.fp = this.maxFp;
      }
      this.playAnimation(AnimationNames.USE_ITEM);
      this.game.playSound(AssetPaths.SFX_USE_ITEM);

      this.inventory.splice(index, 1);
    }
  }

  applyAttackBuff() {
    const currentSkill = this.getCurrentSkill();
    this.attackBuffMultiplier = currentSkill.attackBuffMultiplier;
  }

  removeAttackBuff() {
    this.attackBuffMultiplier = 1.0;
  }

  applyDefenseBuff() {
    const currentSkill = this.getCurrentSkill();
    this.defenseBuffMultiplier = currentSkill.defenseBuffMultiplier;
  }

  removeDefenseBuff() {
    this.defenseBuffMultiplier = 1.0;
  }

  getCurrentShield() {
    if (this.shields.length === 0) return null;
    const shieldType = this.shields[this.currentShieldIndex];
    return this.game.data.shields[shieldType];
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
    const skillType = this.skills[this.currentSkillIndex];
    return this.game.data.skills[skillType];
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
    const weaponType = this.weapons[this.currentWeaponIndex];
    return this.game.data.weapons[weaponType];
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
      return false;
    }

    const skillType = this.skills[this.currentSkillIndex];

    if (skillType === SkillTypes.BUFF) {
      return this.useBuffSkill(currentSkill);
    } else if (skillType === SkillTypes.PROJECTILE) {
      return this.useProjectileSkill(currentSkill);
    } else if (skillType === SkillTypes.AREA_ATTACK) {
      return this.useAreaAttackSkill(currentSkill);
    }

    return false;
  }

  useProjectileSkill(skillData) {
    this.isUsingSkill = true;
    this.fp -= skillData.fpCost;
    this.showSkillProjectileEffect();
    this.playAnimation(AnimationNames.USE_SKILL_PROJECTILE);
    this.game.playSound(AssetPaths.SFX_USE_SKILL_PROJECTILE);

    const direction = new THREE.Vector3();
    this.mesh.getWorldDirection(direction);
    const skillType = this.skills[this.currentSkillIndex];

    // 胸の高さ（Y座標+1.5）から前方（direction方向に0.5）に発射位置を設定
    const startPosition = this.mesh.position.clone();
    startPosition.y += 1.5; // 胸の高さ
    startPosition.add(direction.clone().multiplyScalar(0.5)); // 前方に少し出す

    const projectile = new Projectile(
      this.game,
      skillType,
      startPosition,
      direction
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
    this.game.playSound(AssetPaths.SFX_USE_SKILL_BUFF);
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

  useAreaAttackSkill(skillData) {
    this.isUsingSkill = true;
    this.fp -= skillData.fpCost;
    this.playAnimation(AnimationNames.USE_SKILL_AREA_ATTACK);
    this.game.playSound(AssetPaths.SFX_USE_SKILL_AREA_ATTACK);

    // AreaAttackオブジェクトを作成
    const skillType = this.skills[this.currentSkillIndex];
    const areaAttack = new AreaAttack(
      this.game,
      skillType,
      this.mesh.position.clone()
    );

    // ゲームの範囲攻撃配列に追加（projectilesと同様の管理）
    if (!this.game.areaAttacks) {
      this.game.areaAttacks = [];
    }
    this.game.areaAttacks.push(areaAttack);
    this.game.sceneManager.add(areaAttack.mesh);

    setTimeout(() => {
      this.isUsingSkill = false;
    }, skillData.duration);

    return true;
  }

  updateFootsteps() {
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

    const currentMovementState = this.isDashing
      ? MovementState.DASH
      : MovementState.WALK;

    if (currentMovementState !== this.lastMovementState) {
      this.stopFootsteps();
      this.startFootsteps(currentMovementState);
      this.lastMovementState = currentMovementState;
    }

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
        ? AssetPaths.SFX_DASH
        : AssetPaths.SFX_WALK;

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

    this.game.playSound(AssetPaths.SFX_PICKUP_ITEM);
  }
}
