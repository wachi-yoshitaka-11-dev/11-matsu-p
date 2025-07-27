import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';

export class AssetLoader {
    constructor() {
        this.gltfLoader = new GLTFLoader();
        this.audioLoader = new THREE.AudioLoader();
        this.textureLoader = new THREE.TextureLoader();
        this.assets = {};
    }

    async loadTexture(name, path) {
        try {
            const texture = await this.textureLoader.loadAsync(path);
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.flipY = false;
            this.assets[name] = texture;
            return texture;
        } catch (error) {
            console.error(`Error loading texture ${path}:`, error);
            throw error;
        }
    }

    async loadGLTF(name, path) {
        try {
            const gltf = await this.gltfLoader.loadAsync(path);

            // Prevent GLTFLoader from loading embedded textures.
            // This is intentional to ensure external textures (loaded via loadTexture) are always used,
            // allowing for consistent material application and easier texture swapping.
            gltf.scene.traverse((child) => {
                if (child.isMesh && child.material) {
                    const materials = Array.isArray(child.material) ? child.material : [child.material];
                    materials.forEach(material => {
                        if (material.map) {
                            material.map = null;
                            material.needsUpdate = true;
                        }
                    });
                }
            });

            this.assets[name] = gltf.scene;
            if (gltf.animations && gltf.animations.length > 0) {
                this.assets[`${name}-animations`] = gltf.animations;
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
            this.assets[name] = buffer;
            return buffer;
        } catch (error) {
            console.error(`Error loading audio ${path}:`, error);
            throw error;
        }
    }

    getAsset(name) {
        if (!(name in this.assets)) {
            console.warn(`Asset '${name}' not found in cache`);
            return null;
        }
        return this.assets[name];
    }

    async loadJSON(name, path) {
        if (this.assets[name]) {
            return this.assets[name];
        }
        try {
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            this.assets[name] = data;
            return data;
        } catch (error) {
            console.error(`Error loading JSON ${path}:`, error);
            throw error;
        }
    }
}