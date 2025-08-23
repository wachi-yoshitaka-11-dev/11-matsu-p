// External libraries
import * as THREE from 'three';

// Utils
import {
  AnimationNames,
  AssetPaths,
  AudioConstants,
  BuffDebuffCategories,
  DebuffTypes,
  EffectColors,
  Fall,
  MovementState,
  ONE_SHOT_ANIMATIONS,
  SkillTypes,
} from '../../utils/constants.js';

// Core
import { PhysicsComponent } from '../../core/components/physics-component.js';

// Entities
import { BaseEntity } from '../base-entity.js';
import { AreaAttack } from '../skills/area-attack.js';
import { Projectile } from '../skills/projectile.js';
import { SelfTarget } from '../skills/self-target.js';

export class Character extends BaseEntity {
  constructor(game, id, data, geometryOrModel, material, options = {}) {
    super(game, id, data, geometryOrModel, material, options);

    if (geometryOrModel instanceof THREE.Group) {
      this.mixer = new THREE.AnimationMixer(this.mesh);
      this.animations = game.assetLoader.getAnimations(options.modelName);
      if (this.animations && this.animations.length > 0) {
        this.playAnimation(AnimationNames.IDLE);
      }
    }
    this.currentAnimationName = null;

    this.physics = new PhysicsComponent(this.mesh, this.game);

    const defaults = {
      hp: 100,
      speed: 2,
    };

    this.maxHp = options.hp ?? defaults.hp;
    this.hp = this.maxHp;
    this.speed = options.speed ?? defaults.speed;
    this.isDead = false;

    // Initialize buff multipliers
    this.attackBuffMultiplier = 1.0;
    this.defenseBuffMultiplier = 1.0;
    this.speedBuffMultiplier = 1.0;

    // Initialize debuff multipliers
    this.attackDebuffMultiplier = 1.0;
    this.defenseDebuffMultiplier = 1.0;
    this.speedDebuffMultiplier = 1.0;

    this.originalColors = new Map();
    this.effectTimeout = null;

    // Skill performance states (common to all characters)
    this.skillPerformanceStates = {};

    // Footstep audio properties (common to all characters)
    this.footstepAudio = null;
    this.isPlayingFootsteps = false;
    this.lastMovementState = null;

    this.mesh.traverse((object) => {
      if (object.isMesh && object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach((mat, index) => {
            if (mat.color) {
              this.originalColors.set(
                `${object.uuid}-${index}`,
                mat.color.clone()
              );
            }
          });
        } else if (object.material.color) {
          this.originalColors.set(object.uuid, object.material.color.clone());
        }
      }
    });
    // Initialize buff and debuff systems
    this.initializeBuffSystem();
    this.initializeDebuffSystem();
  }

  // Initialize buff system
  initializeBuffSystem() {
    this.activeBuffs = new Map();
    this.buffTimers = new Map();
  }

  // Initialize debuff system
  initializeDebuffSystem() {
    this.activeDebuffs = new Map();
    this.debuffTimers = new Map();
  }

  // Update buff and debuff properties
  updateBuffsAndDebuffs(deltaTime) {
    // Process debuff properties
    this.activeDebuffs.forEach((debuff, id) => {
      if (debuff.type === DebuffTypes.POISON) {
        debuff.tickTimer -= deltaTime;
        if (debuff.tickTimer <= 0) {
          this.takeDamage(debuff.damagePerTick);
          debuff.tickTimer = debuff.tickInterval;

          // Show poison-specific HP effect (player only)
          if (this === this.game.player && this.game.hud) {
            this.game.hud.showHpPoisonEffect();
          }
        }
      }
    });

    // Manage buff duration
    const buffEntries = Array.from(this.buffTimers.entries());
    buffEntries.forEach(([id, endTime]) => {
      if (Date.now() >= endTime) {
        this.removeBuff(id);
        // Update HUD immediately after removing a buff
        if (this === this.game.player && this.game.hud) {
          this.game.hud.updateBuffsAndDebuffsDisplay(
            this.getActiveBuffsAndDebuffs()
          );
        }
      }
    });

    // Manage debuff duration
    const debuffEntries = Array.from(this.debuffTimers.entries());
    debuffEntries.forEach(([id, endTime]) => {
      if (Date.now() >= endTime) {
        this.removeDebuff(id);
        // Update HUD immediately after removing a debuff
        if (this === this.game.player && this.game.hud) {
          this.game.hud.updateBuffsAndDebuffsDisplay(
            this.getActiveBuffsAndDebuffs()
          );
        }
      }
    });
  }

  // Apply buff effect
  applyBuff(config) {
    // Remove existing buff of the same type first
    const existingIds = [];
    this.activeBuffs.forEach((buff, id) => {
      if (buff.type === config.type) {
        existingIds.push(id);
      }
    });
    existingIds.forEach((id) => {
      this.removeBuff(id);
    });

    // Generate a unique ID with safe fallback
    const genId = () =>
      globalThis.crypto?.randomUUID?.() ??
      `id_${Math.random().toString(36).slice(2)}_${Date.now()}`;
    const id = `${BuffDebuffCategories.BUFF}_${genId()}`;
    const endTime = Date.now() + config.duration;

    this.activeBuffs.set(id, {
      type: config.type,
      duration: config.duration,
      ...config,
    });

    // Apply buff properties
    if (config.attackBuffMultiplier) {
      this.attackBuffMultiplier =
        (this.attackBuffMultiplier || 1.0) * config.attackBuffMultiplier;
    }
    if (config.defenseBuffMultiplier) {
      this.defenseBuffMultiplier =
        (this.defenseBuffMultiplier || 1.0) * config.defenseBuffMultiplier;
    }
    if (config.speedBuffMultiplier) {
      this.speedBuffMultiplier =
        (this.speedBuffMultiplier || 1.0) * config.speedBuffMultiplier;
    }

    this.buffTimers.set(id, endTime);

    // Update HUD display for player
    if (this === this.game.player && this.game.hud) {
      const allBuffsAndDebuffs = this.getActiveBuffsAndDebuffs();
      this.game.hud.updateBuffsAndDebuffsDisplay(allBuffsAndDebuffs);
    }

    return id;
  }

  // Apply debuff effect
  applyDebuff(config) {
    // Check if poison debuff already exists
    if (config.type === DebuffTypes.POISON) {
      const existingPoison = Array.from(this.activeDebuffs.values()).find(
        (debuff) => debuff.type === DebuffTypes.POISON
      );
      if (existingPoison) {
        return null; // Don't apply duplicate poison
      }
    }

    // Generate a unique ID with safe fallback
    const genId = () =>
      globalThis.crypto?.randomUUID?.() ??
      `id_${Math.random().toString(36).slice(2)}_${Date.now()}`;
    const id = `${BuffDebuffCategories.DEBUFF}_${genId()}`;
    const endTime = Date.now() + config.duration;

    const debuffData = {
      type: config.type,
      duration: config.duration,
      ...config,
    };

    if (config.type === DebuffTypes.POISON) {
      debuffData.tickTimer = config.tickInterval / 1000; // Convert milliseconds to seconds
      debuffData.tickInterval = config.tickInterval / 1000; // Store as seconds for consistency
    }

    // Apply debuff properties
    if (config.attackDebuffMultiplier) {
      this.attackDebuffMultiplier =
        (this.attackDebuffMultiplier || 1.0) * config.attackDebuffMultiplier;
    }
    if (config.defenseDebuffMultiplier) {
      this.defenseDebuffMultiplier =
        (this.defenseDebuffMultiplier || 1.0) * config.defenseDebuffMultiplier;
    }
    if (config.speedDebuffMultiplier) {
      this.speedDebuffMultiplier =
        (this.speedDebuffMultiplier || 1.0) * config.speedDebuffMultiplier;
    }

    this.activeDebuffs.set(id, debuffData);
    this.debuffTimers.set(id, endTime);

    // Update HUD display for player
    if (this === this.game.player && this.game.hud) {
      const allBuffsAndDebuffs = this.getActiveBuffsAndDebuffs();
      this.game.hud.updateBuffsAndDebuffsDisplay(allBuffsAndDebuffs);
    }

    return id;
  }

  // Remove buff effect
  removeBuff(id) {
    const buff = this.activeBuffs.get(id);
    if (buff) {
      // Remove buff properties
      if (buff.attackBuffMultiplier) {
        this.attackBuffMultiplier =
          (this.attackBuffMultiplier || 1.0) / buff.attackBuffMultiplier;
      }
      if (buff.defenseBuffMultiplier) {
        this.defenseBuffMultiplier =
          (this.defenseBuffMultiplier || 1.0) / buff.defenseBuffMultiplier;
      }
      if (buff.speedBuffMultiplier) {
        this.speedBuffMultiplier =
          (this.speedBuffMultiplier || 1.0) / buff.speedBuffMultiplier;
      }
      this.activeBuffs.delete(id);
    }
    this.buffTimers.delete(id);
  }

  // Remove debuff effect
  removeDebuff(id) {
    const debuff = this.activeDebuffs.get(id);
    if (debuff) {
      // Remove debuff properties
      if (debuff.attackDebuffMultiplier) {
        this.attackDebuffMultiplier =
          (this.attackDebuffMultiplier || 1.0) / debuff.attackDebuffMultiplier;
      }
      if (debuff.defenseDebuffMultiplier) {
        this.defenseDebuffMultiplier =
          (this.defenseDebuffMultiplier || 1.0) /
          debuff.defenseDebuffMultiplier;
      }
      if (debuff.speedDebuffMultiplier) {
        this.speedDebuffMultiplier =
          (this.speedDebuffMultiplier || 1.0) / debuff.speedDebuffMultiplier;
      }
      this.activeDebuffs.delete(id);
    }
    this.debuffTimers.delete(id);
  }

  // Get movement speed with buff/debuff properties
  getMovementSpeed() {
    let speedMultiplier = 1.0;

    // Apply debuff properties (reduce speed)
    this.activeDebuffs.forEach((debuff) => {
      if (
        debuff.type === DebuffTypes.SPEED_REDUCTION &&
        debuff.speedMultiplier
      ) {
        speedMultiplier *= debuff.speedMultiplier;
      }
    });

    // Apply buff properties (increase speed)
    this.activeBuffs.forEach((buff) => {
      if (buff.speedBuffMultiplier) {
        speedMultiplier *= buff.speedBuffMultiplier;
      }
    });

    return speedMultiplier;
  }

  // Get active buffs and debuffs list for display
  getActiveBuffsAndDebuffs() {
    const result = [];

    this.activeBuffs.forEach((buff, id) => {
      const endTime = this.buffTimers.get(id);
      result.push({
        id,
        category: BuffDebuffCategories.BUFF,
        type: buff.type,
        remainingTime: Math.max(0, endTime - Date.now()),
      });
    });

    this.activeDebuffs.forEach((debuff, id) => {
      const endTime = this.debuffTimers.get(id);
      result.push({
        id,
        category: BuffDebuffCategories.DEBUFF,
        type: debuff.type,
        remainingTime: Math.max(0, endTime - Date.now()),
      });
    });

    return result;
  }

  clearEffectTimeout() {
    if (this.effectTimeout) {
      clearTimeout(this.effectTimeout);
      this.effectTimeout = null;
    }
  }

  _setMeshColor(color) {
    this.mesh.traverse((object) => {
      if (object.isMesh && object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach((mat, index) => {
            const key = `${object.uuid}-${index}`;
            if (mat.color) {
              if (!this.originalColors.has(key)) {
                this.originalColors.set(key, mat.color.clone());
              }
              mat.color.set(color);
            }
          });
        } else if (object.material.color) {
          if (!this.originalColors.has(object.uuid)) {
            this.originalColors.set(object.uuid, object.material.color.clone());
          }
          object.material.color.set(color);
        }
      }
    });
  }

  _resetMeshColor() {
    this.mesh.traverse((object) => {
      if (object.isMesh && object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach((mat, index) => {
            const originalColor = this.originalColors.get(
              `${object.uuid}-${index}`
            );
            if (mat.color && originalColor) {
              mat.color.copy(originalColor);
            }
          });
        } else if (object.material && object.material.color) {
          const originalColor = this.originalColors.get(object.uuid);
          if (originalColor) {
            object.material.color.copy(originalColor);
          }
        }
      }
    });
  }

  showDamageEffect() {
    this.clearEffectTimeout();
    this._setMeshColor(EffectColors.DAMAGE);
    this._startEffectTimeout(100);
  }

  showAttackEffect() {
    this.clearEffectTimeout();
    this._setMeshColor(EffectColors.ATTACK);
    this._startEffectTimeout(150);
  }

  showSkillProjectileEffect() {
    this.clearEffectTimeout();
    this._setMeshColor(EffectColors.SKILL_PROJECTILE);
    this._startEffectTimeout(100);
  }

  showSkillBuffEffect() {
    this.clearEffectTimeout();
    this._setMeshColor(EffectColors.SKILL_BUFF);
    this._startEffectTimeout(100);
  }

  showItemUseEffect() {
    this.clearEffectTimeout();
    this._setMeshColor(EffectColors.ITEM_USE);
    this._startEffectTimeout(200);
  }

  _startEffectTimeout(duration) {
    this.clearEffectTimeout();
    this.effectTimeout = setTimeout(() => {
      this._resetMeshColor();
    }, duration);
  }

  playAnimation(name) {
    if (!this.mixer || !this.animations || this.currentAnimationName === name)
      return;

    const clip = THREE.AnimationClip.findByName(this.animations, name);
    if (clip) {
      const newAction = this.mixer.clipAction(clip);

      const isOneShot = ONE_SHOT_ANIMATIONS.includes(name);
      if (isOneShot) {
        newAction.setLoop(THREE.LoopOnce);
        newAction.clampWhenFinished = true;

        // For one-shot animations, stop current action immediately and start new one
        if (this.currentAction) {
          this.currentAction.stop();
        }
        newAction.reset().play();
      } else {
        newAction.setLoop(THREE.LoopRepeat);

        // For looping animations, use fade transition
        if (this.currentAction) {
          this.currentAction.fadeOut(0.2);
        }
        newAction.reset().fadeIn(0.2).play();
      }

      this.currentAction = newAction;
      this.currentAnimationName = name;
    } else {
      console.warn(
        `${this.constructor.name} animation clip not found for:`,
        name
      );
    }
  }

  // Deal damage with attack buffs applied
  dealDamage(target, baseAmount) {
    if (!target || target.isDead) {
      return;
    }

    // Apply attack buff and debuff multipliers
    const finalDamage =
      baseAmount *
      (this.attackBuffMultiplier || 1) *
      (this.attackDebuffMultiplier || 1);
    target.takeDamage(finalDamage);
  }

  takeDamage(amount) {
    if (this.isDead) {
      return;
    }

    // Apply defense buff and debuff multipliers
    const finalAmount =
      (amount / (this.defenseBuffMultiplier || 1)) *
      (this.defenseDebuffMultiplier || 1);

    this.hp -= finalAmount;
    this.showDamageEffect();
    this.game.playSFX(AssetPaths.SFX_DAMAGE);

    if (this.hp <= 0) {
      this.hp = 0;
      this.isDead = true;
      this.onDeath();
    }
  }

  onDeath() {}

  update(deltaTime) {
    this.physics.update(deltaTime);
    this.updateBuffsAndDebuffs(deltaTime);

    if (this.mixer) {
      this.mixer.update(deltaTime);
    }

    if (this.isDead) {
      this.stopFootsteps();
      return;
    }

    if (this.mesh.position.y < Fall.FALL_DEATH_THRESHOLD) {
      this.hp = 0;
      this.isDead = true;
      this.onDeath();
    }

    this.updateFootsteps();
  }

  getForwardDirection() {
    const direction = new THREE.Vector3(0, 0, 1).applyQuaternion(
      this.mesh.quaternion
    );
    // Ignore Y-axis, horizontal direction only
    direction.y = 0;
    direction.normalize();
    return direction;
  }

  startFootsteps(movementState) {
    if (this.isPlayingFootsteps) {
      this.stopFootsteps();
    }

    const soundName =
      movementState === MovementState.DASH
        ? AssetPaths.SFX_DASH
        : AssetPaths.SFX_WALK;

    const volume = this.calculateFootstepVolume();

    this.footstepAudio = this.game.createFootstepAudio(soundName, volume);

    if (this.footstepAudio) {
      this.footstepAudio.play();
    }

    this.isPlayingFootsteps = true;
  }

  calculateFootstepVolume() {
    if (this === this.game.player) {
      return AudioConstants.PLAYER_FOOTSTEP_VOLUME;
    }

    const distance = this.mesh.position.distanceTo(
      this.game.player.mesh.position
    );

    if (distance >= AudioConstants.FOOTSTEP_MAX_AUDIBLE_DISTANCE) {
      return 0;
    }

    // Calculate volume using linear interpolation (closer = louder)
    const volumeRatio =
      1 - distance / AudioConstants.FOOTSTEP_MAX_AUDIBLE_DISTANCE;
    const volume =
      AudioConstants.FOOTSTEP_MIN_VOLUME +
      (AudioConstants.FOOTSTEP_MAX_VOLUME -
        AudioConstants.FOOTSTEP_MIN_VOLUME) *
        volumeRatio;

    return Math.max(
      AudioConstants.FOOTSTEP_MIN_VOLUME,
      Math.min(AudioConstants.FOOTSTEP_MAX_VOLUME, volume)
    );
  }

  stopFootsteps() {
    if (this.footstepAudio) {
      this.footstepAudio.stop();
      this.footstepAudio = null;
    }
    this.isPlayingFootsteps = false;
    this.lastMovementState = null;
  }

  updateFootsteps() {
    const movementInfo = this.getMovementInfo();

    if (!movementInfo.shouldPlay) {
      this.stopFootsteps();
      return;
    }

    if (movementInfo.state !== this.lastMovementState) {
      this.stopFootsteps();
      this.startFootsteps(movementInfo.state);
      this.lastMovementState = movementInfo.state;
    }

    if (!this.isPlayingFootsteps) {
      this.startFootsteps(movementInfo.state);
    }

    this.updateFootstepVolume();
  }

  updateFootstepVolume() {
    if (this.footstepAudio && this.isPlayingFootsteps) {
      const newVolume = this.calculateFootstepVolume();

      if (newVolume === 0) {
        this.stopFootsteps();
        return;
      }

      this.footstepAudio.setVolume(newVolume);
    }
  }

  // Get movement information (override in subclasses)
  getMovementInfo() {
    // Default implementation: not moving
    return { shouldPlay: false, state: null };
  }

  createProjectile(skillId) {
    const startPosition = this.mesh.position.clone();
    startPosition.y += 1.5;

    const projectileDirection = this.getForwardDirection();
    startPosition.add(projectileDirection.clone().multiplyScalar(0.5));

    const projectile = new Projectile(
      this.game,
      skillId,
      startPosition,
      projectileDirection,
      this
    );

    this.game.entities.skills.projectiles.push(projectile);
    this.game.sceneManager.add(projectile.mesh);
    return projectile;
  }

  createAreaAttack(skillId) {
    // Get character's forward direction
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(this.mesh.quaternion);

    const areaAttack = new AreaAttack(
      this.game,
      skillId,
      this.mesh.position.clone(),
      direction,
      this
    );

    if (!this.game.entities.skills.areaAttacks) {
      this.game.entities.skills.areaAttacks = [];
    }
    this.game.entities.skills.areaAttacks.push(areaAttack);
    this.game.sceneManager.add(areaAttack.mesh);
    return areaAttack;
  }

  createSelfTargetSkill(skillId) {
    // Self-targeted skills (healing, enhancement, self-harm)
    const selfTarget = new SelfTarget(
      this.game,
      skillId,
      this // caster (self)
    );

    if (!this.game.entities.skills.selfTargets) {
      this.game.entities.skills.selfTargets = [];
    }
    this.game.entities.skills.selfTargets.push(selfTarget);
    this.game.sceneManager.add(selfTarget.mesh);
    return selfTarget;
  }

  executeSelfTargetSkill(skillId) {
    const skillData = this.game.data.skills[skillId];
    if (!skillData) return;

    this.playAnimation(this.getSkillAnimation(SkillTypes.SELF_TARGET));

    setTimeout(() => {
      if (!this.isDead) {
        // Create self-target effect and apply buff
        this.createSelfTargetSkill(skillId);
      }
    }, skillData.castTime || 0);
  }

  executeProjectileSkill(skillId) {
    const skillData = this.game.data.skills[skillId];
    if (!skillData) return;

    this.playAnimation(this.getSkillAnimation(SkillTypes.PROJECTILE));

    setTimeout(() => {
      if (!this.isDead) {
        this.createProjectile(skillId);
      }
    }, skillData.castTime || 200);
  }

  executeAreaAttackSkill(skillId) {
    const skillData = this.game.data.skills[skillId];
    if (!skillData) return;

    this.playAnimation(this.getSkillAnimation(SkillTypes.AREA_ATTACK));

    setTimeout(() => {
      if (!this.isDead) {
        this.createAreaAttack(skillId);
      }
    }, skillData.castTime || 200);
  }

  getSkillAnimation(skillType) {
    switch (skillType) {
      case SkillTypes.SELF_TARGET:
        return AnimationNames.USE_SKILL_BUFF;
      case SkillTypes.PROJECTILE:
        return AnimationNames.USE_SKILL_PROJECTILE;
      case SkillTypes.AREA_ATTACK:
        return AnimationNames.USE_SKILL_AREA_ATTACK;
      default:
        console.warn(
          `Unknown skill type: ${skillType}, falling back to idle animation`
        );
        return AnimationNames.IDLE;
    }
  }

  dispose() {
    super.dispose();
    this.clearEffectTimeout();
    this.physics = null;
    this.mixer = null;
    this.animations = null;
    this.originalColors.clear();
  }
}
