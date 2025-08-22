// External libraries
import * as THREE from 'three';

// Entities
import { BaseEntity } from '../base-entity.js';

export class Terrain extends BaseEntity {
  constructor(game, terrainId, position, options = {}) {
    const scale = options.scale || 1;
    const terrainData = game.data.terrains[terrainId];
    if (!terrainData) {
      throw new Error(
        `Terrain object ID "${terrainId}" not found in terrain data`
      );
    }

    const modelName = terrainData.model.replace('.glb', '');
    const model = game.assetLoader.getModel(modelName);

    if (model) {
      super(game, terrainId, terrainData, model.clone(), null, {
        textureName: terrainData.texture.replace('.png', ''),
      });
      this.mesh.scale.set(scale, scale, scale);
    } else {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshStandardMaterial({
        color: 0x808080,
        wireframe: true,
      });
      super(game, terrainId, terrainData, geometry, material);
      this.mesh.scale.set(scale, scale, scale);
      console.warn(
        `Model not found for terrain object "${terrainId}". Using fallback geometry.`
      );
    }

    this.mesh.position.copy(position);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
  }
}
