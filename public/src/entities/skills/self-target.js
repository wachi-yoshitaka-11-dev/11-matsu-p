import { Skill } from './skill.js';

export class SelfTarget extends Skill {
  constructor(game, skillId, caster) {
    // Create effect mesh using skills.json effect configuration
    const skillData = game.data.skills[skillId];
    const effectData = skillData.effect || {};
    const { geometry, material } = Skill.createEffectMesh(effectData);

    super(game, skillId, { geometry, material });

    this.caster = caster;
    // Self-target skills are always applied to the caster
    this.target = caster;

    this.duration = skillData.duration || 1000; // milliseconds - effect duration
    this.castTime = skillData.castTime || 0;
    this.isActive = false;

    // Position self-target effect on caster
    this.mesh.position.copy(caster.mesh.position);
    this.mesh.position.y += 2.0; // Display above caster

    // Set initial scale to 0 (enlarge with animation)
    this.mesh.scale.setScalar(0);

    // Apply effect rotation if specified
    if (effectData.rotation) {
      this.mesh.rotation.set(
        effectData.rotation.x || 0,
        effectData.rotation.y || 0,
        effectData.rotation.z || 0
      );
    }

    // Apply self-target effect after cast time
    setTimeout(() => {
      this.activateSelfTarget();
    }, this.castTime);

    // Remove self-target effect after duration
    setTimeout(() => {
      this.deactivateSelfTarget();
      // Stop particle emission and cleanup
      this.particleData = null;
      this.forceCleanupAllParticles();
      this.lifespan = 0;
    }, this.duration);
  }

  update(deltaTime) {
    super.update(deltaTime);

    if (this.isActive && this.caster) {
      // Follow caster position (self)
      this.mesh.position.copy(this.caster.mesh.position);
      this.mesh.position.y += 2.0;

      // Rotate self-target effect
      this.mesh.rotation.y += deltaTime * 2;

      // Scale animation for all shapes
      const scaleVariation = 0.1 * Math.sin(Date.now() * 0.01);
      this.mesh.scale.setScalar(1.0 + scaleVariation);
    }
  }

  activateSelfTarget() {
    if (!this.caster || !this.data.buffs) return;

    this.isActive = true;
    this.effectIds = [];

    // Apply all buff status changes to caster
    this.data.buffs.forEach((buffData) => {
      const effectConfig = {
        ...buffData,
      };

      if (this.caster.applyBuff) {
        const effectId = this.caster.applyBuff(effectConfig);
        this.effectIds.push(effectId);
      }
    });

    // Show effect
    this.mesh.scale.setScalar(1.0);
  }

  deactivateSelfTarget() {
    if (!this.isActive || !this.caster) return;

    this.isActive = false;

    // Don't manually remove buffs - let the Character.updateBuffsAndDebuffs() handle expiration
    // This prevents duplicate removal and ensures proper HUD updates

    // Fade out effect
    this.mesh.scale.setScalar(0);
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

  // Override dispose to ensure cleanup
  dispose() {
    this.particleData = null; // Stop particle emission
    this.forceCleanupAllParticles(); // Force cleanup all remaining particles
    super.dispose();
  }
}
