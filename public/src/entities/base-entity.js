// External libraries
import * as THREE from 'three';

// Utils
import { applyTextureToObject } from '../utils/model-utils.js';

export class BaseEntity {
  constructor(game, id, data, geometryOrModel, material, options = {}) {
    this.game = game;
    this.id = id;
    this.data = data;

    if (geometryOrModel instanceof THREE.Object3D) {
      this.mesh = geometryOrModel;
    } else if (geometryOrModel && material) {
      this.mesh = new THREE.Mesh(geometryOrModel, material);
    } else {
      console.error(
        'Invalid geometryOrModel:',
        geometryOrModel,
        'material:',
        material
      );
      throw new Error(
        'BaseEntity requires valid geometry and material, or a THREE.Object3D'
      );
    }

    if (options.textureName) {
      const texture = game.assetLoader.getTexture(options.textureName);
      if (texture) {
        applyTextureToObject(this.mesh, texture);
      }
    }
  }

  update(deltaTime) {}

  getPosition() {
    return this.mesh.position;
  }

  setPosition(x, y, z) {
    this.mesh.position.set(x, y, z);
  }

  placeOnGround(x, z) {
    const groundY = this.game?.field?.getHeightAt?.(x, z);
    if (groundY == null) {
      this.mesh.position.set(x, this.mesh.position.y, z);
      return;
    }

    const bbox = new THREE.Box3().setFromObject(this.mesh);
    const offsetToBottom = bbox.min.y - this.mesh.position.y;

    this.mesh.position.set(x, groundY - offsetToBottom, z);
  }

  dispose() {
    if (this.mesh instanceof THREE.Group) {
      this.mesh.traverse((object) => {
        if (object.isMesh) {
          object.geometry?.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach((mat) => mat.dispose());
          } else {
            object.material?.dispose();
          }
        }
      });
    } else {
      this.mesh.geometry?.dispose();
      this.mesh.material?.dispose();
    }

    if (this.mesh.parent) {
      this.mesh.parent.remove(this.mesh);
    }
  }
}
