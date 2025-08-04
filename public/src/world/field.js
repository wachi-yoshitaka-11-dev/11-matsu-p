import * as THREE from 'three';
import { Field as FieldConst, Fall, AssetNames } from '../utils/constants.js';
import { applyTextureToObject } from '../utils/model-utils.js';

export class Field {
  constructor(game, fieldConfig = null) {
    this.game = game;

    // Use stage-specific config or fallback to defaults
    const config = fieldConfig || {
      size: FieldConst.TERRAIN_SIZE,
      segments: FieldConst.TERRAIN_SEGMENTS,
      heightVariation: 2.0,
      heightFrequency: 0.1,
      texture: 'ground-texture',
      textureRepeat: { x: 10, y: 10 },
      color: 0x4a7d2c,
    };

    this.config = config;
    const geometry = new THREE.PlaneGeometry(
      config.size,
      config.size,
      config.segments,
      config.segments
    );

    const vertices = geometry.attributes.position.array;
    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i];
      const y = vertices[i + 1];
      const z =
        Math.sin(x * config.heightFrequency) * config.heightVariation +
        Math.cos(y * config.heightFrequency) * config.heightVariation;
      vertices[i + 2] = z;
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();

    const groundTexture = this.game.assetLoader.getAsset(
      config.texture || AssetNames.GROUND_TEXTURE
    );
    if (groundTexture) {
      groundTexture.wrapS = THREE.RepeatWrapping;
      groundTexture.wrapT = THREE.RepeatWrapping;
      groundTexture.repeat.set(config.textureRepeat.x, config.textureRepeat.y);
    }

    const material = new THREE.MeshStandardMaterial({
      map: groundTexture || null,
      color: groundTexture ? 0xffffff : config.color,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.rotation.x = -Math.PI / 2;

    this.raycaster = new THREE.Raycaster();
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
    return Fall.MAX_FALL_DEPTH;
  }
}
