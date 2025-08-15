import * as THREE from 'three';
import { BaseEntity } from '../base-entity.js';
import { SkillShape } from '../../utils/constants.js'; // SkillShapeをインポート

export class Skill extends BaseEntity {
  constructor(game, skillId, options = {}) {
    const skillData = game.data.skills[skillId];
    if (!skillData) {
      throw new Error(`Skill ID "${skillId}" not found in skills data`);
    }

    // effectデータに基づいてジオメトリとマテリアルを生成
    const { geometry, material } = Skill.createEffectMesh(skillData.effect);

    // BaseEntityに生成したジオメトリとマテリアルを渡す
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

  // skills.jsonの回転設定をキャラクターの向き基準で適用
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

      // キャラクターの向き + スキルの回転
      this.mesh.quaternion.copy(casterQuaternion).multiply(skillQuaternion);
    } else {
      // 回転設定がない場合はキャラクターの向きをそのまま適用
      this.mesh.quaternion.copy(casterQuaternion);
    }
  }
}
