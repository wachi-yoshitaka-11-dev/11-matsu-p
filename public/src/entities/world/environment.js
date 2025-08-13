import * as THREE from 'three';
import { BaseEntity } from '../base-entity.js';
import { EnvironmentTypes } from '../../utils/constants.js';

export class Environment extends BaseEntity {
  constructor(game, envId, position, options = {}) {
    const envData = game.data.environments[envId];
    if (!envData) {
      throw new Error(
        `Environment ID "${envId}" not found in environment data`
      );
    }

    const textureName = envData.texture.replace('.png', '');
    const texture = game.assetLoader.getTexture(textureName);

    let geometry, material;
    // Get environment type from data (now properly separated from ID)
    const envType = envData.type;

    switch (envType) {
      case EnvironmentTypes.CLOUD:
        material = new THREE.SpriteMaterial({
          map: texture,
          transparent: true,
          opacity: options.opacity || 1.0,
          alphaTest: 0.1,
        });
        geometry = new THREE.PlaneGeometry(1, 1);
        super(game, envId, envData, geometry, material);
        this.mesh = new THREE.Sprite(material);
        this.mesh.position.copy(position);
        this.mesh.scale.set(
          options.scale?.x || 10,
          options.scale?.y || 5,
          options.scale?.z || 1
        );
        break;
      case EnvironmentTypes.GROUND:
        geometry = new THREE.PlaneGeometry(
          options.width || 1,
          options.height || 1
        );
        material = new THREE.MeshStandardMaterial({
          map: texture,
          transparent: true,
        });
        super(game, envId, envData, geometry, material);
        this.mesh.position.copy(position);
        this.mesh.rotation.x = -Math.PI / 2;
        break;
      default:
        throw new Error(`Unknown environment type: ${envType}`);
    }
  }
}
