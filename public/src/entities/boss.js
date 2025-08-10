import * as THREE from 'three';
import { Enemy } from './enemy.js';
import { AssetPaths, AnimationNames } from '../utils/constants.js';

export class Boss extends Enemy {
  constructor(game, bossType, position, options = {}) {
    super(game, bossType, position, options);

    this.placeOnGround(position.x, position.z);

    this.attackCooldown = this.data.attackCooldown;
    this.experience = this.data.experience;
    this.isAttacking = false;

    if (this.mixer) {
      this.mixer.addEventListener('finished', (e) => {
        const clipName = e.action.getClip().name;
        if (clipName === AnimationNames.ATTACK_STRONG) {
          this.isAttacking = false;
        }
      });
    }
  }

  update(deltaTime) {
    super.update(deltaTime);

    if (this.isDead) return;

    this.updateAnimation();

    const distance = this.mesh.position.distanceTo(this.player.mesh.position);

    if (distance > this.data.normalAttackRange) {
      const direction = new THREE.Vector3()
        .subVectors(this.player.mesh.position, this.mesh.position)
        .normalize();
      this.mesh.position.add(direction.multiplyScalar(this.speed * deltaTime));
    }

    this.mesh.lookAt(this.player.mesh.position);

    this.attackCooldown -= deltaTime;
    if (distance <= this.data.normalAttackRange && this.attackCooldown <= 0) {
      this.attack();
      this.attackCooldown = this.data.attackCooldown;
    }
  }

  updateAnimation() {
    if (this.isAttacking) {
      return;
    }

    const distance = this.mesh.position.distanceTo(this.player.mesh.position);

    if (distance > this.data.normalAttackRange) {
      this.playAnimation(AnimationNames.WALK);
    } else {
      this.playAnimation(AnimationNames.IDLE);
    }
  }

  attack() {
    this.playAnimation(AnimationNames.ATTACK_STRONG);
    this.player.takeDamage(this.data.normalAttackDamage);
  }

  onDeath() {
    this.game.playSound(AssetPaths.SFX_KILL);
  }
}
