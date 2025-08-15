import * as THREE from 'three';
import { LightTypes } from '../utils/constants.js';

export class Light {
  constructor(scene, field = null) {
    this.scene = scene;
    this.field = field;
    this.lights = [];
  }

  // Legacy method for backward compatibility
  initLights() {
    this.setupDefaultLights();
  }

  setupDefaultLights() {
    this.clearLights();

    const terrainSize = this.field?.TERRAIN_SIZE || 100;
    const light = new THREE.DirectionalLight(0xffffff, 1.0);
    light.position
      .set(terrainSize / 2, terrainSize / 2 + 10, -terrainSize / 2)
      .normalize();
    this.addLight(light);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.addLight(ambientLight);
  }

  setupLightsFromConfig(lightConfigs) {
    this.clearLights();

    for (const lightConfig of lightConfigs) {
      let light;

      if (lightConfig.type === LightTypes.AMBIENT) {
        light = new THREE.AmbientLight(
          lightConfig.color,
          lightConfig.intensity
        );
      } else if (lightConfig.type === LightTypes.DIRECTIONAL) {
        light = new THREE.DirectionalLight(
          lightConfig.color,
          lightConfig.intensity
        );
        if (lightConfig.position) {
          light.position.set(...lightConfig.position);
        }
      } else if (lightConfig.type === LightTypes.POINT) {
        light = new THREE.PointLight(
          lightConfig.color,
          lightConfig.intensity,
          lightConfig.distance || 0,
          lightConfig.decay || 2
        );
        if (lightConfig.position) {
          light.position.set(...lightConfig.position);
        }
      } else if (lightConfig.type === LightTypes.SPOT) {
        light = new THREE.SpotLight(
          lightConfig.color,
          lightConfig.intensity,
          lightConfig.distance || 0,
          lightConfig.angle || Math.PI / 3,
          lightConfig.penumbra || 0,
          lightConfig.decay || 2
        );
        if (lightConfig.position) {
          light.position.set(...lightConfig.position);
        }
        if (lightConfig.target) {
          light.target.position.set(...lightConfig.target);
        }
      } else if (lightConfig.type === LightTypes.HEMISPHERE) {
        light = new THREE.HemisphereLight(
          lightConfig.skyColor || lightConfig.color,
          lightConfig.groundColor || '#404040',
          lightConfig.intensity
        );
        if (lightConfig.position) {
          light.position.set(...lightConfig.position);
        }
      }

      if (light) {
        this.addLight(light);
      }
    }
  }

  addLight(light) {
    this.scene.add(light);
    this.lights.push(light);
  }

  clearLights() {
    for (const light of this.lights) {
      this.scene.remove(light);
    }
    this.lights = [];
  }
}
