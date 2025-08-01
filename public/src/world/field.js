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

    const groundTexture = this.game.assetLoader.getAsset(
      AssetNames.GROUND_TEXTURE
    );
    if (groundTexture) {
      groundTexture.wrapS = THREE.RepeatWrapping;
      groundTexture.wrapT = THREE.RepeatWrapping;
      groundTexture.repeat.set(10, 10);
    }

    const material = new THREE.MeshStandardMaterial({
      map: groundTexture || null,
      color: groundTexture ? 0xffffff : 0x4a7d2c, // Fallback color
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
    const cloudTexture = this.game.assetLoader.getAsset(
      AssetNames.CLOUD_TEXTURE
    );
    if (cloudTexture) {
      const terrainHalfSize = FieldConst.TERRAIN_SIZE / 2;
      for (let i = 0; i < FieldConst.CLOUD_COUNT; i++) {
        this._placeObject(
          null, // モデルは不要
          cloudTexture,
          FieldConst.CLOUD_MIN_SCALE,
          FieldConst.CLOUD_MAX_SCALE,
          () => {
            const x =
              Math.random() * FieldConst.TERRAIN_SIZE * 2 - terrainHalfSize;
            const z =
              Math.random() * FieldConst.TERRAIN_SIZE * 2 - terrainHalfSize;
            const y = 50 + (Math.random() * 20 - 10);
            return new THREE.Vector3(x, y, z);
          },
          true // isBillboardをtrueに設定
        );
      }
    }
  }

  _placeObject(
    model,
    texture,
    minScale,
    maxScale,
    getPosition,
    isBillboard = false
  ) {
    let instance;
    if (isBillboard && texture) {
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: FieldConst.CLOUD_OPACITY,
      });
      instance = new THREE.Sprite(material);
    } else {
      instance = model.clone();
      if (texture) {
        applyTextureToObject(instance, texture);
      }
    }

    const scale = Math.random() * (maxScale - minScale) + minScale;
    instance.scale.set(scale, scale, scale);

    instance.position.copy(getPosition(instance));

    this.game.sceneManager.add(instance);
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
