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
      // Begin fade out process instead of immediate stop
      if (!this.fadeOutStarted) {
        this.fadeOutStarted = true;
        this.fadeOutTime = 0.3; // Fade out over 300ms
        this.fadeOutTimer = this.fadeOutTime;
      }

      this.fadeOutTimer -= deltaTime;

      if (this.fadeOutTimer <= 0) {
        this.particleData = null;
        this.cleanupTrail();
        this.forceCleanupAllParticles();
        // Now remove after fade-out
        this.lifespan = 0;
        return;
      }

      // Gradually reduce particle emission during fade out
      if (this.particleData) {
        this.particleData.fadeRatio = this.fadeOutTimer / this.fadeOutTime;
      }
      // Also fade trail
      if (this.trailSystem) {
        this.trailSystem.fadeRatio = this.fadeOutTimer / this.fadeOutTime;
      }
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

      // Begin fade out process instead of immediate stop
      if (!this.fadeOutStarted) {
        this.fadeOutStarted = true;
        this.fadeOutTime = 0.2; // Shorter fade for expiry
        this.fadeOutTimer = this.fadeOutTime;

        if (this.particleData) {
          this.particleData.fadeRatio = 1.0;
        }
      }

      this.fadeOutTimer -= deltaTime;

      if (this.fadeOutTimer <= 0) {
        this.particleData = null;
        this.cleanupTrail();
        this.forceCleanupAllParticles();
        // Now remove after fade-out
        this.lifespan = 0;
        return;
      }

      // Gradually reduce particle emission during fade out
      if (this.particleData) {
        this.particleData.fadeRatio = this.fadeOutTimer / this.fadeOutTime;
      }
      // Also fade trail
      if (this.trailSystem) {
        this.trailSystem.fadeRatio = this.fadeOutTimer / this.fadeOutTime;
      }
    }
  }

  // Clean up trail system when projectile ends
  cleanupTrail() {
    if (this.trailSystem && this.trailSystem.worldMesh) {
      this.game.sceneManager.remove(this.trailSystem.worldMesh);
      // Only dispose material, not geometry (Sprite geometry is shared)
      this.trailSystem.worldMesh.material.dispose();
      this.trailSystem.worldMesh = null;
      this.trailSystem.positions = [];
    }
  }

  // Override dispose to ensure cleanup
  dispose() {
    this.particleData = null; // Stop particle emission
    this.cleanupTrail(); // Clean up trail system
    this.forceCleanupAllParticles(); // Force cleanup all remaining particles
    super.dispose();
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

    // Deal damage with attack buffs applied or fallback to raw damage
    if (this.caster && this.caster.dealDamage) {
      this.caster.dealDamage(target, this.damage);
    } else if (this.game.player && this.game.player.dealDamage) {
      // Fallback to player damage dealing
      this.game.player.dealDamage(target, this.damage);
    } else {
      // Final fallback to raw damage
      target.takeDamage(this.damage);
    }

    // Show damage effect
    this.showDamageEffect(target.mesh.position);

    // Apply debuff if available
    if (this.data.debuffs) {
      this.applyDebuffToTarget(target);
    }

    // Begin fade-out; update() will handle teardown & removal
    if (!this.fadeOutStarted) {
      this.fadeOutStarted = true;
      this.fadeOutTime = 0.3; // 300ms fade
      this.fadeOutTimer = this.fadeOutTime;
    }
    // Keep lifespan > 0 so the manager doesn't cull us before fade completes
    this.lifespan = Number.EPSILON;
  }
}
