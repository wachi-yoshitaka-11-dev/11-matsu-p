import * as THREE from 'three';
import { Enemy } from './enemy.js';
import { AttackTypes, AnimationNames } from '../../utils/constants.js';

export class Boss extends Enemy {
  constructor(game, enemyId, position, options = {}) {
    super(game, enemyId, position, options);
  }

  update(deltaTime) {
    super.update(deltaTime);

    if (this.isDead) {
      this.updateDeathAnimation();
      return;
    }

    const isPerformingAnySkill = Object.values(
      this.skillPerformanceStates || {}
    ).some((state) => state);
    if (
      this.isPerformingWeakAttack ||
      this.isPerformingStrongAttack ||
      isPerformingAnySkill
    ) {
      // Update animations even during skill execution
      this.updateBossAnimation();
      return;
    }

    this.updateBossAnimation();

    const distance = this.mesh.position.distanceTo(
      this.game.player.mesh.position
    );
    // Movement judgment based on basic attack range (skills have their own range checks)
    const basicAttackRange = Math.min(
      this.data.weakAttack.range,
      this.data.strongAttack.range
    );

    if (distance > basicAttackRange) {
      const direction = new THREE.Vector3()
        .subVectors(this.game.player.mesh.position, this.mesh.position)
        .normalize();
      this.mesh.position.x += direction.x * this.speed * deltaTime;
      this.mesh.position.z += direction.z * this.speed * deltaTime;
    }

    this.mesh.lookAt(this.game.player.mesh.position);

    this.weakAttackCooldown = Math.max(0, this.weakAttackCooldown - deltaTime);
    this.strongAttackCooldown = Math.max(
      0,
      this.strongAttackCooldown - deltaTime
    );

    // Use inherited common action selection logic
    this.chooseAndPerformAction(distance);
  }

  // Boss-specific action selection logic (override)
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

  // Boss-specific action execution logic (override)
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
      distance <= this.data.strongAttack.range
    ) {
      this.performStrongAttack();
      this.nextAction = null;
    } else if (
      this.nextAction === AttackTypes.WEAK &&
      this.weakAttackCooldown <= 0 &&
      distance <= this.data.weakAttack.range
    ) {
      this.performWeakAttack();
      this.nextAction = null;
    } else {
      // Reset if attack cannot be executed and select a new action next time
      this.nextAction = null;
    }
  }

  updateBossAnimation() {
    // Do nothing if already in attack animation
    if (this.isPerformingWeakAttack || this.isPerformingStrongAttack) {
      return;
    }

    const isPerformingAnySkill = Object.values(
      this.skillPerformanceStates || {}
    ).some((state) => state);
    if (isPerformingAnySkill) {
      return; // Maintain current animation during skill execution
    }

    const distance = this.mesh.position.distanceTo(
      this.game.player.mesh.position
    );

    const basicAttackRange = Math.min(
      this.data.weakAttack.range,
      this.data.strongAttack.range
    );

    if (distance > basicAttackRange) {
      this.playAnimation(AnimationNames.WALK);
    } else {
      this.playAnimation(AnimationNames.IDLE);
    }
  }

  // Override to apply damageMultiplier
  dealDamageToPlayer(damage) {
    const actualDamage = damage * (this.damageMultiplier || 1);
    super.dealDamageToPlayer(actualDamage);
  }

  // Boss version of skill execution (with state management)
  executeBuffSkill(skillId) {
    super.executeBuffSkill(skillId);
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

  // Force reset attack state (backup function)
  performWeakAttack() {
    super.performWeakAttack();
    // Backup reset: animation end time + safety margin
    setTimeout(
      () => {
        this.isPerformingWeakAttack = false;
      },
      (this.data.weakAttack.castTime + 2) * 1000
    );
  }

  performStrongAttack() {
    super.performStrongAttack();
    // Backup reset: animation end time + safety margin
    setTimeout(
      () => {
        this.isPerformingStrongAttack = false;
      },
      (this.data.strongAttack.castTime + 2) * 1000
    );
  }
}
