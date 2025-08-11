import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';

export class AssetLoader {
  constructor() {
    this.gltfLoader = new GLTFLoader();
    this.audioLoader = new THREE.AudioLoader();
    this.textureLoader = new THREE.TextureLoader();

    // データ系
    this.json = {};

    // 3Dアセット系
    this.models = {};
    this.animations = {};
    this.textures = {};

    // オーディオ系
    this.audio = {};
  }

  async loadTexture(name, path) {
    try {
      const texture = await this.textureLoader.loadAsync(path);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.flipY = false;
      this.textures[name] = texture;
      return texture;
    } catch (error) {
      console.error(`Error loading texture ${path}:`, error);
      throw error;
    }
  }

  async loadGLTF(name, path) {
    try {
      const gltf = await this.gltfLoader.loadAsync(path);

      gltf.scene.traverse((child) => {
        if (child.isMesh && child.material) {
          const materials = Array.isArray(child.material)
            ? child.material
            : [child.material];
          materials.forEach((material) => {
            if (material.map) {
              material.map = null;
              material.needsUpdate = true;
            }
          });
        }
      });

      this.models[name] = gltf.scene;
      if (gltf.animations && gltf.animations.length > 0) {
        this.animations[name] = gltf.animations;
      }
      return gltf.scene;
    } catch (error) {
      console.error(`Error loading GLTF ${path}:`, error);
      throw error;
    }
  }

  async loadAudio(name, path) {
    try {
      const buffer = await this.audioLoader.loadAsync(path);
      this.audio[name] = buffer;
      return buffer;
    } catch (error) {
      console.error(`Error loading audio ${path}:`, error);
      throw error;
    }
  }

  getModel(name) {
    return this.models[name] || null;
  }

  getTexture(name) {
    return this.textures[name] || null;
  }

  getAudio(name) {
    return this.audio[name] || null;
  }

  getJSON(name) {
    return this.json[name] || null;
  }

  getAnimations(name) {
    return this.animations[name] || null;
  }

  async loadJSON(name, path) {
    if (this.json[name]) {
      return this.json[name];
    }
    try {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      this.json[name] = data;
      return data;
    } catch (error) {
      console.error(`Error loading JSON ${path}:`, error);
      throw error;
    }
  }
}
