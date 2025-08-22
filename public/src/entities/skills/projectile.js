// External libraries
import * as THREE from 'three';

// Entities
import { Skill } from './skill.js';

export class Projectile extends Skill {
  constructor(game, skillId, startPosition, direction, caster) {
    super(game, skillId);

    this.caster = caster;

    const skillData = game.data.skills[skillId];
    this.speed = skillData.speed || 10;
    this.lifespan = skillData.lifespan || 2; // seconds
    this.damage = skillData.damage || 30;
    this.hasHit = false;

    this.mesh.position.copy(startPosition);

    const unitDir =
      direction && direction.lengthSq() > 1e-8
        ? direction.clone().normalize()
        : new THREE.Vector3(0, 0, -1);

    this.applyRotation(caster.mesh.quaternion);

    this.direction = unitDir;
  }

  update(deltaTime) {
    super.update(deltaTime);

    if (this.hasHit) {
      return;
    }

    this.lifespan -= deltaTime;

    const movement = this.direction
      .clone()
      .multiplyScalar(this.speed * deltaTime);
    this.mesh.position.add(movement);

    // Check for collisions
    this.checkCollisions();

    // Remove if lifespan expired
    if (this.lifespan <= 0) {
      this.lifespan = 0;
    }
  }

  checkCollisions() {
    const projectilePosition = this.mesh.position;
    const hitRadius = this.data.hitRange || 1.5; // Use hitRange from skills.json

    if (this.caster !== this.game.player) {
      // Enemy projectile: check collision with player
      const distance = projectilePosition.distanceTo(
        this.game.player.mesh.position
      );
      if (distance <= hitRadius) {
        this.hitTarget(this.game.player);
      }
    } else {
      // Player projectile: check collision with enemies
      this.game.entities.characters.enemies.forEach((enemy) => {
        if (!enemy.isDead) {
          const distance = projectilePosition.distanceTo(enemy.mesh.position);
          if (distance <= hitRadius) {
            this.hitTarget(enemy);
          }
        }
      });
    }
  }

  hitTarget(target) {
    if (this.hasHit) return;

    this.hasHit = true;

    // Deal damage with attack buffs applied
    this.caster.dealDamage(target, this.damage);

    // Show damage effect
    this.showDamageEffect(target.mesh.position);

    // Apply debuff if available
    if (this.data.debuffs) {
      this.applyDebuffToTarget(target);
    }

    // Mark for removal
    this.lifespan = 0;
  }
}
