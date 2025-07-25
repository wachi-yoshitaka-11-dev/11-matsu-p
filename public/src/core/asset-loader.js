import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { AudioLoader } from 'three';

export class AssetLoader {
    constructor() {
        this.gltfLoader = new GLTFLoader();
        this.audioLoader = new AudioLoader();
        this.assets = {};
    }

    async loadGLTF(name, path) {
        try {
            const gltf = await this.gltfLoader.loadAsync(path);
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
        return this.assets[name];
    }

    async loadJSON(name, path) {
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