import * as THREE from 'three';
import { Character } from './character.js';
import { AssetNames, AnimationNames } from '../utils/constants.js';

export class Enemy extends Character {
  constructor(game, player, position, options = {}) {
    const model = game.assetLoader.getAsset(AssetNames.ENEMY_MODEL);
    if (model) {
      super(game, model.clone(), null, {
        hp: 30,
        speed: game.data.enemies.grunt.speed,
        modelName: AssetNames.ENEMY_MODEL,
        textureName: AssetNames.ENEMY_TEXTURE,
      });
    } else {
      const geometry = new THREE.BoxGeometry(0.6, 1.2, 0.6);
      const material = new THREE.MeshStandardMaterial({ color: 0x0000ff });
      super(game, geometry, material, {
        hp: 30,
        speed: game.data.enemies.grunt.speed,
      });
    }

    this.player = player;

    this.placeOnGround(position.x, position.z);

    this.attackCooldown = this.game.data.enemies.grunt.attackCooldown;
    this.experience = this.game.data.enemies.grunt.experience;
    this.isAttacking = false;

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

    if (this.isDead) return;

    this.updateAnimation();

    const distance = this.mesh.position.distanceTo(this.player.mesh.position);

    if (distance > this.game.data.enemies.grunt.attackRange) {
      const direction = new THREE.Vector3()
        .subVectors(this.player.mesh.position, this.mesh.position)
        .normalize();
      this.mesh.position.x += direction.x * this.speed * deltaTime;
      this.mesh.position.z += direction.z * this.speed * deltaTime;
    }

    this.mesh.lookAt(this.player.mesh.position);

    this.attackCooldown -= deltaTime;
    if (
      distance <= this.game.data.enemies.grunt.attackRange &&
      this.attackCooldown <= 0
    ) {
      this.attack();
      this.attackCooldown = this.game.data.enemies.grunt.attackCooldown;
    }
  }

  updateAnimation() {
    // 攻撃アニメーション中は他のアニメーションに切り替えない
    if (this.isAttacking) {
      return;
    }

    const distance = this.mesh.position.distanceTo(this.player.mesh.position);

    if (distance > this.game.data.enemies.grunt.attackRange) {
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
      this.player.takeDamage(this.game.data.enemies.grunt.damage);
      this.game.playSound(AssetNames.SFX_DAMAGE);
    }
  }

  onDeath() {
    this.game.playSound(AssetNames.SFX_KILL);
  }
}
