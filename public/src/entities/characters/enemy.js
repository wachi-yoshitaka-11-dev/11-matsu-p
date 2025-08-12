import * as THREE from 'three';
import { Character } from './character.js';
import { AssetPaths, AnimationNames } from '../../utils/constants.js';

export class Enemy extends Character {
  constructor(game, enemyType, position, options = {}) {
    if (!position || position.x === undefined || position.z === undefined) {
      throw new Error('Valid position with x and z coordinates is required');
    }
    if (!options.player) {
      throw new Error('Player parameter is required in options for Enemy');
    }

    const enemyData = game.data.enemies[enemyType];
    if (!enemyData) {
      throw new Error(`Enemy type "${enemyType}" not found in enemies data`);
    }
    const modelName = enemyData.model.replace('.glb', '');
    const model = game.assetLoader.getModel(modelName);
    if (model) {
      super(game, enemyType, enemyData, model.clone(), null, {
        hp: enemyData.hp,
        speed: enemyData.speed,
        modelName: modelName,
        textureName: enemyData.texture.replace('.png', ''),
      });
    } else {
      const geometry = new THREE.BoxGeometry(0.6, 1.2, 0.6);
      const material = new THREE.MeshStandardMaterial({ color: 0x0000ff });
      super(game, enemyType, enemyData, geometry, material, {
        hp: enemyData.hp,
        speed: enemyData.speed,
      });
    }

    this.player = options.player;

    this.placeOnGround(position.x, position.z);

    this.weakAttackCooldown = 0;
    this.strongAttackCooldown = 0;
    this.experience = this.data.experience;
    this.isPerformingWeakAttack = false;
    this.isPerformingStrongAttack = false;
    this.nextAttackType = null;

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

  update(deltaTime) {
    super.update(deltaTime);

    if (this.isDead) {
      this.updateDeathAnimation();
      return;
    }

    if (this.isPerformingWeakAttack || this.isPerformingStrongAttack) {
      return;
    }

    this.updateAnimation();

    const distance = this.mesh.position.distanceTo(this.player.mesh.position);
    const minAttackRange = Math.min(
      this.data.weakAttack.range,
      this.data.strongAttack.range
    );

    if (distance > minAttackRange) {
      const direction = new THREE.Vector3()
        .subVectors(this.player.mesh.position, this.mesh.position)
        .normalize();
      this.mesh.position.x += direction.x * this.speed * deltaTime;
      this.mesh.position.z += direction.z * this.speed * deltaTime;
    }

    this.mesh.lookAt(this.player.mesh.position);

    this.weakAttackCooldown = Math.max(0, this.weakAttackCooldown - deltaTime);
    this.strongAttackCooldown = Math.max(
      0,
      this.strongAttackCooldown - deltaTime
    );

    this.chooseAndPerformAttack(distance);
  }

  updateAnimation() {
    if (this.isPerformingWeakAttack || this.isPerformingStrongAttack) {
      return;
    }

    const distance = this.mesh.position.distanceTo(this.player.mesh.position);
    const minAttackRange = Math.min(
      this.data.weakAttack.range,
      this.data.strongAttack.range
    );

    if (distance > minAttackRange) {
      this.playAnimation(AnimationNames.WALK);
    } else {
      this.playAnimation(AnimationNames.IDLE);
    }
  }

  chooseAndPerformAttack(distance) {
    // 次の攻撃タイプが決まっていない場合、確率で決定
    if (this.nextAttackType === null) {
      this.nextAttackType =
        Math.random() < this.data.strongAttack.probability ? 'strong' : 'weak';
    }

    // 決定された攻撃タイプを実行
    if (
      this.nextAttackType === 'strong' &&
      this.strongAttackCooldown <= 0 &&
      distance <= this.data.strongAttack.range
    ) {
      this.performStrongAttack();
      this.nextAttackType = null; // 次回のために攻撃タイプをリセット
    } else if (
      this.nextAttackType === 'weak' &&
      this.weakAttackCooldown <= 0 &&
      distance <= this.data.weakAttack.range
    ) {
      this.performWeakAttack();
      this.nextAttackType = null; // 次回のために攻撃タイプをリセット
    }
  }

  performWeakAttack() {
    this.isPerformingWeakAttack = true;
    this.weakAttackCooldown = this.data.weakAttack.cooldown;

    this.playAnimation(AnimationNames.ATTACK_WEAK);

    setTimeout(() => {
      this.dealDamageToPlayer(this.data.weakAttack.damage);
      this.game.playSound(AssetPaths.SFX_ATTACK_WEAK);
    }, this.data.weakAttack.castTime * 1000);
  }

  performStrongAttack() {
    this.isPerformingStrongAttack = true;
    this.strongAttackCooldown = this.data.strongAttack.cooldown;

    this.playAnimation(AnimationNames.ATTACK_STRONG);

    setTimeout(() => {
      this.dealDamageToPlayer(this.data.strongAttack.damage);
      this.game.playSound(AssetPaths.SFX_ATTACK_STRONG);
    }, this.data.strongAttack.castTime * 1000);
  }

  dealDamageToPlayer(damage) {
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
      this.game.playSound(AssetPaths.SFX_GUARD);
    } else {
      this.player.takeDamage(damage);
    }
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
    this.game.playSound(AssetPaths.SFX_KILL);

    this.deathAnimationStartTime = Date.now();
  }
}
