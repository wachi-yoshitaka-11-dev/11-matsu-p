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
        this.shouldDispose = true;
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
      this.trailSystem.worldMesh.geometry.dispose();
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

  // Force cleanup all remaining particles immediately
  forceCleanupAllParticles() {
    if (this.activeParticles) {
      this.activeParticles.forEach((particle) => {
        if (particle.mesh) {
          this.game.sceneManager.remove(particle.mesh);
          if (particle.mesh.geometry) particle.mesh.geometry.dispose();
          if (particle.mesh.material) particle.mesh.material.dispose();
        }
      });
      this.activeParticles = [];
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

    // Stop particle emission and clean trail immediately
    this.particleData = null;
    this.cleanupTrail();
    this.forceCleanupAllParticles();

    // Mark for removal
    this.lifespan = 0;
  }
}
