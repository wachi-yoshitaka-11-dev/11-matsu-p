// External libraries
import * as THREE from 'three';

// Entities
import { BaseEntity } from '../base-entity.js';

export class Item extends BaseEntity {
  constructor(game, itemId, position, options = {}) {
    const itemData = game.data.items[itemId];
    if (!itemData) {
      throw new Error(`Item ID "${itemId}" not found in items data`);
    }

    const modelName = itemData.model.replace('.glb', '');
    const model = game.assetLoader.getModel(modelName);

    if (model) {
      super(game, itemId, itemData, model.clone(), null, {
        textureName: itemData.texture.replace('.png', ''),
      });
      const s = options.scale ?? itemData.scale ?? 2;
      if (typeof s === 'object') {
        const { x = 1, y = 1, z = 1 } = s;
        this.mesh.scale.set(x, y, z);
      } else {
        this.mesh.scale.set(s, s, s);
      }
    } else {
      const geometry = new THREE.SphereGeometry(
        itemData.sphereRadius || 0.2,
        itemData.geometrySegments || 8,
        itemData.geometrySegments || 8
      );
      const material = new THREE.MeshStandardMaterial({ color: 0xffffff });
      super(game, itemId, itemData, geometry, material);
    }

    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;

    this.mesh.position.copy(position);
    this.mesh.position.y += 1.0; // Float items above ground
  }
}
