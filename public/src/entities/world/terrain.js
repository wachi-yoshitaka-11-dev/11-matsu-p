import * as THREE from 'three';
import { BaseEntity } from '../base-entity.js';

export class Terrain extends BaseEntity {
  constructor(game, terrainType, position, options = {}) {
    const scale = options.scale || 1;
    const terrainData = game.data.terrains[terrainType];
    if (!terrainData) {
      throw new Error(
        `Terrain object type "${terrainType}" not found in terrain data`
      );
    }

    const modelName = terrainData.model.replace('.glb', '');
    const model = game.assetLoader.getModel(modelName);

    if (model) {
      super(game, terrainType, terrainData, model.clone(), null, {
        textureName: terrainData.texture.replace('.png', ''),
      });
      this.mesh.scale.set(scale, scale, scale);
    } else {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshStandardMaterial({
        color: 0x808080,
        wireframe: true,
      });
      super(game, terrainType, terrainData, geometry, material);
      this.mesh.scale.set(scale, scale, scale);
      console.warn(
        `Model not found for terrain object "${terrainType}". Using fallback geometry.`
      );
    }

    this.mesh.position.copy(position);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
  }
}
