// External libraries
import * as THREE from 'three';

// Utils
import {
  EffectColors,
  SkillShape,
  ParticlePatternTypes,
} from '../../utils/constants.js';

// Entities
import { BaseEntity } from '../base-entity.js';

// Global particle cleanup system
class ParticleManager {
  constructor() {
    this.lastCleanup = performance.now();
    this.cleanupInterval = 3000; // Cleanup every 3 seconds
  }

  globalCleanup(game) {
    const now = performance.now();
    if (now - this.lastCleanup < this.cleanupInterval) return;

    this.lastCleanup = now;

    // Force cleanup any orphaned particles in the scene
    if (game && game.sceneManager && game.sceneManager.scene) {
      const scene = game.sceneManager.scene;
      const objectsToRemove = [];

      scene.traverse((child) => {
        if (child.userData && child.userData.isSkillParticle) {
          const age = (now - (child.userData.creationTime || 0)) / 1000;
          if (age > 5) {
            // Remove particles older than 5 seconds
            objectsToRemove.push(child);
          }
        }
      });

      objectsToRemove.forEach((obj) => {
        scene.remove(obj);
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      });
    }
  }
}

const globalParticleManager = new ParticleManager();

// Cache for particle textures to improve performance
const particleTextureCache = new Map();

export class Skill extends BaseEntity {
  constructor(game, skillId, options = {}) {
    const skillData = game.data.skills[skillId];
    if (!skillData) {
      throw new Error(`Skill ID "${skillId}" not found in skills data`);
    }

    // Generate geometry and material based on effect data
    const { geometry, material } = Skill.createEffectMesh(
      skillData.effect || {}
    );

    // Pass the generated geometry and material to BaseEntity
    super(game, skillId, skillData, geometry, material, options);

    // Initialize particle system
    this.particleSystem = null;
    this.trailSystem = null;
    this.particleGroups = [];

    // Create particle and trail systems if defined
    if (skillData.effect?.particle) {
      this.createParticleSystem(skillData.effect.particle);
    }

    if (skillData.effect?.trail) {
      this.initTrailSystem(skillData.effect.trail);
    }
  }

  static createEffectMesh(effectData) {
    let geometry;
    let material;
    const color = new THREE.Color(effectData.color);

    switch (effectData.shape) {
      case SkillShape.BOX:
        geometry = new THREE.BoxGeometry(
          effectData.size || 1,
          effectData.size || 1,
          effectData.size || 1
        );
        material = new THREE.MeshBasicMaterial({
          color: color,
          transparent: true,
          opacity: effectData.opacity || 1.0,
        });
        break;
      case SkillShape.CAPSULE:
        geometry = new THREE.CapsuleGeometry(
          effectData.radius || 0.5,
          effectData.length || 1,
          4,
          8
        );
        material = new THREE.MeshBasicMaterial({
          color: color,
          transparent: true,
          opacity: effectData.opacity || 1.0,
        });
        break;
      case SkillShape.CONE:
        geometry = new THREE.ConeGeometry(
          effectData.size || 1,
          effectData.size * 2 || 2,
          32
        );
        material = new THREE.MeshBasicMaterial({
          color: color,
          transparent: true,
          opacity: effectData.opacity || 1.0,
        });
        break;
      case SkillShape.CYLINDER:
        geometry = new THREE.CylinderGeometry(
          effectData.radiusTop || 0.5,
          effectData.radiusBottom || 0.5,
          effectData.height || 1,
          32
        );
        material = new THREE.MeshBasicMaterial({
          color: color,
          transparent: true,
          opacity: effectData.opacity || 1.0,
        });
        break;
      case SkillShape.DODECAHEDRON:
        geometry = new THREE.DodecahedronGeometry(effectData.radius || 1);
        material = new THREE.MeshBasicMaterial({
          color: color,
          transparent: true,
          opacity: effectData.opacity || 1.0,
        });
        break;
      case SkillShape.ICOSAHEDRON:
        geometry = new THREE.IcosahedronGeometry(effectData.radius || 1);
        material = new THREE.MeshBasicMaterial({
          color: color,
          transparent: true,
          opacity: effectData.opacity || 1.0,
        });
        break;
      case SkillShape.OCTAHEDRON:
        geometry = new THREE.OctahedronGeometry(effectData.radius || 1);
        material = new THREE.MeshBasicMaterial({
          color: color,
          transparent: true,
          opacity: effectData.opacity || 1.0,
        });
        break;
      case SkillShape.PLANE:
        geometry = new THREE.PlaneGeometry(
          effectData.width || 1,
          effectData.height || 1
        );
        material = new THREE.MeshBasicMaterial({
          color: color,
          transparent: true,
          opacity: effectData.opacity || 1.0,
          side: THREE.DoubleSide,
        });
        break;
      case SkillShape.RING:
        geometry = new THREE.RingGeometry(
          effectData.size * 0.5 || 0.5,
          effectData.size || 1,
          32
        );
        material = new THREE.MeshBasicMaterial({
          color: color,
          transparent: true,
          opacity: effectData.opacity || 1.0,
          side: THREE.DoubleSide,
        });
        break;
      case SkillShape.SPHERE:
        geometry = new THREE.SphereGeometry(effectData.size || 1, 32, 32);
        material = new THREE.MeshBasicMaterial({
          color: color,
          transparent: true,
          opacity: effectData.opacity || 1.0,
        });
        break;
      case SkillShape.TETRAHEDRON:
        geometry = new THREE.TetrahedronGeometry(effectData.radius || 1);
        material = new THREE.MeshBasicMaterial({
          color: color,
          transparent: true,
          opacity: effectData.opacity || 1.0,
        });
        break;
      case SkillShape.TORUS:
        geometry = new THREE.TorusGeometry(
          effectData.radius || 1,
          effectData.tube || 0.4,
          16,
          100
        );
        material = new THREE.MeshBasicMaterial({
          color: color,
          transparent: true,
          opacity: effectData.opacity || 1.0,
        });
        break;
      case SkillShape.TORUS_KNOT:
        geometry = new THREE.TorusKnotGeometry(
          effectData.radius || 1,
          effectData.tube || 0.4,
          64,
          8
        );
        material = new THREE.MeshBasicMaterial({
          color: color,
          transparent: true,
          opacity: effectData.opacity || 1.0,
        });
        break;
      default:
        console.warn(
          `Unknown effect shape: ${effectData.shape}. Using default sphere.`
        );
        geometry = new THREE.SphereGeometry(1, 32, 32);
        material = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.5,
        });
        break;
    }
    return { geometry, material };
  }

  // Create particle system based on skill effect data
  createParticleSystem(particleData) {
    // Clone to avoid mutating shared JSON in game.data
    try {
      this.particleData =
        typeof structuredClone === 'function'
          ? structuredClone(particleData)
          : JSON.parse(JSON.stringify(particleData));
    } catch {
      // Fallback to shallow clone if deep clone fails (e.g., on circular refs)
      this.particleData = { ...particleData };
    }

    this.particleEmissionRate = 0.05; // Emit particles every 50ms for balanced effect
    this.lastParticleEmission = 0;
    this.activeParticles = [];
  }

  // Emit particles for projectiles
  emitParticles(deltaTime) {
    if (!this.particleData) return;

    this.lastParticleEmission += deltaTime;

    // Emit new particles at regular intervals for projectiles
    if (this.lastParticleEmission >= this.particleEmissionRate) {
      this.lastParticleEmission = 0;

      // Apply fade ratio if projectile is ending
      const fadeRatio = this.particleData.fadeRatio ?? 1.0;
      const baseCount = Math.min(6, this.particleData.count / 20); // Increased emission rate
      const count = Math.max(1, Math.floor(baseCount * fadeRatio)); // Gradually reduce emission
      // Use JSON values with minimal fallbacks
      const color = new THREE.Color(this.particleData.color || '#FFFFFF');
      const spread = this.particleData.spread ?? 1.0;
      const speed = this.particleData.speed ?? 1.0;
      const particleSize = this.particleData.size ?? 0.1;
      const baseLifetime = this.particleData.lifetime ?? 0.5;
      const gravity = this.particleData.gravity ?? 1.0;

      for (let i = 0; i < count; i++) {
        const positions = new Float32Array(3);
        const velocities = new Float32Array(3);
        const colors = new Float32Array(3);

        // Apply pattern-based positioning and velocity
        this.applyParticlePattern(
          positions,
          velocities,
          i,
          count,
          spread,
          speed
        );

        // Set particle color with subtle variation
        const colorVariation = 0.15;
        colors[0] = Math.min(
          1.0,
          Math.max(0.1, color.r + (Math.random() - 0.5) * colorVariation)
        );
        colors[1] = Math.min(
          1.0,
          Math.max(0.1, color.g + (Math.random() - 0.5) * colorVariation)
        );
        colors[2] = Math.min(
          1.0,
          Math.max(0.1, color.b + (Math.random() - 0.5) * colorVariation)
        );

        const particle = {
          position: new THREE.Vector3().fromArray(positions),
          velocity: new THREE.Vector3().fromArray(velocities),
          color: new THREE.Color().fromArray(colors),
          lifespan: baseLifetime * (0.8 + Math.random() * 0.4), // 80%-120% of base lifetime
          maxLifespan: baseLifetime,
          size: particleSize * (0.7 + Math.random() * 0.6), // Size variation for naturalness
          gravity: gravity,
          creationTime: performance.now(), // Add creation timestamp
          fadeRatio: fadeRatio, // Inherit fade ratio from projectile
        };

        this.createSingleParticle(particle);
        this.activeParticles.push(particle);
      }
    }

    // Update existing particles
    this.updateActiveParticles(deltaTime);
  }

  // Create a single particle mesh with soft blurring effect
  createSingleParticle(particleData) {
    // Use cached texture for performance
    const textureKey = 'soft-particle';
    let texture = particleTextureCache.get(textureKey);

    if (!texture) {
      // Create a soft circular texture programmatically
      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      const context = canvas.getContext('2d');

      // Create radial gradient for soft blur effect
      const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
      gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.9)');
      gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.7)');
      gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.3)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0.0)');

      context.fillStyle = gradient;
      context.fillRect(0, 0, 32, 32);

      texture = new THREE.CanvasTexture(canvas);
      particleTextureCache.set(textureKey, texture);
    }

    // Apply special effects based on particle data
    const materialOptions = {
      map: texture,
      color: particleData.color,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    };

    // Apply glow effect
    if (this.particleData.glowEffect) {
      materialOptions.opacity = Math.min(1.0, materialOptions.opacity * 1.3);
      materialOptions.color = materialOptions.color.clone().multiplyScalar(1.2);
    }

    // Apply sparkle effect
    if (this.particleData.sparkleEffect) {
      const sparkleIntensity = Math.sin(performance.now() * 0.01) * 0.3 + 0.7;
      materialOptions.opacity *= sparkleIntensity;
    }

    const material = new THREE.SpriteMaterial(materialOptions);

    const sprite = new THREE.Sprite(material);

    // Apply size modifications based on effects
    let sizeMultiplier = 6;
    if (this.particleData.pattern === ParticlePatternTypes.EXPLOSION) {
      sizeMultiplier *= 1.5;
    } else if (
      this.particleData.pattern === ParticlePatternTypes.CLOUD ||
      this.particleData.mistEffect
    ) {
      sizeMultiplier *= 0.7;
    }

    sprite.scale.setScalar(particleData.size * sizeMultiplier);

    const worldPos = new THREE.Vector3();
    this.mesh.getWorldPosition(worldPos);
    sprite.position.copy(worldPos).add(particleData.position);

    // Add metadata for global cleanup
    sprite.userData = {
      isSkillParticle: true,
      creationTime: particleData.creationTime,
      maxLifetime: particleData.maxLifespan * 1000, // Convert to ms
    };

    this.game.sceneManager.add(sprite);
    particleData.mesh = sprite;
  }

  // Update active particles with aggressive cleanup
  updateActiveParticles(deltaTime) {
    const currentTime = performance.now();

    for (let i = this.activeParticles.length - 1; i >= 0; i--) {
      const particle = this.activeParticles[i];
      particle.lifespan -= deltaTime;

      // Double check with creation time for safety
      const ageInSeconds = (currentTime - particle.creationTime) / 1000;
      const shouldRemove =
        particle.lifespan <= 0 || ageInSeconds > particle.maxLifespan * 2;

      if (shouldRemove) {
        // Remove expired particle
        if (particle.mesh) {
          this.game.sceneManager.remove(particle.mesh);
          if (particle.mesh.geometry) particle.mesh.geometry.dispose();
          if (particle.mesh.material) particle.mesh.material.dispose();
          particle.mesh = null;
        }
        this.activeParticles.splice(i, 1);
      } else {
        // Update particle
        if (particle.mesh) {
          particle.velocity.y -= particle.gravity * deltaTime;
          particle.mesh.position.add(
            particle.velocity.clone().multiplyScalar(deltaTime)
          );

          // Update opacity with smooth fade out
          const lifespanRatio = particle.lifespan / particle.maxLifespan;
          const fadeRatio = particle.fadeRatio ?? 1.0;

          // Combine lifespan fade and projectile fade for natural effect
          const finalOpacity = Math.pow(lifespanRatio, 0.5) * fadeRatio * 0.9;
          particle.mesh.material.opacity = Math.max(0.02, finalOpacity);

          // Add subtle scale animation for more dynamic effect
          const scaleVariation =
            1.0 +
            Math.sin(
              performance.now() * 0.005 + particle.creationTime * 0.001
            ) *
              0.1;
          particle.mesh.scale.setScalar(particle.size * 6 * scaleVariation);
        }
      }
    }
  }

  // Initialize trail system
  initTrailSystem(trailData) {
    // Use JSON values with minimal fallbacks
    const length = trailData.length ?? 2.0;
    const opacity = trailData.opacity ?? 0.8;
    const segments = trailData.segments ?? 10;
    const width = trailData.width ?? 0.1;

    this.trailSystem = {
      length,
      opacity,
      color: new THREE.Color(trailData.color || '#FFFFFF'),
      width,
      segments,
      positions: [],
      maxPositions: Math.max(10, Math.floor(length * segments)),
      fadeRatio: 1.0,
      worldMesh: null, // Will be added to scene directly
    };
  }

  // Update particle system animation
  updateParticleSystem(deltaTime) {
    if (!this.particleSystem) return;

    const userData = this.particleSystem.userData;
    const positions = this.particleSystem.geometry.attributes.position.array;
    const velocities = userData.velocities;
    const lifespans = userData.lifespans;
    const maxLifespans = userData.maxLifespans;
    const gravity = userData.gravity || 2.0;

    userData.time += deltaTime;

    const count = positions.length / 3;
    let allExpired = true;
    let totalLifespanRatio = 0;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // Decrease lifespan
      lifespans[i] -= deltaTime;

      if (lifespans[i] > 0) {
        allExpired = false;

        // Update position based on velocity
        positions[i3] += velocities[i3] * deltaTime;
        positions[i3 + 1] += velocities[i3 + 1] * deltaTime;
        positions[i3 + 2] += velocities[i3 + 2] * deltaTime;

        // Apply customizable gravity effect
        velocities[i3 + 1] -= gravity * deltaTime;

        // Calculate average lifespan ratio for overall opacity
        const lifespanRatio = lifespans[i] / maxLifespans[i];
        totalLifespanRatio += lifespanRatio;
      }
    }

    // Update overall opacity based on average lifespan
    if (!allExpired) {
      const avgLifespanRatio = totalLifespanRatio / count;
      this.particleSystem.material.opacity = Math.max(
        0.1,
        avgLifespanRatio * 0.8
      );
    }

    // Mark for update
    this.particleSystem.geometry.attributes.position.needsUpdate = true;

    // Remove particle system when all particles are expired
    if (allExpired && this.mesh) {
      this.mesh.remove(this.particleSystem);
      this.particleSystem.geometry.dispose();
      this.particleSystem.material.dispose();
      this.particleSystem = null;
    }
  }

  // Update trail system
  updateTrailSystem() {
    if (!this.trailSystem || !this.mesh) return;

    // Get world position of the skill
    const worldPosition = new THREE.Vector3();
    this.mesh.getWorldPosition(worldPosition);

    // Add current world position to trail more frequently for smoother trail
    this.trailSystem.positions.push(worldPosition.clone());

    // Limit trail length based on configured length
    while (this.trailSystem.positions.length > this.trailSystem.maxPositions) {
      this.trailSystem.positions.shift();
    }

    // Update trail visual more frequently for better responsiveness
    if (this.trailSystem.positions.length > 1) {
      this.updateTrailMesh();
    }
  }

  // Create or update trail mesh
  updateTrailMesh() {
    if (!this.trailSystem) return;

    // Lazily create trail once and update attributes in-place
    let line = this.trailSystem.worldMesh;
    if (!line) {
      const geometry = new THREE.BufferGeometry();
      const material = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        blending: THREE.AdditiveBlending,
        opacity: this.trailSystem.opacity * (this.trailSystem.fadeRatio ?? 1),
      });
      line = new THREE.Line(geometry, material);
      this.game.sceneManager.add(line);
      this.trailSystem.worldMesh = line;
    } else {
      // Update overall opacity
      line.material.opacity =
        this.trailSystem.opacity * (this.trailSystem.fadeRatio ?? 1);
    }

    const positions = this.trailSystem.positions;
    if (positions.length < 2) return;

    // Create simple line trail for better performance and visibility
    const points = [];
    const colors = [];

    // Create smoother trail with segments
    const segmentCount = Math.min(this.trailSystem.segments, positions.length);

    for (let i = 0; i < segmentCount; i++) {
      const ratio = i / (segmentCount - 1);
      const posIndex = Math.floor(ratio * (positions.length - 1));
      const position = positions[posIndex];

      points.push(position.x, position.y, position.z);

      // Encode RGB only; LineBasicMaterial ignores per-vertex alpha
      const t = Math.pow(ratio, 0.5);
      colors.push(
        this.trailSystem.color.r * t,
        this.trailSystem.color.g * t,
        this.trailSystem.color.b * t
      );
    }

    // Update the existing geometry attributes on the single, persistent line
    const geom = line.geometry;
    geom.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geom.attributes.position.needsUpdate = true;
    geom.attributes.color.needsUpdate = true;
  }

  applyRotation(casterQuaternion) {
    const skillData = this.data;

    if (skillData.effect?.rotation) {
      const skillRotation = new THREE.Euler(
        skillData.effect.rotation.x || 0,
        skillData.effect.rotation.y || 0,
        skillData.effect.rotation.z || 0
      );
      const skillQuaternion = new THREE.Quaternion().setFromEuler(
        skillRotation
      );

      this.mesh.quaternion.copy(casterQuaternion).multiply(skillQuaternion);
    } else {
      this.mesh.quaternion.copy(casterQuaternion);
    }
  }

  // Apply debuffs to target (common method for all skill types)
  applyDebuffToTarget(target) {
    if (this.data.debuffs && target.applyDebuff) {
      this.data.debuffs.forEach((debuffData) => {
        const debuffConfig = {
          ...debuffData,
          name: this.data.name,
          icon: this.data.image,
        };

        target.applyDebuff(debuffConfig);
      });
    }
  }

  // Apply different particle patterns based on effect data
  applyParticlePattern(
    positions,
    velocities,
    index,
    totalCount,
    spread,
    speed
  ) {
    const pattern = this.particleData.pattern || ParticlePatternTypes.DEFAULT;
    const time = performance.now() * 0.001; // Current time in seconds

    switch (pattern) {
      case ParticlePatternTypes.SPIRAL: {
        const spiralAngle = (index / totalCount) * Math.PI * 4 + time * 2;
        const spiralRadius = (index / totalCount) * spread * 0.3;
        positions[0] = Math.cos(spiralAngle) * spiralRadius;
        positions[1] = Math.sin(time * 3) * 0.5;
        positions[2] = Math.sin(spiralAngle) * spiralRadius;
        velocities[0] = Math.cos(spiralAngle) * speed * 0.3;
        velocities[1] = speed * 0.8;
        velocities[2] = Math.sin(spiralAngle) * speed * 0.3;
        break;
      }

      case ParticlePatternTypes.HELIX: {
        const helixAngle = (index / totalCount) * Math.PI * 6 + time;
        const helixRadius = spread * 0.3;
        positions[0] = Math.cos(helixAngle) * helixRadius;
        positions[1] = (index / totalCount) * 2 - 1;
        positions[2] = Math.sin(helixAngle) * helixRadius;
        velocities[0] = Math.cos(helixAngle + Math.PI / 2) * speed * 0.4;
        velocities[1] = speed * 0.5;
        velocities[2] = Math.sin(helixAngle + Math.PI / 2) * speed * 0.4;
        break;
      }

      case ParticlePatternTypes.EXPLOSION: {
        const explosionAngle = (index / totalCount) * Math.PI * 2;
        const explosionPitch = (Math.random() - 0.5) * Math.PI;
        positions[0] = (Math.random() - 0.5) * spread * 0.1;
        positions[1] = (Math.random() - 0.5) * spread * 0.1;
        positions[2] = (Math.random() - 0.5) * spread * 0.1;
        velocities[0] =
          Math.cos(explosionAngle) * Math.cos(explosionPitch) * speed;
        velocities[1] = Math.sin(explosionPitch) * speed * 0.7;
        velocities[2] =
          Math.sin(explosionAngle) * Math.cos(explosionPitch) * speed;
        break;
      }

      case ParticlePatternTypes.SOUNDWAVE: {
        const waveAngle = (index / totalCount) * Math.PI * 2;
        const waveRadius = (Math.random() * 0.5 + 0.5) * spread * 0.4;
        const coneHeight = Math.sin((Math.PI * 0.4) / 2);
        positions[0] = Math.cos(waveAngle) * waveRadius;
        positions[1] = (Math.random() - 0.5) * coneHeight;
        positions[2] = Math.sin(waveAngle) * waveRadius;
        velocities[0] = Math.cos(waveAngle) * speed * 0.6;
        velocities[1] = (Math.random() - 0.5) * speed * 0.3;
        velocities[2] = Math.sin(waveAngle) * speed * 0.6;
        break;
      }

      case ParticlePatternTypes.SPRAY: {
        const coneAngle = (Math.random() - 0.5) * Math.PI * 0.4;
        const conePitch = (Math.random() - 0.5) * Math.PI * 0.2;
        positions[0] = (Math.random() - 0.5) * spread * 0.1;
        positions[1] = (Math.random() - 0.5) * spread * 0.1;
        positions[2] = (Math.random() - 0.5) * spread * 0.1;
        velocities[0] = Math.sin(coneAngle) * speed * 0.8;
        velocities[1] = Math.sin(conePitch) * speed * 0.4;
        velocities[2] = Math.cos(coneAngle) * speed * 0.8;
        break;
      }

      case ParticlePatternTypes.CLOUD: {
        positions[0] = (Math.random() - 0.5) * spread * 0.8;
        positions[1] = (Math.random() - 0.5) * spread * 0.3;
        positions[2] = (Math.random() - 0.5) * spread * 0.8;
        velocities[0] = (Math.random() - 0.5) * speed * 0.2;
        velocities[1] = Math.random() * speed * 0.1;
        velocities[2] = (Math.random() - 0.5) * speed * 0.2;
        break;
      }

      case ParticlePatternTypes.SONIC: {
        const sonicAngle = (index / totalCount) * Math.PI * 2;
        // Apply soundRipples effect - more pronounced wave patterns
        const rippleIntensity = this.particleData.soundRipples ? 1.5 : 1.0;
        // Apply wildness - more chaotic movement
        const wildnessMultiplier = this.particleData.wildness || 1.0;
        const waveRadius =
          Math.sin(time * 8 + index * 0.5) * spread * 0.3 * rippleIntensity +
          spread * 0.4;
        positions[0] = Math.cos(sonicAngle) * waveRadius;
        positions[1] =
          Math.sin(time * 6 + index * 0.3) * 0.6 * wildnessMultiplier;
        positions[2] = Math.sin(sonicAngle) * waveRadius;
        // Apply canineRage - more aggressive movement
        const rageMultiplier = (this.particleData.canineRage || 1.0) * 0.9;
        velocities[0] = Math.cos(sonicAngle) * speed * 0.8 * rageMultiplier;
        velocities[1] =
          (Math.random() - 0.5) * speed * 0.4 * wildnessMultiplier;
        velocities[2] = Math.sin(sonicAngle) * speed * 0.8 * rageMultiplier;
        break;
      }

      case ParticlePatternTypes.FANG: {
        const fangAngle = (index / totalCount) * Math.PI * 0.3; // Narrow cone
        const fangRadius = (index / totalCount) * spread * 0.2;
        // Apply boneShards effect - more jagged, sharp movement
        const shardIntensity = this.particleData.boneShards ? 1.3 : 1.0;
        // Apply savageEffect - more aggressive positioning
        const savageOffset = this.particleData.savageEffect
          ? (Math.random() - 0.5) * 0.4
          : 0;
        positions[0] =
          Math.cos(fangAngle) * fangRadius * shardIntensity + savageOffset;
        positions[1] = (Math.random() - 0.5) * spread * 0.1;
        positions[2] =
          Math.sin(fangAngle) * fangRadius * shardIntensity + savageOffset;
        // Apply gnawing effect - erratic velocity changes
        const gnawingMultiplier = this.particleData.gnawing || 0.8;
        const gnawingVariation =
          Math.sin(time * 10 + index) * gnawingMultiplier * 0.3;
        velocities[0] = Math.cos(fangAngle) * speed * (1.2 + gnawingVariation);
        velocities[1] = (Math.random() - 0.5) * speed * 0.3 * shardIntensity;
        velocities[2] = Math.sin(fangAngle) * speed * (1.2 + gnawingVariation);
        break;
      }

      case ParticlePatternTypes.ROOTS: {
        const rootAngle = (index / totalCount) * Math.PI * 2;
        const rootLength = (index / totalCount) * spread * 0.5;
        // Apply vineEffect - more serpentine, organic movement
        const vineMultiplier = this.particleData.vineEffect ? 1.4 : 1.0;
        const branchOffset = Math.sin(time * 2 + index) * 0.3 * vineMultiplier;
        // Apply entanglement - complex interweaving patterns
        const entanglementFactor = this.particleData.entanglement || 0.9;
        const entangleOffset =
          Math.cos(time * 3 + index * 1.5) * entanglementFactor * 0.2;
        positions[0] =
          Math.cos(rootAngle) * (rootLength + branchOffset) + entangleOffset;
        positions[1] = -(index / totalCount) * spread * 0.4; // Grow downward
        positions[2] =
          Math.sin(rootAngle) * (rootLength + branchOffset) + entangleOffset;
        // Apply groundBurst - initial upward motion before settling
        const burstEffect =
          this.particleData.groundBurst && time < 0.5 ? 0.8 : 0;
        // Apply earthShake - subtle random vibration
        const shakeIntensity = (this.particleData.earthShake || 0.4) * 0.1;
        const shake = (Math.random() - 0.5) * shakeIntensity;
        velocities[0] = Math.cos(rootAngle) * speed * 0.4 + shake;
        velocities[1] = -speed * 0.3 + burstEffect + shake;
        velocities[2] = Math.sin(rootAngle) * speed * 0.4 + shake;
        break;
      }

      case ParticlePatternTypes.BARRIER: {
        const barrierAngle = (index / totalCount) * Math.PI * 2;
        const barrierRadius = spread * 0.6;
        // Apply crystalFormation - more structured, geometric positioning
        const crystalPrecision = this.particleData.crystalFormation
          ? 0.95
          : 0.4;
        const barrierHeight = Math.sin(barrierAngle * 2) * crystalPrecision;
        // Apply armorPlating - more defensive arrangement
        const plateAlignment = this.particleData.armorPlating ? 0.9 : 0.6;
        const plateOffset =
          Math.cos(barrierAngle * 3) * (1 - plateAlignment) * 0.2;
        positions[0] = Math.cos(barrierAngle) * barrierRadius + plateOffset;
        positions[1] = barrierHeight;
        positions[2] = Math.sin(barrierAngle) * barrierRadius + plateOffset;
        // Apply defenseAura - steady, protective movement
        const auraStability = this.particleData.defenseAura || 1.0;
        // Apply fortification - more solid, less chaotic movement
        const fortificationLevel = this.particleData.fortification || 0.8;
        velocities[0] =
          Math.cos(barrierAngle) * speed * 0.2 * fortificationLevel;
        velocities[1] =
          Math.abs(Math.sin(time * 4)) * speed * 0.3 * auraStability;
        velocities[2] =
          Math.sin(barrierAngle) * speed * 0.2 * fortificationLevel;
        break;
      }

      default: // Original random pattern
        positions[0] = (Math.random() - 0.5) * spread * 0.2;
        positions[1] = (Math.random() - 0.5) * spread * 0.2;
        positions[2] = (Math.random() - 0.5) * spread * 0.2;
        velocities[0] = (Math.random() - 0.5) * speed * 0.5;
        velocities[1] = (Math.random() - 0.5) * speed * 0.5;
        velocities[2] = (Math.random() - 0.5) * speed * 0.5;
        break;
    }
  }

  // Update method for particle and trail systems
  update(deltaTime) {
    // Run global particle cleanup periodically
    globalParticleManager.globalCleanup(this.game);

    if (this.particleData) {
      this.emitParticles(deltaTime);
    }

    if (this.trailSystem) {
      this.updateTrailSystem();
    }
  }

  // Clean up resources
  dispose() {
    // Clean up active particles with null safety
    if (this.activeParticles) {
      this.activeParticles.forEach((particle) => {
        if (particle && particle.mesh) {
          this.game.sceneManager.remove(particle.mesh);
          if (
            particle.mesh.geometry &&
            typeof particle.mesh.geometry.dispose === 'function'
          ) {
            particle.mesh.geometry.dispose();
          }
          if (
            particle.mesh.material &&
            typeof particle.mesh.material.dispose === 'function'
          ) {
            particle.mesh.material.dispose();
          }
        }
      });
      this.activeParticles = [];
    }

    // Clean up old particle system (legacy) with safe disposal
    if (this.particleSystem) {
      if (
        this.particleSystem.geometry &&
        typeof this.particleSystem.geometry.dispose === 'function'
      ) {
        this.particleSystem.geometry.dispose();
      }
      if (
        this.particleSystem.material &&
        typeof this.particleSystem.material.dispose === 'function'
      ) {
        this.particleSystem.material.dispose();
      }
      this.particleSystem = null; // Prevent duplicate disposal
    }

    // Clean up trail system with enhanced safety
    if (this.trailSystem && this.trailSystem.worldMesh) {
      this.game.sceneManager.remove(this.trailSystem.worldMesh);
      if (
        this.trailSystem.worldMesh.geometry &&
        typeof this.trailSystem.worldMesh.geometry.dispose === 'function'
      ) {
        this.trailSystem.worldMesh.geometry.dispose();
      }
      if (
        this.trailSystem.worldMesh.material &&
        typeof this.trailSystem.worldMesh.material.dispose === 'function'
      ) {
        this.trailSystem.worldMesh.material.dispose();
      }
      this.trailSystem.worldMesh = null;
      this.trailSystem = null; // Prevent duplicate disposal
    }
  }

  // Common damage effect display
  showDamageEffect(position) {
    const effectGeometry = new THREE.SphereGeometry(0.3, 8, 8);
    const effectMaterial = new THREE.MeshBasicMaterial({
      color: EffectColors.DAMAGE,
      transparent: true,
      opacity: 0.8,
    });
    const effectMesh = new THREE.Mesh(effectGeometry, effectMaterial);

    effectMesh.position.copy(position);
    effectMesh.position.y += 1.0;
    this.game.sceneManager.add(effectMesh);

    // Animate and remove effect
    let scale = 1.0;
    const animate = () => {
      scale += 0.1;
      effectMesh.scale.setScalar(scale);
      effectMaterial.opacity -= 0.05;

      if (effectMaterial.opacity > 0) {
        requestAnimationFrame(animate);
      } else {
        this.game.sceneManager.remove(effectMesh);
        effectGeometry.dispose();
        effectMaterial.dispose();
      }
    };
    animate();
  }

  // Force cleanup all particles (consolidated from subclasses)
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
}
