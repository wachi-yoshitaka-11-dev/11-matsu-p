import * as THREE from 'three';
import { BaseEntity } from './base-entity.js';

export class Item extends BaseEntity {
  constructor(game, itemType, position, options = {}) {
    const itemData = game.data.items[itemType];
    if (!itemData) {
      throw new Error(`Item type "${itemType}" not found in items data`);
    }

    const modelName = itemData.model.replace('.glb', '');
    const model = game.assetLoader.getModel(modelName);

    if (model) {
      super(game, itemType, itemData, model.clone(), null, {
        textureName: itemData.texture.replace('.png', ''),
      });
      this.mesh.scale.set(2, 2, 2);
    } else {
      const geometry = new THREE.SphereGeometry(
        itemData.sphereRadius || 0.2,
        itemData.geometrySegments || 8,
        itemData.geometrySegments || 8
      );
      const material = new THREE.MeshStandardMaterial({ color: 0xffffff });
      super(game, itemType, itemData, geometry, material);
    }

    this.mesh.position.copy(position);
  }
}
