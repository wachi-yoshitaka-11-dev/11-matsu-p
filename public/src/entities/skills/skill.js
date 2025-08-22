// External libraries
import * as THREE from 'three';

// Utils
import { EffectColors, SkillShape } from '../../utils/constants.js';

// Entities
import { BaseEntity } from '../base-entity.js';

export class Skill extends BaseEntity {
  constructor(game, skillId, options = {}) {
    const skillData = game.data.skills[skillId];
    if (!skillData) {
      throw new Error(`Skill ID "${skillId}" not found in skills data`);
    }

    // Generate geometry and material based on effect data
    const { geometry, material } = Skill.createEffectMesh(skillData.effect);

    // Pass the generated geometry and material to BaseEntity
    super(game, skillId, skillData, geometry, material, options);
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
}
