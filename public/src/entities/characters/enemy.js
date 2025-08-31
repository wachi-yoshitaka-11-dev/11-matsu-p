// External libraries
import * as THREE from 'three';

// Utils
import {
  AnimationNames,
  AssetPaths,
  AttackTypes,
  MovementState,
  SkillTypes,
} from '../../utils/constants.js';

// Entities
import { Character } from './character.js';

export class Enemy extends Character {
  constructor(game, enemyId, position, options = {}) {
    if (!position || position.x === undefined || position.z === undefined) {
      throw new Error('Valid position with x and z coordinates is required');
    }

    const enemyData = game.data.enemies[enemyId];
    if (!enemyData) {
      throw new Error(`Enemy ID "${enemyId}" not found in enemies data`);
    }
    const modelName = enemyData.model.replace('.glb', '');
    const model = game.assetLoader.getModel(modelName);
    if (model) {
      super(game, enemyId, enemyData, model.clone(), null, {
        hp: enemyData.hp,
        speed: enemyData.speed,
        modelName: modelName,
        textureName: enemyData.texture.replace('.png', ''),
      });
    } else {
      const geometry = new THREE.BoxGeometry(0.6, 1.2, 0.6);
      const material = new THREE.MeshStandardMaterial({ color: 0x0000ff });
      super(game, enemyId, enemyData, geometry, material, {
        hp: enemyData.hp,
        speed: enemyData.speed,
      });
    }

    // Player reference will be accessed via this.game.player when needed

    // Apply scale settings from enemy data
    if (
      enemyData.scale &&
      Array.isArray(enemyData.scale) &&
      enemyData.scale.length === 3
    ) {
      this.mesh.scale.set(
        enemyData.scale[0],
        enemyData.scale[1],
        enemyData.scale[2]
      );
      this.originalScale = [...enemyData.scale]; // Store original scale for calculations
    } else {
      this.originalScale = [1, 1, 1]; // Default scale
    }

    this.placeOnGround(position.x, position.z);

    this.weakAttackCooldown = 0;
    this.strongAttackCooldown = 0;
    this.experience = this.data.experience;
    this.nextAction = null;

    // Skill cooldown management (Enemy-specific)
    this.initializeSkillCooldowns();

    this.deathAnimationStartTime = null;
    this.deathAnimationDuration = 2000;
    this.readyForRemoval = false;

    if (this.mixer) {
      this.mixer.addEventListener('finished', (e) => {
        const clipName = e.action.getClip().name;
        if (clipName === AnimationNames.ATTACK_WEAK) {
          this.isPerformingWeakAttack = false;
        }
        if (clipName === AnimationNames.ATTACK_STRONG) {
          this.isPerformingStrongAttack = false;
        }
      });
    }
  }

  initializeSkillCooldowns() {
    this.skillCooldowns = {};

    if (this.data && this.data.skills) {
      for (const skillId of Object.keys(this.data.skills)) {
        this.skillCooldowns[skillId] = 0;
        this.skillPerformanceStates[skillId] = false;
      }
    }
  }

  update(deltaTime) {
    super.update(deltaTime);

    this.updateSkillCooldowns(deltaTime);

    if (this.isDead) {
      this.updateDeathAnimation();
      return;
    }

    if (this.isPerformingWeakAttack || this.isPerformingStrongAttack) {
      return;
    }

    this.updateAnimation();

    const distance = this.mesh.position.distanceTo(
      this.game.player.mesh.position
    );
    // Apply scale to attack ranges
    const scaleMultiplier = this.originalScale[0]; // Use X scale as base
    const minAttackRange = Math.min(
      this.data.weakAttack.range * scaleMultiplier,
      this.data.strongAttack.range * scaleMultiplier
    );

    if (distance > minAttackRange) {
      const direction = new THREE.Vector3()
        .subVectors(this.game.player.mesh.position, this.mesh.position)
        .normalize();
      this.mesh.position.x += direction.x * this.speed * deltaTime;
      this.mesh.position.z += direction.z * this.speed * deltaTime;
    }

    this.mesh.lookAt(this.game.player.mesh.position);

    this.weakAttackCooldown = Math.max(
      0,
      this.weakAttackCooldown - deltaTime * 1000
    );
    this.strongAttackCooldown = Math.max(
      0,
      this.strongAttackCooldown - deltaTime * 1000
    );

    this.chooseAndPerformAction(distance);
  }

  updateAnimation() {
    if (this.isPerformingWeakAttack || this.isPerformingStrongAttack) {
      return;
    }

    const movementInfo = this.getMovementInfo();
    if (movementInfo.shouldPlay && movementInfo.state === MovementState.WALK) {
      this.playAnimation(AnimationNames.WALK);
    } else {
      this.playAnimation(AnimationNames.IDLE);
    }
  }

  chooseAndPerformAction(distance) {
    // If the next action is not determined, decide based on probability
    if (this.nextAction === null) {
      this.selectNextAction();
    }

    this.executeSelectedAction(distance);
  }

  // Action selection logic (can be overridden in subclasses)
  selectNextAction() {
    const rand = Math.random();
    let cumulativeProbability = 0;

    // Dynamically process skill probability checks (including attacks, buffs, healing, etc.)
    if (this.data.skills) {
      for (const skillId of Object.keys(this.data.skills)) {
        const skillConfig = this.data.skills[skillId];
        if (skillConfig.probability) {
          cumulativeProbability += skillConfig.probability;
          if (rand < cumulativeProbability) {
            this.nextAction = skillId;
            return;
          }
        }
      }
    }

    cumulativeProbability += this.data.strongAttack.probability;
    if (rand < cumulativeProbability) {
      this.nextAction = AttackTypes.STRONG;
    } else {
      this.nextAction = AttackTypes.WEAK;
    }
  }

  // Execute the selected action (can be overridden in subclasses)
  executeSelectedAction(distance) {
    if (this.data.skills && this.data.skills[this.nextAction]) {
      if (this.canPerformSkill(this.nextAction, distance)) {
        if (this.performSkill(this.nextAction)) {
          this.nextAction = null;
        }
      } else {
        // Reset if skill cannot be executed and select a new action next time
        this.nextAction = null;
      }
    } else if (
      this.nextAction === AttackTypes.STRONG &&
      this.strongAttackCooldown <= 0 &&
      distance <= this.data.strongAttack.range * this.originalScale[0]
    ) {
      this.performStrongAttack();
      this.nextAction = null;
    } else if (
      this.nextAction === AttackTypes.WEAK &&
      this.weakAttackCooldown <= 0 &&
      distance <= this.data.weakAttack.range * this.originalScale[0]
    ) {
      this.performWeakAttack();
      this.nextAction = null;
    } else {
      // Reset if attack cannot be executed and select a new action next time
      this.nextAction = null;
    }
  }

  performWeakAttack() {
    this.isPerformingWeakAttack = true;
    this.weakAttackCooldown = this.data.weakAttack.cooldown;

    this.performAction(AnimationNames.ATTACK_WEAK, AssetPaths.SFX_ATTACK_WEAK);

    setTimeout(() => {
      this.dealDamageToPlayer(this.data.weakAttack.damage);
    }, this.data.weakAttack.castTime);
  }

  performStrongAttack() {
    this.isPerformingStrongAttack = true;
    this.strongAttackCooldown = this.data.strongAttack.cooldown;

    this.performAction(
      AnimationNames.ATTACK_STRONG,
      AssetPaths.SFX_ATTACK_STRONG
    );

    setTimeout(() => {
      this.dealDamageToPlayer(this.data.strongAttack.damage);
    }, this.data.strongAttack.castTime);
  }

  dealDamageToPlayer(damage) {
    // Guard direction check - player can only guard attacks from front
    const toEnemy = new THREE.Vector3()
      .subVectors(this.mesh.position, this.game.player.mesh.position)
      .normalize();
    const playerForward = this.game.player.getForwardDirection();
    const angle = toEnemy.angleTo(playerForward);

    const canGuard = angle < Math.PI / 2;

    // Pass damage and guard possibility to player
    this.game.player.takeDamage(damage, { canGuard });
  }

  updateDeathAnimation() {
    if (!this.deathAnimationStartTime) return;

    const elapsedTime = Date.now() - this.deathAnimationStartTime;
    const progress = Math.min(elapsedTime / this.deathAnimationDuration, 1);

    const opacity = 1 - progress;
    this.mesh.traverse((object) => {
      if (object.isMesh && object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach((mat) => {
            mat.transparent = true;
            mat.opacity = opacity;
          });
        } else {
          object.material.transparent = true;
          object.material.opacity = opacity;
        }
      }
    });

    if (progress >= 1) {
      this.readyForRemoval = true;
    }
  }

  onDeath() {
    this.playAnimation(AnimationNames.DIE);
    this.game.playSFX(AssetPaths.SFX_KILL);

    this.deathAnimationStartTime = Date.now();
  }

  updateSkillCooldowns(deltaTime) {
    for (const skillId of Object.keys(this.skillCooldowns)) {
      this.skillCooldowns[skillId] = Math.max(
        0,
        this.skillCooldowns[skillId] - deltaTime * 1000
      );
    }
  }

  canPerformSkill(skillId, distance = 0) {
    const skillData = this.game.data.skills[skillId];
    if (!skillData) return false;

    if (this.skillCooldowns[skillId] > 0) return false;

    if (this.skillPerformanceStates[skillId]) return false;

    if (skillData.range && distance > skillData.range * this.originalScale[0]) {
      return false;
    }

    return true;
  }

  performSkill(skillId) {
    if (
      !this.data.skills ||
      !this.data.skills[skillId] ||
      !this.game.data.skills[skillId]
    ) {
      return false;
    }

    if (!this.canPerformSkill(skillId)) {
      return false;
    }

    this.skillPerformanceStates[skillId] = true;
    this.skillCooldowns[skillId] = this.data.skills[skillId].cooldown;

    const skillData = this.game.data.skills[skillId];
    const skillType = skillData.type;

    switch (skillType) {
      case SkillTypes.SELF_TARGET:
        this.executeSelfTargetSkill(skillId);
        break;
      case SkillTypes.PROJECTILE:
        this.executeProjectileSkill(skillId);
        break;
      case SkillTypes.AREA_ATTACK:
        this.executeAreaAttackSkill(skillId);
        break;
      default:
        console.warn(
          `Unknown skill type: ${skillType} for skill ID: ${skillId}`
        );
        this.skillPerformanceStates[skillId] = false;
        return false;
    }

    return true;
  }

  // Enemy version of skill execution (with state management)
  executeSelfTargetSkill(skillId) {
    super.executeSelfTargetSkill(skillId);
    this.scheduleSkillStateReset(skillId, 500);
  }

  executeProjectileSkill(skillId) {
    super.executeProjectileSkill(skillId);
    this.scheduleSkillStateReset(skillId, 500);
  }

  executeAreaAttackSkill(skillId) {
    super.executeAreaAttackSkill(skillId);
    this.scheduleSkillStateReset(skillId, 500);
  }

  scheduleSkillStateReset(skillId, delay) {
    setTimeout(() => {
      this.skillPerformanceStates[skillId] = false;
    }, delay);
  }

  // Get movement information (Enemy-specific simple movement check)
  getMovementInfo() {
    if (this.isDead) {
      return { shouldPlay: false, state: null };
    }

    const distance = this.mesh.position.distanceTo(
      this.game.player.mesh.position
    );
    // Apply scale to attack ranges
    const scaleMultiplier = this.originalScale[0]; // Use X scale as base
    const minAttackRange = Math.min(
      this.data.weakAttack.range * scaleMultiplier,
      this.data.strongAttack.range * scaleMultiplier
    );

    const isMoving = distance > minAttackRange;
    return {
      shouldPlay: isMoving,
      state: isMoving ? MovementState.WALK : null,
    };
  }
}
