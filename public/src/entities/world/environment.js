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
        // Check if model file is specified (future: glb file support)
        if (envData.model) {
          // TODO: Load glb model when model is specified
          throw new Error('GLB model loading for ground not yet implemented');
        } else {
          // Create geometry based on options
          if (options.circle) {
            // Circular ground geometry
            const radius = options.scale ? options.scale / 2 : 100;
            const segments = options.segments || 50;
            geometry = new THREE.CircleGeometry(radius, segments);
          } else {
            // Current: Create geometry (custom or default)
            geometry =
              options.geometry ||
              new THREE.PlaneGeometry(
                options.width || 100,
                options.height || 100,
                options.segments || 50,
                options.segments || 50
              );
          }

          // Apply rotation if geometry wasn't pre-rotated
          if (!options.geometry) {
            geometry.rotateX(-Math.PI / 2);

            // Generate height variations only for non-circular geometry
            if (!options.circle) {
              const vertices = geometry.attributes.position.array;
              for (let i = 0; i < vertices.length; i += 3) {
                const x = vertices[i];
                const z = vertices[i + 2];
                const y = Math.sin(x * 0.1) * 2 + Math.cos(z * 0.1) * 2;
                vertices[i + 1] = y;
              }
              geometry.attributes.position.needsUpdate = true;
            }
            geometry.computeVertexNormals();
          }
        }

        // Apply texture wrapping settings if specified
        if (texture && options.textureRepeat) {
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.RepeatWrapping;
          texture.repeat.set(
            options.textureRepeat.x || 1,
            options.textureRepeat.y || 1
          );
        }

        material = new THREE.MeshStandardMaterial({
          map: texture,
          color: texture ? 0xffffff : options.color || 0x4a7d2c,
          side: options.side || THREE.DoubleSide,
        });
        super(game, envId, envData, geometry, material);
        this.mesh.position.copy(position);
        break;
      default:
        throw new Error(`Unknown environment type: ${envType}`);
    }
  }
}
