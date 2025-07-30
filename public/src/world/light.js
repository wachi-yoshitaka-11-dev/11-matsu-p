import * as THREE from 'three';
import { Field as FieldConst } from '../utils/constants.js';

export class Light {
  constructor(scene) {
    this.scene = scene;
    this.initLights();
  }

  initLights() {
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(
      FieldConst.TERRAIN_SIZE / 2,
      FieldConst.TERRAIN_SIZE / 2 + 10,
      -FieldConst.TERRAIN_SIZE / 2
    ).normalize();
    this.scene.add(light);

    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    this.scene.add(ambientLight);
  }
}
