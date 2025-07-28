import * as THREE from 'three';
import { AssetNames } from '../utils/constants.js';

export class Item {
  constructor(type, position, game) {
    this.type = type;
    const defaultItemData = {
      pickupRange: 0.5,
      sphereRadius: 0.2,
      geometrySegments: 8,
    };
    const itemData = game.data.items?.generic || defaultItemData;
    const model = game.assetLoader.getAsset(AssetNames.ITEM_MODEL);
    if (model) {
      this.mesh = model.clone();
      const texture = game.assetLoader.getAsset(AssetNames.ITEM_TEXTURE);
      if (texture) {
        applyTextureToObject(this.mesh, texture);
      }
    } else {
      const geometry = new THREE.SphereGeometry(
        itemData.sphereRadius,
        itemData.geometrySegments,
        itemData.geometrySegments
      );
      const material = new THREE.MeshStandardMaterial({ color: 0xffffff });
      this.mesh = new THREE.Mesh(geometry, material);
    }
    this.mesh.position.copy(position);
  }

  dispose() {
    if (this.mesh.geometry) {
      this.mesh.geometry.dispose();
    }
    if (this.mesh.material) {
      this.mesh.material.dispose();
    }
  }
}
