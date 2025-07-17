// src/core/AssetLoader.js

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { AudioLoader } from 'three';

export class AssetLoader {
    constructor() {
        this.gltfLoader = new GLTFLoader();
        this.audioLoader = new AudioLoader();
        this.assets = {};
    }

    async loadGLTF(name, path) {
        return new Promise((resolve, reject) => {
            this.gltfLoader.load(path, (gltf) => {
                this.assets[name] = gltf.scene;
                resolve(gltf.scene);
            }, undefined, (error) => {
                console.error(`Error loading GLTF ${path}:`, error);
                reject(error);
            });
        });
    }

    async loadAudio(name, path) {
        return new Promise((resolve, reject) => {
            this.audioLoader.load(path, (buffer) => {
                this.assets[name] = buffer;
                resolve(buffer);
            }, undefined, (error) => {
                console.error(`Error loading audio ${path}:`, error);
                reject(error);
            });
        });
    }

    getAsset(name) {
        return this.assets[name];
    }
}