// src/core/asset-loader.js

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

    async loadJSON(name, path) {
        return new Promise((resolve, reject) => {
            fetch(path)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    this.assets[name] = data;
                    resolve(data);
                })
                .catch(error => {
                    console.error(`Error loading JSON ${path}:`, error);
                    reject(error);
                });
        });
    }
}