import { Skill } from './skill.js';

export class AreaAttack extends Skill {
  constructor(game, skillId, centerPosition, direction, caster) {
    super(game, skillId);

    this.caster = caster;

    const skillData = game.data.skills[skillId];

    this.range = skillData.range || 4.0;
    this.damage = skillData.damage || 50;
    this.castTime = skillData.castTime || 800; // ms
    this.duration = skillData.duration || 1500; // ms

    // Elapsed time for the effect
    this.elapsedTime = 0;
    this.hasDealtDamage = false;

    // Position setting
    this.mesh.position.copy(centerPosition);
    this.mesh.position.y += 0.1; // Display slightly above ground

    // Apply rotation settings from skills.json based on caster's orientation
    this.applyRotation(caster.mesh.quaternion);

    // Set initial scale to 0 (enlarge with animation)
    this.mesh.scale.setScalar(0);
  }

  update(deltaTime) {
    super.update(deltaTime);

    this.elapsedTime += deltaTime * 1000;
    const elapsed = this.elapsedTime;
    const progress = Math.min(elapsed / this.duration, 1);

    // Deal damage after cast time has elapsed
    if (elapsed >= this.castTime && !this.hasDealtDamage) {
      this.dealDamage();
      this.hasDealtDamage = true;
    }

    // Effect animation
    this.mesh.scale.setScalar(progress);
    if (this.mesh.material) {
      this.mesh.material.opacity =
        (this.data.effect.opacity || 0.6) * (1 - progress);
    }

    // Start fading out particles when effect is finishing (earlier start for smoother fade)
    if (progress > 0.6) {
      const fadeProgress = (progress - 0.6) / 0.4; // Fade over last 40% of duration
      if (this.particleData) {
        this.particleData.fadeRatio = Math.max(0.1, 1.0 - fadeProgress);
      }
    }

    // Mark for removal when duration ends
    if (progress >= 1) {
      this.lifespan = 0;
      // Stop particle emission
      this.particleData = null;
      // Force cleanup all remaining particles
      this.forceCleanupAllParticles();
    }
  }

  // Force cleanup all remaining particles immediately (similar to projectile)
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

  // Override dispose to ensure cleanup
  dispose() {
    this.particleData = null; // Stop particle emission
    this.forceCleanupAllParticles(); // Force cleanup all remaining particles
    super.dispose();
  }

  dealDamage() {
    const centerPosition = this.mesh.position;

    if (this.caster !== this.game.player) {
      // Enemy attack: deal damage to player
      const distance = centerPosition.distanceTo(
        this.game.player.mesh.position
      );
      if (distance <= this.range) {
        this.caster.dealDamage(this.game.player, this.damage);
        this.showDamageEffect(this.game.player.mesh.position);

        // Apply debuffs
        if (this.data.debuffs) {
          this.applyDebuffToTarget(this.game.player);
        }
      }
    } else {
      // Player attack: deal damage to enemies
      this.game.entities.characters.enemies.forEach((enemy) => {
        const distance = centerPosition.distanceTo(enemy.mesh.position);
        if (distance <= this.range) {
          this.caster.dealDamage(enemy, this.damage);
          this.showDamageEffect(enemy.mesh.position);

          // Apply debuff to enemies
          if (this.data.debuffs) {
            this.applyDebuffToTarget(enemy);
          }
        }
      });
    }
  }
}
