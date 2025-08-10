import * as THREE from 'three';

export class Light {
  constructor(scene, field = null) {
    this.scene = scene;
    this.field = field;
    this.initLights();
  }

  initLights() {
    const terrainSize = this.field?.TERRAIN_SIZE || 100;
    const light = new THREE.DirectionalLight(0xffffff, 1.0);
    light.position
      .set(terrainSize / 2, terrainSize / 2 + 10, -terrainSize / 2)
      .normalize();
    this.scene.add(light);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);
  }
}
