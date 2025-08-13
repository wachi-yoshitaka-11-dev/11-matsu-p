import * as THREE from 'three';
import { Fall, EnvironmentTypes } from '../utils/constants.js';
import { Terrain } from '../entities/world/terrain.js';
import { Environment } from '../entities/world/environment.js';

export class Field {
  constructor(game) {
    this.game = game;
    // Field constants (will be moved to stage definition later)
    this.TERRAIN_SIZE = 100;
    this.TERRAIN_SEGMENTS = 50;
    this.TREE_COUNT = 20;
    this.TREE_MIN_SCALE = 2.0;
    this.TREE_MAX_SCALE = 6.0;
    this.ROCK_COUNT = 40;
    this.ROCK_MIN_SCALE = 2.0;
    this.ROCK_MAX_SCALE = 10.0;
    this.GRASS_COUNT = 1000;
    this.GRASS_MIN_SCALE = 0.5;
    this.GRASS_MAX_SCALE = 4.0;
    this.CLOUD_COUNT = 100;
    this.CLOUD_MIN_SCALE = 5.0;
    this.CLOUD_MAX_SCALE = 50.0;
    this.CLOUD_OPACITY = 0.4;

    // Use Environment class for ground - will use default size/segments if not specified
    const groundEnv = new Environment(
      this.game,
      EnvironmentTypes.GROUND,
      new THREE.Vector3(0, 0, 0),
      {
        width: this.TERRAIN_SIZE,
        height: this.TERRAIN_SIZE,
        segments: this.TERRAIN_SEGMENTS,
        textureRepeat: { x: 10, y: 10 },
        color: 0x4a7d2c,
        side: THREE.DoubleSide,
      }
    );

    this.mesh = groundEnv.mesh;

    this.raycaster = new THREE.Raycaster();

    this.placeObjects();
  }

  _placeTerrainObjectsOfType(terrainId, count, minScale, maxScale) {
    const positions = this._getRandomPositions(count);
    positions.forEach((position) => {
      const scale = Math.random() * (maxScale - minScale) + minScale;
      const terrainObject = new Terrain(this.game, terrainId, position, {
        scale,
      });
      this.mesh.add(terrainObject.mesh);
    });
  }

  _getRandomPositions(count) {
    const positions = [];
    const terrainHalfSize = this.TERRAIN_SIZE / 2;

    for (let i = 0; i < count; i++) {
      const x = Math.random() * this.TERRAIN_SIZE - terrainHalfSize;
      const z = Math.random() * this.TERRAIN_SIZE - terrainHalfSize;
      const y = this.getHeightAt(x, z);
      positions.push(new THREE.Vector3(x, y, z));
    }

    return positions;
  }

  placeObjects() {
    // Place terrain objects using TerrainObject class (configurations are hardcoded for now, will be moved to stage definition later)
    this._placeTerrainObjectsOfType(
      'tree',
      this.TREE_COUNT,
      this.TREE_MIN_SCALE,
      this.TREE_MAX_SCALE
    );
    this._placeTerrainObjectsOfType(
      'rock',
      this.ROCK_COUNT,
      this.ROCK_MIN_SCALE,
      this.ROCK_MAX_SCALE
    );
    this._placeTerrainObjectsOfType(
      'grass',
      this.GRASS_COUNT,
      this.GRASS_MIN_SCALE,
      this.GRASS_MAX_SCALE
    );

    // Place clouds using sprite billboards (configurations are hardcoded for now, will be moved to stage definition later)
    this._placeCloudObjects();
  }

  _placeCloudObjects() {
    const terrainHalfSize = this.TERRAIN_SIZE / 2;
    for (let i = 0; i < this.CLOUD_COUNT; i++) {
      const scale =
        Math.random() * (this.CLOUD_MAX_SCALE - this.CLOUD_MIN_SCALE) +
        this.CLOUD_MIN_SCALE;
      const x = Math.random() * this.TERRAIN_SIZE * 2 - terrainHalfSize;
      const z = Math.random() * this.TERRAIN_SIZE * 2 - terrainHalfSize;
      const y = 50 + (Math.random() * 20 - 10);

      const cloudEnv = new Environment(
        this.game,
        EnvironmentTypes.CLOUD,
        new THREE.Vector3(x, y, z),
        {
          scale: { x: scale, y: scale, z: scale },
          opacity: this.CLOUD_OPACITY,
        }
      );
      this.game.sceneManager.add(cloudEnv.mesh);
    }
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
