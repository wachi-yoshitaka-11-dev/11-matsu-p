// External libraries
import * as THREE from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class AssetLoader {
  constructor() {
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(
      'https://unpkg.com/three@0.160.0/examples/jsm/libs/draco/gltf/'
    );
    this.gltfLoader = new GLTFLoader();
    this.gltfLoader.setDRACOLoader(dracoLoader);
    this.audioLoader = new THREE.AudioLoader();
    this.textureLoader = new THREE.TextureLoader();

    // Data assets
    this.json = {};

    // 3D assets related
    this.models = {};
    this.animations = {};
    this.textures = {};

    // Audio related
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

      // Configure materials for better rendering
      gltf.scene.traverse((child) => {
        if (child.isMesh && child.material) {
          const materials = Array.isArray(child.material)
            ? child.material
            : [child.material];
          materials.forEach((material) => {
            // Keep textures for stage models, only remove for character models if needed
            // material.map = null; // REMOVED - this was causing invisible models
            material.needsUpdate = true;

            // Ensure proper material properties
            if (material.transparent && material.opacity === 0) {
              material.opacity = 1.0; // Make sure not fully transparent
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

  async loadModelsFromAssets(assetsToLoad) {
    for (const asset of assetsToLoad) {
      try {
        if (asset.model) {
          await this.loadGLTF(
            asset.model.replace('.glb', ''),
            `assets/models/${asset.model}`
          );
        }
        if (asset.texture) {
          try {
            await this.loadTexture(
              asset.texture.replace('.png', ''),
              `assets/textures/${asset.texture}`
            );
          } catch (error) {
            console.warn(
              `Texture for ${asset.model || asset.texture} not found. Using default material.`,
              error
            );
          }
        }
      } catch (error) {
        console.error(
          `Could not load model ${asset.model}. A placeholder will be used.`,
          error
        );
      }
    }
  }
}
