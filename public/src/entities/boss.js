import * as THREE from 'three';
import { Character } from './character.js';
import { AssetNames, AnimationNames } from '../utils/constants.js';

export class Boss extends Character {
  constructor(game, player, options = {}) {
    const model = game.assetLoader.getAsset(AssetNames.BOSS_MODEL);
    if (model) {
      super(game, model.clone(), null, {
        hp: game.data.enemies.boss.hp,
        speed: game.data.enemies.boss.speed,
        modelName: AssetNames.BOSS_MODEL,
        textureName: AssetNames.BOSS_TEXTURE,
      });
    } else {
      const geometry = new THREE.BoxGeometry(2, 2, 2);
      const material = new THREE.MeshStandardMaterial({ color: 0x880000 });
      super(game, geometry, material, {
        hp: game.data.enemies.boss.hp,
        speed: game.data.enemies.boss.speed,
      });
    }

    this.player = player;

    const initialPosition = this.game.data.enemies.boss.initialPosition;
    this.placeOnGround(initialPosition.x, initialPosition.z);

    this.attackCooldown = this.game.data.enemies.boss.attackCooldown;
    this.experience = this.game.data.enemies.boss.experience;
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

    if (distance > this.game.data.enemies.boss.normalAttackRange) {
      const direction = new THREE.Vector3()
        .subVectors(this.player.mesh.position, this.mesh.position)
        .normalize();
      this.mesh.position.add(direction.multiplyScalar(this.speed * deltaTime));
    }

    this.mesh.lookAt(this.player.mesh.position);

    this.attackCooldown -= deltaTime;
    if (
      distance <= this.game.data.enemies.boss.normalAttackRange &&
      this.attackCooldown <= 0
    ) {
      this.attack();
      this.attackCooldown = this.game.data.enemies.boss.attackCooldown;
    }
  }

  updateAnimation() {
    if (this.isAttacking) {
      return;
    }

    const distance = this.mesh.position.distanceTo(this.player.mesh.position);

    if (distance > this.game.data.enemies.boss.normalAttackRange) {
      this.playAnimation(AnimationNames.WALK);
    } else {
      this.playAnimation(AnimationNames.IDLE);
    }
  }

  attack() {
    this.playAnimation(AnimationNames.ATTACK_STRONG);
    this.player.takeDamage(this.game.data.enemies.boss.normalAttackDamage);
  }

  onDeath() {
    this.game.playSound(AssetNames.SFX_KILL);
  }
}
