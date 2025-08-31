import { ParticlePatternTypes } from '../../utils/constants.js';

/**
 * Particle pattern implementations
 * Each pattern defines how particles are positioned and move
 */
export class ParticlePatterns {
  /**
   * Apply particle pattern to positions and velocities
   * @param {string} pattern - Pattern type from ParticlePatternTypes
   * @param {number} index - Particle index
   * @param {number} totalCount - Total number of particles
   * @param {Float32Array} positions - Position array [x, y, z]
   * @param {Float32Array} velocities - Velocity array [x, y, z]
   * @param {number} spread - Spread distance
   * @param {number} speed - Base speed
   * @param {Object} particleData - Additional particle configuration
   */
  static applyPattern(
    pattern,
    index,
    totalCount,
    positions,
    velocities,
    spread,
    speed,
    particleData = {}
  ) {
    const time = performance.now() * 0.001; // Current time in seconds

    switch (pattern) {
      // Basic patterns
      case ParticlePatternTypes.DEFAULT:
        this.applyDefaultPattern(positions, velocities, spread, speed);
        break;

      case ParticlePatternTypes.EXPLOSION:
        this.applyExplosionPattern(
          index,
          totalCount,
          positions,
          velocities,
          spread,
          speed
        );
        break;

      case ParticlePatternTypes.SPRAY:
        this.applySprayPattern(positions, velocities, spread, speed);
        break;

      case ParticlePatternTypes.CLOUD:
        this.applyCloudPattern(positions, velocities, spread, speed);
        break;

      // Geometric patterns
      case ParticlePatternTypes.SPIRAL:
        this.applySpiralPattern(
          index,
          totalCount,
          positions,
          velocities,
          spread,
          speed,
          time
        );
        break;

      case ParticlePatternTypes.HELIX:
        this.applyHelixPattern(
          index,
          totalCount,
          positions,
          velocities,
          spread,
          speed,
          time
        );
        break;

      // Audio-based patterns
      case ParticlePatternTypes.SOUNDWAVE:
        this.applySoundwavePattern(
          index,
          totalCount,
          positions,
          velocities,
          spread,
          speed
        );
        break;

      case ParticlePatternTypes.SONIC:
        this.applySonicPattern(
          index,
          totalCount,
          positions,
          velocities,
          spread,
          speed,
          time,
          particleData
        );
        break;

      // Nature patterns
      case ParticlePatternTypes.ROOTS:
        this.applyRootsPattern(
          index,
          totalCount,
          positions,
          velocities,
          spread,
          speed,
          time,
          particleData
        );
        break;

      case ParticlePatternTypes.BARRIER:
        this.applyBarrierPattern(
          index,
          totalCount,
          positions,
          velocities,
          spread,
          speed,
          time,
          particleData
        );
        break;

      case ParticlePatternTypes.FANG:
        this.applyFangPattern(
          index,
          totalCount,
          positions,
          velocities,
          spread,
          speed,
          time,
          particleData
        );
        break;

      // Elemental patterns
      case ParticlePatternTypes.ICE:
        this.applyIcePattern(
          index,
          totalCount,
          positions,
          velocities,
          spread,
          speed,
          time
        );
        break;

      case ParticlePatternTypes.FROST:
        this.applyFrostPattern(positions, velocities, spread, speed);
        break;

      case ParticlePatternTypes.BLIZZARD:
        this.applyBlizzardPattern(positions, velocities, spread, speed);
        break;

      case ParticlePatternTypes.LAVA:
        this.applyLavaPattern(positions, velocities, spread, speed);
        break;

      case ParticlePatternTypes.STONE:
        this.applyStonePattern(
          index,
          totalCount,
          positions,
          velocities,
          spread,
          speed
        );
        break;

      case ParticlePatternTypes.ROCK:
        this.applyRockPattern(positions, velocities, spread, speed);
        break;

      // Combat patterns
      case ParticlePatternTypes.BREATH:
        this.applyBreathPattern(
          index,
          totalCount,
          positions,
          velocities,
          spread,
          speed
        );
        break;

      case ParticlePatternTypes.DRAGONFIRE:
        this.applyDragonfirePattern(positions, velocities, spread, speed);
        break;

      case ParticlePatternTypes.TORNADO:
        this.applyTornadoPattern(
          index,
          totalCount,
          positions,
          velocities,
          spread,
          speed,
          time
        );
        break;

      case ParticlePatternTypes.SHADOW:
        this.applyShadowPattern(positions, velocities, spread, speed);
        break;

      case ParticlePatternTypes.CURSE:
        this.applyCursePattern(
          index,
          totalCount,
          positions,
          velocities,
          spread,
          speed,
          time
        );
        break;

      // Special patterns
      case ParticlePatternTypes.ETHEREAL:
        this.applyEtherealPattern(
          index,
          totalCount,
          positions,
          velocities,
          spread,
          speed,
          time
        );
        break;

      case ParticlePatternTypes.ANCIENT:
        this.applyAncientPattern(
          index,
          totalCount,
          positions,
          velocities,
          spread,
          speed
        );
        break;

      case ParticlePatternTypes.HUNTING:
        this.applyHuntingPattern(
          index,
          totalCount,
          positions,
          velocities,
          spread,
          speed
        );
        break;

      case ParticlePatternTypes.CLONE:
        this.applyClonePattern(
          index,
          totalCount,
          positions,
          velocities,
          spread,
          speed,
          time
        );
        break;

      case ParticlePatternTypes.NINETAILS:
        this.applyNinetailsPattern(
          index,
          totalCount,
          positions,
          velocities,
          spread,
          speed,
          time
        );
        break;

      default:
        this.applyDefaultPattern(positions, velocities, spread, speed);
        break;
    }
  }

  // Basic patterns
  static applyDefaultPattern(positions, velocities, spread, speed) {
    positions[0] = (Math.random() - 0.5) * spread * 0.2;
    positions[1] = (Math.random() - 0.5) * spread * 0.2;
    positions[2] = (Math.random() - 0.5) * spread * 0.2;
    velocities[0] = (Math.random() - 0.5) * speed * 0.5;
    velocities[1] = (Math.random() - 0.5) * speed * 0.5;
    velocities[2] = (Math.random() - 0.5) * speed * 0.5;
  }

  static applyExplosionPattern(
    index,
    totalCount,
    positions,
    velocities,
    spread,
    speed
  ) {
    const explosionAngle = (index / totalCount) * Math.PI * 2;
    const explosionPitch = (Math.random() - 0.5) * Math.PI;
    positions[0] = (Math.random() - 0.5) * spread * 0.1;
    positions[1] = (Math.random() - 0.5) * spread * 0.1;
    positions[2] = (Math.random() - 0.5) * spread * 0.1;
    velocities[0] = Math.cos(explosionAngle) * Math.cos(explosionPitch) * speed;
    velocities[1] = Math.sin(explosionPitch) * speed * 0.7;
    velocities[2] = Math.sin(explosionAngle) * Math.cos(explosionPitch) * speed;
  }

  static applySprayPattern(positions, velocities, spread, speed) {
    const coneAngle = (Math.random() - 0.5) * Math.PI * 0.4;
    const conePitch = (Math.random() - 0.5) * Math.PI * 0.2;
    positions[0] = (Math.random() - 0.5) * spread * 0.1;
    positions[1] = (Math.random() - 0.5) * spread * 0.1;
    positions[2] = (Math.random() - 0.5) * spread * 0.1;
    velocities[0] = Math.sin(coneAngle) * speed * 0.8;
    velocities[1] = Math.sin(conePitch) * speed * 0.4;
    velocities[2] = Math.cos(coneAngle) * speed * 0.8;
  }

  static applyCloudPattern(positions, velocities, spread, speed) {
    positions[0] = (Math.random() - 0.5) * spread * 0.8;
    positions[1] = (Math.random() - 0.5) * spread * 0.3;
    positions[2] = (Math.random() - 0.5) * spread * 0.8;
    velocities[0] = (Math.random() - 0.5) * speed * 0.2;
    velocities[1] = Math.random() * speed * 0.1;
    velocities[2] = (Math.random() - 0.5) * speed * 0.2;
  }

  // Geometric patterns
  static applySpiralPattern(
    index,
    totalCount,
    positions,
    velocities,
    spread,
    speed,
    time
  ) {
    const spiralAngle = (index / totalCount) * Math.PI * 4 + time * 2;
    const spiralRadius = (index / totalCount) * spread * 0.3;
    positions[0] = Math.cos(spiralAngle) * spiralRadius;
    positions[1] = Math.sin(time * 3) * 0.5;
    positions[2] = Math.sin(spiralAngle) * spiralRadius;
    velocities[0] = Math.cos(spiralAngle) * speed * 0.3;
    velocities[1] = speed * 0.8;
    velocities[2] = Math.sin(spiralAngle) * speed * 0.3;
  }

  static applyHelixPattern(
    index,
    totalCount,
    positions,
    velocities,
    spread,
    speed,
    time
  ) {
    const helixAngle = (index / totalCount) * Math.PI * 6 + time;
    const helixRadius = spread * 0.3;
    positions[0] = Math.cos(helixAngle) * helixRadius;
    positions[1] = (index / totalCount) * 2 - 1;
    positions[2] = Math.sin(helixAngle) * helixRadius;
    velocities[0] = Math.cos(helixAngle + Math.PI / 2) * speed * 0.4;
    velocities[1] = speed * 0.5;
    velocities[2] = Math.sin(helixAngle + Math.PI / 2) * speed * 0.4;
  }

  // Audio-based patterns
  static applySoundwavePattern(
    index,
    totalCount,
    positions,
    velocities,
    spread,
    speed
  ) {
    const waveAngle = (index / totalCount) * Math.PI * 2;
    const waveRadius = (Math.random() * 0.5 + 0.5) * spread * 0.4;
    const coneHeight = Math.sin((Math.PI * 0.4) / 2);
    positions[0] = Math.cos(waveAngle) * waveRadius;
    positions[1] = (Math.random() - 0.5) * coneHeight;
    positions[2] = Math.sin(waveAngle) * waveRadius;
    velocities[0] = Math.cos(waveAngle) * speed * 0.6;
    velocities[1] = (Math.random() - 0.5) * speed * 0.3;
    velocities[2] = Math.sin(waveAngle) * speed * 0.6;
  }

  static applySonicPattern(
    index,
    totalCount,
    positions,
    velocities,
    spread,
    speed,
    time,
    particleData
  ) {
    const sonicAngle = (index / totalCount) * Math.PI * 2;
    // Apply soundRipples effect - more pronounced wave patterns
    const rippleIntensity = particleData.soundRipples ? 1.5 : 1.0;
    // Apply wildness - more chaotic movement
    const wildnessMultiplier = particleData.wildness || 1.0;
    const waveRadius =
      Math.sin(time * 8 + index * 0.5) * spread * 0.3 * rippleIntensity +
      spread * 0.4;
    positions[0] = Math.cos(sonicAngle) * waveRadius;
    positions[1] = Math.sin(time * 6 + index * 0.3) * 0.6 * wildnessMultiplier;
    positions[2] = Math.sin(sonicAngle) * waveRadius;
    // Apply canineRage - more aggressive movement
    const rageMultiplier = (particleData.canineRage || 1.0) * 0.9;
    velocities[0] = Math.cos(sonicAngle) * speed * 0.8 * rageMultiplier;
    velocities[1] = (Math.random() - 0.5) * speed * 0.4 * wildnessMultiplier;
    velocities[2] = Math.sin(sonicAngle) * speed * 0.8 * rageMultiplier;
  }

  // Nature patterns
  static applyRootsPattern(
    index,
    totalCount,
    positions,
    velocities,
    spread,
    speed,
    time,
    particleData
  ) {
    const rootAngle = (index / totalCount) * Math.PI * 2;
    const rootLength = (index / totalCount) * spread * 0.5;
    // Apply vineEffect - more serpentine, organic movement
    const vineMultiplier = particleData.vineEffect ? 1.4 : 1.0;
    const branchOffset = Math.sin(time * 2 + index) * 0.3 * vineMultiplier;
    // Apply entanglement - complex interweaving patterns
    const entanglementFactor = particleData.entanglement || 0.9;
    const entangleOffset =
      Math.cos(time * 3 + index * 1.5) * entanglementFactor * 0.2;
    positions[0] =
      Math.cos(rootAngle) * (rootLength + branchOffset) + entangleOffset;
    positions[1] = -(index / totalCount) * spread * 0.4; // Grow downward
    positions[2] =
      Math.sin(rootAngle) * (rootLength + branchOffset) + entangleOffset;
    // Apply groundBurst - initial upward motion before settling
    const burstEffect = particleData.groundBurst && time < 0.5 ? 0.8 : 0;
    // Apply earthShake - subtle random vibration
    const shakeIntensity = (particleData.earthShake || 0.4) * 0.1;
    const shake = (Math.random() - 0.5) * shakeIntensity;
    velocities[0] = Math.cos(rootAngle) * speed * 0.4 + shake;
    velocities[1] = -speed * 0.3 + burstEffect + shake;
    velocities[2] = Math.sin(rootAngle) * speed * 0.4 + shake;
  }

  static applyBarrierPattern(
    index,
    totalCount,
    positions,
    velocities,
    spread,
    speed,
    time,
    particleData
  ) {
    const barrierAngle = (index / totalCount) * Math.PI * 2;
    const barrierRadius = spread * 0.6;
    // Apply crystalFormation - more structured, geometric positioning
    const crystalPrecision = particleData.crystalFormation ? 0.95 : 0.4;
    const barrierHeight = Math.sin(barrierAngle * 2) * crystalPrecision;
    // Apply armorPlating - more defensive arrangement
    const plateAlignment = particleData.armorPlating ? 0.9 : 0.6;
    const plateOffset = Math.cos(barrierAngle * 3) * (1 - plateAlignment) * 0.2;
    positions[0] = Math.cos(barrierAngle) * barrierRadius + plateOffset;
    positions[1] = barrierHeight;
    positions[2] = Math.sin(barrierAngle) * barrierRadius + plateOffset;
    // Apply defenseAura - steady, protective movement
    const auraStability = particleData.defenseAura || 1.0;
    // Apply fortification - more solid, less chaotic movement
    const fortificationLevel = particleData.fortification || 0.8;
    velocities[0] = Math.cos(barrierAngle) * speed * 0.2 * fortificationLevel;
    velocities[1] = Math.abs(Math.sin(time * 4)) * speed * 0.3 * auraStability;
    velocities[2] = Math.sin(barrierAngle) * speed * 0.2 * fortificationLevel;
  }

  static applyFangPattern(
    index,
    totalCount,
    positions,
    velocities,
    spread,
    speed,
    time,
    particleData
  ) {
    const fangAngle = (index / totalCount) * Math.PI * 0.3; // Narrow cone
    const fangRadius = (index / totalCount) * spread * 0.2;
    // Apply boneShards effect - more jagged, sharp movement
    const shardIntensity = particleData.boneShards ? 1.3 : 1.0;
    // Apply savageEffect - more aggressive positioning
    const savageOffset = particleData.savageEffect
      ? (Math.random() - 0.5) * 0.4
      : 0;
    positions[0] =
      Math.cos(fangAngle) * fangRadius * shardIntensity + savageOffset;
    positions[1] = (Math.random() - 0.5) * spread * 0.1;
    positions[2] =
      Math.sin(fangAngle) * fangRadius * shardIntensity + savageOffset;
    // Apply gnawing effect - erratic velocity changes
    const gnawingMultiplier = particleData.gnawing || 0.8;
    const gnawingVariation =
      Math.sin(time * 10 + index) * gnawingMultiplier * 0.3;
    velocities[0] = Math.cos(fangAngle) * speed * (1.2 + gnawingVariation);
    velocities[1] = (Math.random() - 0.5) * speed * 0.3 * shardIntensity;
    velocities[2] = Math.sin(fangAngle) * speed * (1.2 + gnawingVariation);
  }

  // Elemental patterns
  static applyIcePattern(
    index,
    totalCount,
    positions,
    velocities,
    spread,
    speed,
    time
  ) {
    const iceAngle = (index / totalCount) * Math.PI * 2;
    const iceRadius = spread * 0.4 + Math.sin(time * 2 + index) * 0.1;
    positions[0] = Math.cos(iceAngle) * iceRadius;
    positions[1] = (Math.random() - 0.5) * spread * 0.2;
    positions[2] = Math.sin(iceAngle) * iceRadius;
    velocities[0] = Math.cos(iceAngle) * speed * 0.3;
    velocities[1] = (Math.random() - 0.5) * speed * 0.2;
    velocities[2] = Math.sin(iceAngle) * speed * 0.3;
  }

  static applyFrostPattern(positions, velocities, spread, speed) {
    const frostSpread = (Math.random() - 0.5) * spread * 0.6;
    positions[0] = frostSpread;
    positions[1] = Math.abs(frostSpread) * 0.3;
    positions[2] = frostSpread;
    velocities[0] = (Math.random() - 0.5) * speed * 0.4;
    velocities[1] = -speed * 0.2;
    velocities[2] = (Math.random() - 0.5) * speed * 0.4;
  }

  static applyBlizzardPattern(positions, velocities, spread, speed) {
    const blizzardAngle = Math.random() * Math.PI * 2;
    const blizzardDistance = Math.random() * spread * 0.8;
    positions[0] = Math.cos(blizzardAngle) * blizzardDistance;
    positions[1] = (Math.random() - 0.5) * spread * 0.4;
    positions[2] = Math.sin(blizzardAngle) * blizzardDistance;
    velocities[0] = (Math.random() - 0.5) * speed * 0.8;
    velocities[1] = (Math.random() - 0.3) * speed * 0.6;
    velocities[2] = (Math.random() - 0.5) * speed * 0.8;
  }

  static applyLavaPattern(positions, velocities, spread, speed) {
    const lavaAngle = (Math.random() - 0.5) * Math.PI * 0.6;
    const lavaHeight = Math.random() * spread * 0.3;
    positions[0] = Math.sin(lavaAngle) * lavaHeight;
    positions[1] = lavaHeight;
    positions[2] = Math.cos(lavaAngle) * lavaHeight;
    velocities[0] = Math.sin(lavaAngle) * speed * 0.6;
    velocities[1] = speed * 1.2;
    velocities[2] = Math.cos(lavaAngle) * speed * 0.6;
  }

  static applyStonePattern(
    index,
    totalCount,
    positions,
    velocities,
    spread,
    speed
  ) {
    const stoneAngle = (index / totalCount) * Math.PI * 2;
    const stoneRadius = (Math.random() * 0.5 + 0.5) * spread * 0.3;
    positions[0] = Math.cos(stoneAngle) * stoneRadius;
    positions[1] = (Math.random() - 0.5) * spread * 0.2;
    positions[2] = Math.sin(stoneAngle) * stoneRadius;
    velocities[0] = Math.cos(stoneAngle) * speed * 0.5;
    velocities[1] = (Math.random() - 0.5) * speed * 0.3;
    velocities[2] = Math.sin(stoneAngle) * speed * 0.5;
  }

  static applyRockPattern(positions, velocities, spread, speed) {
    const rockAngle = (Math.random() - 0.5) * Math.PI;
    const rockDistance = Math.random() * spread * 0.4;
    positions[0] = Math.cos(rockAngle) * rockDistance;
    positions[1] = Math.random() * spread * 0.3;
    positions[2] = Math.sin(rockAngle) * rockDistance;
    velocities[0] = Math.cos(rockAngle) * speed * 0.7;
    velocities[1] = speed * 0.8;
    velocities[2] = Math.sin(rockAngle) * speed * 0.7;
  }

  // Combat patterns
  static applyBreathPattern(
    index,
    totalCount,
    positions,
    velocities,
    spread,
    speed
  ) {
    const breathAngle = (Math.random() - 0.5) * Math.PI * 0.4;
    const breathDistance = (index / totalCount) * spread * 0.6;
    positions[0] = Math.sin(breathAngle) * breathDistance * 0.3;
    positions[1] = (Math.random() - 0.5) * spread * 0.1;
    positions[2] = breathDistance;
    velocities[0] = Math.sin(breathAngle) * speed * 0.4;
    velocities[1] = (Math.random() - 0.5) * speed * 0.2;
    velocities[2] = speed * 1.0;
  }

  static applyDragonfirePattern(positions, velocities, spread, speed) {
    const fireAngle = (Math.random() - 0.5) * Math.PI * 0.5;
    const fireDistance = Math.random() * spread * 0.4;
    positions[0] = Math.sin(fireAngle) * fireDistance;
    positions[1] = Math.random() * spread * 0.2;
    positions[2] = fireDistance;
    velocities[0] = Math.sin(fireAngle) * speed * 0.6;
    velocities[1] = speed * 0.4;
    velocities[2] = speed * 1.2;
  }

  static applyTornadoPattern(
    index,
    totalCount,
    positions,
    velocities,
    spread,
    speed,
    time
  ) {
    const tornadoAngle = (index / totalCount) * Math.PI * 4 + time * 3;
    const tornadoRadius = (1 - index / totalCount) * spread * 0.4;
    const tornadoHeight = (index / totalCount) * spread * 0.8;
    positions[0] = Math.cos(tornadoAngle) * tornadoRadius;
    positions[1] = tornadoHeight;
    positions[2] = Math.sin(tornadoAngle) * tornadoRadius;
    velocities[0] = Math.cos(tornadoAngle + Math.PI / 2) * speed * 0.8;
    velocities[1] = speed * 0.6;
    velocities[2] = Math.sin(tornadoAngle + Math.PI / 2) * speed * 0.8;
  }

  static applyShadowPattern(positions, velocities, spread, speed) {
    const shadowAngle = (Math.random() - 0.5) * Math.PI * 2;
    const shadowDistance = Math.random() * spread * 0.5;
    positions[0] = Math.cos(shadowAngle) * shadowDistance;
    positions[1] = -Math.random() * spread * 0.2;
    positions[2] = Math.sin(shadowAngle) * shadowDistance;
    velocities[0] = Math.cos(shadowAngle) * speed * 0.4;
    velocities[1] = (Math.random() - 0.5) * speed * 0.3;
    velocities[2] = Math.sin(shadowAngle) * speed * 0.4;
  }

  static applyCursePattern(
    index,
    totalCount,
    positions,
    velocities,
    spread,
    speed,
    time
  ) {
    const curseAngle = (index / totalCount) * Math.PI * 2;
    const curseRadius = spread * 0.3 + Math.sin(time * 5 + index) * 0.1;
    positions[0] = Math.cos(curseAngle) * curseRadius;
    positions[1] = Math.sin(time * 4 + index) * 0.2;
    positions[2] = Math.sin(curseAngle) * curseRadius;
    velocities[0] = Math.cos(curseAngle) * speed * 0.3;
    velocities[1] = (Math.random() - 0.5) * speed * 0.4;
    velocities[2] = Math.sin(curseAngle) * speed * 0.3;
  }

  // Special patterns
  static applyEtherealPattern(
    index,
    totalCount,
    positions,
    velocities,
    spread,
    speed,
    time
  ) {
    const etherealAngle = (index / totalCount) * Math.PI * 2;
    const etherealRadius = spread * 0.4;
    const etherealFloat = Math.sin(time * 2 + index) * 0.3;
    positions[0] = Math.cos(etherealAngle) * etherealRadius;
    positions[1] = etherealFloat;
    positions[2] = Math.sin(etherealAngle) * etherealRadius;
    velocities[0] = Math.cos(etherealAngle + time) * speed * 0.2;
    velocities[1] = Math.sin(time * 3 + index) * speed * 0.3;
    velocities[2] = Math.sin(etherealAngle + time) * speed * 0.2;
  }

  static applyAncientPattern(
    index,
    totalCount,
    positions,
    velocities,
    spread,
    speed
  ) {
    const ancientAngle = (index / totalCount) * Math.PI * 2;
    const ancientRadius = spread * 0.5;
    positions[0] = Math.cos(ancientAngle) * ancientRadius;
    positions[1] = (Math.random() - 0.5) * spread * 0.1;
    positions[2] = Math.sin(ancientAngle) * ancientRadius;
    velocities[0] = Math.cos(ancientAngle) * speed * 0.4;
    velocities[1] = (Math.random() - 0.5) * speed * 0.2;
    velocities[2] = Math.sin(ancientAngle) * speed * 0.4;
  }

  static applyHuntingPattern(
    index,
    totalCount,
    positions,
    velocities,
    spread,
    speed
  ) {
    const huntAngle = (Math.random() - 0.5) * Math.PI * 0.3;
    const huntDistance = (index / totalCount) * spread * 0.7;
    positions[0] = Math.sin(huntAngle) * huntDistance * 0.2;
    positions[1] = (Math.random() - 0.5) * spread * 0.1;
    positions[2] = huntDistance;
    velocities[0] = Math.sin(huntAngle) * speed * 0.3;
    velocities[1] = (Math.random() - 0.5) * speed * 0.2;
    velocities[2] = speed * 0.9;
  }

  static applyClonePattern(
    index,
    totalCount,
    positions,
    velocities,
    spread,
    speed,
    time
  ) {
    const cloneAngle = (index / totalCount) * Math.PI * 2;
    const cloneRadius = spread * 0.3;
    const cloneOffset = Math.sin(time * 4 + index) * 0.2;
    positions[0] = Math.cos(cloneAngle) * (cloneRadius + cloneOffset);
    positions[1] = (Math.random() - 0.5) * spread * 0.2;
    positions[2] = Math.sin(cloneAngle) * (cloneRadius + cloneOffset);
    velocities[0] = Math.cos(cloneAngle) * speed * 0.4;
    velocities[1] = (Math.random() - 0.5) * speed * 0.3;
    velocities[2] = Math.sin(cloneAngle) * speed * 0.4;
  }

  static applyNinetailsPattern(
    index,
    totalCount,
    positions,
    velocities,
    spread,
    speed,
    time
  ) {
    const tailIndex = index % 9;
    const tailAngle = (tailIndex / 9) * Math.PI * 2;
    const tailLength = (index / totalCount) * spread * 0.6;
    const tailWave = Math.sin(time * 3 + tailIndex) * 0.2;
    positions[0] = Math.cos(tailAngle) * tailLength + tailWave;
    positions[1] = (Math.random() - 0.5) * spread * 0.1;
    positions[2] = Math.sin(tailAngle) * tailLength + tailWave;
    velocities[0] = Math.cos(tailAngle) * speed * 0.5;
    velocities[1] = (Math.random() - 0.5) * speed * 0.2;
    velocities[2] = Math.sin(tailAngle) * speed * 0.5;
  }
}
