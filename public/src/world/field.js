import * as THREE from 'three';
import { Field as FieldConst, Fall } from '../utils/constants.js';

export class Field {
    constructor(game) {
        this.game = game;
        const size = FieldConst.terrainSize;
        const segments = FieldConst.terrainSegments;
        const geometry = new THREE.PlaneGeometry(size, size, segments, segments);

        const vertices = geometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const y = vertices[i + 1];
            const z = Math.sin(x * 0.1) * 2 + Math.cos(y * 0.1) * 2;
            vertices[i + 2] = z;
        }
        geometry.attributes.position.needsUpdate = true;
        geometry.computeVertexNormals();

        const material = new THREE.MeshStandardMaterial({ color: 0x4a7d2c, side: THREE.DoubleSide });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.rotation.x = -Math.PI / 2;

        this.raycaster = new THREE.Raycaster();

        this.placeObjects();
    }

    placeObjects() {
        const treeModel = this.game.assetLoader.getAsset('tree');
        const rockModel = this.game.assetLoader.getAsset('rock');
        const grassModel = this.game.assetLoader.getAsset('grass');

        if (!treeModel && !rockModel && !grassModel) {
            console.warn("Tree, Rock, and Grass models not loaded. Skipping object placement.");
            return;
        }

        const numObjects = 500;
        const terrainHalfSize = FieldConst.terrainSize / 2;

        for (let i = 0; i < numObjects; i++) {
            const randomValue = Math.random();
            let model;
            if (randomValue < 0.33 && treeModel) {
                model = treeModel;
            } else if (randomValue < 0.66 && rockModel) {
                model = rockModel;
            } else if (grassModel) {
                model = grassModel;
            } else {
                continue;
            }

            const instance = model.clone();

            const x = (Math.random() * FieldConst.terrainSize) - terrainHalfSize;
            const z = (Math.random() * FieldConst.terrainSize) - terrainHalfSize;
            const y = this.getHeightAt(x, z);

            const scale = Math.random() * 0.5 + 0.5;
            instance.scale.set(scale, scale, scale);

            const bbox = new THREE.Box3().setFromObject(instance);
            const objectMinY = bbox.min.y;
            instance.position.set(x, y - objectMinY, z);

            this.game.sceneManager.add(instance);
        }

        const cloudModel = this.game.assetLoader.getAsset('cloud');
        if (cloudModel) {
            const numClouds = 100;
            const cloudHeight = 20;
            for (let i = 0; i < numClouds; i++) {
                const instance = cloudModel.clone();
                const x = (Math.random() * FieldConst.terrainSize * 2) - FieldConst.terrainSize;
                const z = (Math.random() * FieldConst.terrainSize * 2) - FieldConst.terrainSize;
                const y = cloudHeight + (Math.random() * 10 - 5);
                instance.position.set(x, y, z);
                const scale = Math.random() * 0.5 + 0.5;
                instance.scale.set(scale, scale, scale);
                this.game.sceneManager.add(instance);
            }
        }

        const sunModel = this.game.assetLoader.getAsset('sun');
        if (sunModel) {
            const instance = sunModel.clone();
            instance.position.set(FieldConst.terrainSize / 2, FieldConst.terrainSize / 2 + 10, -FieldConst.terrainSize / 2);
            instance.scale.set(5, 5, 5);
            this.game.sceneManager.add(instance);
        }
    }

    getHeightAt(x, z) {
        this.mesh.updateMatrixWorld();
        this.raycaster.set(new THREE.Vector3(x, 50, z), new THREE.Vector3(0, -1, 0));
        const intersects = this.raycaster.intersectObject(this.mesh);
        if (intersects.length > 0) {
            return intersects[0].point.y;
        }
        // If no intersection, return a very low value to allow falling below the terrain
        return Fall.maxFallDepth; // Fall.fallDeathThreshold (-100)よりも十分に低い値
    }
}
