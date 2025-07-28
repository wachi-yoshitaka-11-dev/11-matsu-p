import * as THREE from 'three';
import { Field as FieldConst, Fall, AssetNames } from '../utils/constants.js';
import { applyTextureToObject } from '../utils/model-utils.js';

export class Field {
  constructor(game) {
    this.game = game;
    const size = FieldConst.TERRAIN_SIZE;
    const segments = FieldConst.TERRAIN_SEGMENTS;
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);

    const vertices = geometry.attributes.position.array;
    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i];
      const y = vertices[i + 1];
      const z = Math.sin(x * 0.1) * 2 + Math.cos(y * 0.1) * 2;
      vertices[i + 2] = z;
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      color: 0x4a7d2c,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.rotation.x = -Math.PI / 2;

    this.raycaster = new THREE.Raycaster();

    this.placeObjects();
  }

  _placeTerrainObjects(model, texture, count, minScale, maxScale) {
    const terrainHalfSize = FieldConst.TERRAIN_SIZE / 2;
    for (let i = 0; i < count; i++) {
      this._placeObject(model, texture, minScale, maxScale, (model) => {
        const x = Math.random() * FieldConst.TERRAIN_SIZE - terrainHalfSize;
        const z = Math.random() * FieldConst.TERRAIN_SIZE - terrainHalfSize;
        const y = this.getHeightAt(x, z);
        const bbox = new THREE.Box3().setFromObject(model);
        const objectMinY = bbox.min.y;
        return new THREE.Vector3(x, y - objectMinY, z);
      });
    }
  }

  placeObjects() {
    const treeModel = this.game.assetLoader.getAsset(AssetNames.TREE_MODEL);
    const rockModel = this.game.assetLoader.getAsset(AssetNames.ROCK_MODEL);
    const grassModel = this.game.assetLoader.getAsset(AssetNames.GRASS_MODEL);

    if (!treeModel && !rockModel && !grassModel) {
      return;
    }

    // Place trees
    const treeTexture = this.game.assetLoader.getAsset(AssetNames.TREE_TEXTURE);
    this._placeTerrainObjects(
      treeModel,
      treeTexture,
      FieldConst.TREE_COUNT,
      FieldConst.TREE_MIN_SCALE,
      FieldConst.TREE_MAX_SCALE
    );

    // Place rocks
    const rockTexture = this.game.assetLoader.getAsset(AssetNames.ROCK_TEXTURE);
    this._placeTerrainObjects(
      rockModel,
      rockTexture,
      FieldConst.ROCK_COUNT,
      FieldConst.ROCK_MIN_SCALE,
      FieldConst.ROCK_MAX_SCALE
    );

    // Place grass
    const grassTexture = this.game.assetLoader.getAsset(
      AssetNames.GRASS_TEXTURE
    );
    this._placeTerrainObjects(
      grassModel,
      grassTexture,
      FieldConst.GRASS_COUNT,
      FieldConst.GRASS_MIN_SCALE,
      FieldConst.GRASS_MAX_SCALE
    );

    // Place clouds
    const cloudModel = this.game.assetLoader.getAsset(AssetNames.CLOUD_MODEL);
    if (cloudModel) {
      const cloudTexture = this.game.assetLoader.getAsset(
        AssetNames.CLOUD_TEXTURE
      );
      if (cloudTexture) {
        this._setObjectTransparency(cloudModel, FieldConst.CLOUD_OPACITY);
      }

      const terrainHalfSize = FieldConst.TERRAIN_SIZE / 2;
      for (let i = 0; i < FieldConst.CLOUD_COUNT; i++) {
        this._placeObject(
          cloudModel,
          cloudTexture,
          FieldConst.CLOUD_MIN_SCALE,
          FieldConst.CLOUD_MAX_SCALE,
          () => {
            const x =
              Math.random() * FieldConst.TERRAIN_SIZE * 2 - terrainHalfSize;
            const z =
              Math.random() * FieldConst.TERRAIN_SIZE * 2 - terrainHalfSize;
            const y = 20 + (Math.random() * 10 - 5);
            return new THREE.Vector3(x, y, z);
          }
        );
      }
    }

    // Place sun
    const sunModel = this.game.assetLoader.getAsset(AssetNames.SUN_MODEL);
    if (sunModel) {
      const sunTexture = this.game.assetLoader.getAsset(AssetNames.SUN_TEXTURE);
      if (sunTexture) {
        this._setObjectTransparency(sunModel, FieldConst.SUN_OPACITY);
      }

      for (let i = 0; i < FieldConst.SUN_COUNT; i++) {
        this._placeObject(
          sunModel,
          sunTexture,
          FieldConst.SUN_MIN_SCALE,
          FieldConst.SUN_MAX_SCALE,
          () => {
            return new THREE.Vector3(
              FieldConst.TERRAIN_SIZE / 2,
              FieldConst.TERRAIN_SIZE / 2 + 10,
              -FieldConst.TERRAIN_SIZE / 2
            );
          }
        );
      }
    }
  }

  _placeObject(model, texture, minScale, maxScale, getPosition) {
    const instance = model.clone();

    if (texture) {
      applyTextureToObject(instance, texture);
    }

    const scale = Math.random() * (maxScale - minScale) + minScale;
    instance.scale.set(scale, scale, scale);

    instance.position.copy(getPosition(instance));

    this.game.sceneManager.add(instance);
  }

  _setObjectTransparency(object, opacity) {
    object.traverse((child) => {
      if (child.isMesh && child.material) {
        const materials = Array.isArray(child.material)
          ? child.material
          : [child.material];
        materials.forEach((material) => {
          material.transparent = true;
          material.opacity = opacity;
        });
      }
    });
  }

  getHeightAt(x, z) {
    this.mesh.updateMatrixWorld();
    this.raycaster.set(
      new THREE.Vector3(x, 50, z),
      new THREE.Vector3(0, -1, 0)
    );
    const intersects = this.raycaster.intersectObject(this.mesh);
    if (intersects.length > 0) {
      return intersects[0].point.y;
    }
    // If no intersection, return a very low value to allow falling below the terrain
    return Fall.MAX_FALL_DEPTH;
  }
}
