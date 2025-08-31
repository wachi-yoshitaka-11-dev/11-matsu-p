// Utils
import { AnimationNames } from '../../utils/constants.js';

// Entities
import { Enemy } from './enemy.js';

export class Boss extends Enemy {
  constructor(game, enemyId, position, options = {}) {
    super(game, enemyId, position, options);
  }

  // Boss uses specialized animation handling
  updateAnimation() {
    this.updateBossAnimation();
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

    const playerPos = this.game.player?.mesh?.position;
    if (!playerPos) return;
    const distance = this.mesh.position.distanceTo(playerPos);

    // Apply scale to attack ranges
    const scaleMultiplier = this.originalScale[0]; // Use X scale as base
    const basicAttackRange = Math.min(
      this.data.weakAttack.range * scaleMultiplier,
      this.data.strongAttack.range * scaleMultiplier
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
