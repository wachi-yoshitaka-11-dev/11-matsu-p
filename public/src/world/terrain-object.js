import * as THREE from 'three';

export class TerrainObject {
  constructor(game, type, position = new THREE.Vector3()) {
    this.game = game;
    this.type = type;
    this.position = position;
    this.mesh = null;
    this.isLoaded = false;

    this.data = this.game.data.terrainObjects[type];
    if (!this.data) {
      console.warn(`Terrain object type "${type}" not found in data`);
      return;
    }

    this.load();
  }

  async load() {
    if (!this.data) return;

    try {
      // Load 3D model
      const model = await this.game.assetLoader.loadModel(this.data.model);
      this.mesh = model.scene.clone();

      // Apply scale
      if (this.data.scale) {
        this.mesh.scale.set(
          this.data.scale.x,
          this.data.scale.y,
          this.data.scale.z
        );
      }

      // Apply position
      this.mesh.position.copy(this.position);

      // Apply color tint if specified
      if (this.data.tint) {
        this.mesh.traverse((child) => {
          if (child.isMesh && child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((mat) => {
                mat.color.setHex(this.data.tint);
              });
            } else {
              child.material.color.setHex(this.data.tint);
            }
          }
        });
      }

      // Apply emissive color if specified
      if (this.data.emissive) {
        this.mesh.traverse((child) => {
          if (child.isMesh && child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((mat) => {
                mat.emissive.setHex(this.data.emissive);
              });
            } else {
              child.material.emissive.setHex(this.data.emissive);
            }
          }
        });
      }

      // Configure shadows
      this.mesh.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = this.data.castShadow || false;
          child.receiveShadow = this.data.receiveShadow || false;
        }
      });

      // Set collision detection
      if (this.data.collision) {
        this.mesh.userData.collision = true;
        this.mesh.userData.type = 'terrain';
      }

      // Add random rotation for natural variation
      this.mesh.rotation.y = Math.random() * Math.PI * 2;

      this.isLoaded = true;
      console.log(`Terrain object "${this.type}" loaded successfully`);
    } catch (error) {
      console.error(`Failed to load terrain object "${this.type}":`, error);
    }
  }

  update(deltaTime) {
    // Terrain objects are typically static, but can add effects here
    // For example, swaying grass, glowing crystals, etc.
    if (!this.isLoaded || !this.mesh) return;

    // Example: Gentle swaying for vegetation
    if (this.data.type === 'vegetation' && this.mesh) {
      const time = Date.now() * 0.001;
      const sway = Math.sin(time + this.position.x + this.position.z) * 0.02;
      this.mesh.rotation.z = sway;
    }

    // Example: Pulsing glow for crystals
    if (this.data.emissive && this.mesh) {
      const time = Date.now() * 0.002;
      const pulse = (Math.sin(time) + 1) * 0.5;
      const intensity = 0.1 + pulse * 0.3;

      this.mesh.traverse((child) => {
        if (child.isMesh && child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => {
              mat.emissiveIntensity = intensity;
            });
          } else {
            child.material.emissiveIntensity = intensity;
          }
        }
      });
    }
  }

  dispose() {
    if (this.mesh) {
      this.mesh.traverse((child) => {
        if (child.isMesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((mat) => mat.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      });
    }
  }

  getPosition() {
    return this.position.clone();
  }

  setPosition(x, y, z) {
    this.position.set(x, y, z);
    if (this.mesh) {
      this.mesh.position.copy(this.position);
    }
  }
}
