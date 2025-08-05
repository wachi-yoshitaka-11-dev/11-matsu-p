import * as THREE from 'three';
import { Character } from './character.js';
import { AssetNames, AnimationNames } from '../utils/constants.js';

export class Enemy extends Character {
  constructor(game, player, position, options = {}) {
    if (!player) {
      throw new Error('Player parameter is required for Enemy');
    }
    if (!position || position.x === undefined || position.z === undefined) {
      throw new Error('Valid position with x and z coordinates is required');
    }

    const enemyType = options.enemyType;
    if (!enemyType) {
      throw new Error('Enemy type is required');
    }

    const enemyData = game.data.enemies[enemyType];
    if (!enemyData) {
      throw new Error(`Enemy type '${enemyType}' not found in enemies data`);
    }

    const modelName = enemyData.model
      ? enemyData.model.replace('.glb', '')
      : null;
    const model = modelName ? game.assetLoader.getAsset(modelName) : null;

    if (model) {
      super(game, model.clone(), null, {
        hp: enemyData.hp,
        speed: enemyData.speed,
        modelName: modelName,
      });
    } else {
      const geometry = new THREE.BoxGeometry(0.6, 1.2, 0.6);
      const material = new THREE.MeshStandardMaterial({ color: 0x0000ff });
      super(game, geometry, material, {
        hp: enemyData.hp,
        speed: enemyData.speed,
      });
    }

    this.enemyType = enemyType;
    this.enemyData = enemyData;
    this.player = player;

    this.placeOnGround(position.x, position.z);

    this.attackCooldown = enemyData ? enemyData.attackCooldown : 3;
    this.experience = enemyData ? enemyData.experience : 10;
    this.isAttacking = false;

    // Initialize death animation properties
    this.deathAnimationStartTime = null;
    this.deathAnimationDuration = 2000; // 2 seconds
    this.readyForRemoval = false;

    if (this.mixer) {
      this.mixer.addEventListener('finished', (e) => {
        const clipName = e.action.getClip().name;
        if (clipName === AnimationNames.ATTACK_WEAK) {
          this.isAttacking = false;
        }
      });
    }
  }

  update(deltaTime) {
    super.update(deltaTime);

    if (this.isDead) {
      this.updateDeathAnimation();
      return;
    }

    this.updateAnimation();

    const distance = this.mesh.position.distanceTo(this.player.mesh.position);
    const attackRange = this.enemyData
      ? this.enemyData.attackRange || this.enemyData.normalAttackRange
      : 2;

    if (distance > attackRange) {
      const direction = new THREE.Vector3()
        .subVectors(this.player.mesh.position, this.mesh.position)
        .normalize();
      this.mesh.position.x += direction.x * this.speed * deltaTime;
      this.mesh.position.z += direction.z * this.speed * deltaTime;
    }

    this.mesh.lookAt(this.player.mesh.position);

    this.attackCooldown -= deltaTime;
    if (distance <= attackRange && this.attackCooldown <= 0) {
      this.attack();
      this.attackCooldown = this.enemyData ? this.enemyData.attackCooldown : 3;
    }
  }

  updateAnimation() {
    if (this.isAttacking) {
      return;
    }

    const distance = this.mesh.position.distanceTo(this.player.mesh.position);
    const attackRange = this.enemyData
      ? this.enemyData.attackRange || this.enemyData.normalAttackRange
      : 2;

    if (distance > attackRange) {
      this.playAnimation(AnimationNames.WALK);
    } else {
      this.playAnimation(AnimationNames.IDLE);
    }
  }

  attack() {
    this.playAnimation(AnimationNames.ATTACK_WEAK);
    const toPlayer = new THREE.Vector3()
      .subVectors(this.player.mesh.position, this.mesh.position)
      .normalize();
    const playerForward = new THREE.Vector3(0, 0, -1).applyQuaternion(
      this.player.mesh.quaternion
    );
    const angle = toPlayer.angleTo(playerForward);

    const isGuarded = this.player.isGuarding && angle < Math.PI / 2;

    if (isGuarded) {
      this.player.takeStaminaDamage(this.game.data.player.staminaCostGuard);
      this.game.playSound(AssetNames.SFX_GUARD);
    } else {
      const damage = this.enemyData
        ? this.enemyData.damage || this.enemyData.normalAttackDamage
        : 10;
      this.player.takeDamage(damage);
      this.game.playSound(AssetNames.SFX_DAMAGE);
    }
  }

  updateDeathAnimation() {
    if (!this.deathAnimationStartTime) return;

    const elapsedTime = Date.now() - this.deathAnimationStartTime;
    const progress = Math.min(elapsedTime / this.deathAnimationDuration, 1);

    // Fade out effect during death animation
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

    // Mark as ready for removal when animation is complete
    if (progress >= 1) {
      this.readyForRemoval = true;
    }
  }

  onDeath() {
    this.playAnimation(AnimationNames.DIE);
    this.game.playSound(AssetNames.SFX_KILL);

    // Start death animation timing
    this.deathAnimationStartTime = Date.now();
  }
}
