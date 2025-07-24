import * as THREE from 'three';
import { Field as FieldConst } from '../utils/constants.js';

export class Field {
    constructor(game) {
        this.game = game;
        const size = FieldConst.terrainSize;
        const segments = FieldConst.terrainSegments;
        const geometry = new THREE.PlaneGeometry(size, size, segments, segments);

        // Generate height data
        const vertices = geometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            // Simple sine wave hills
            const x = vertices[i];
            const y = vertices[i + 1];
            const z = Math.sin(x * 0.1) * 2 + Math.cos(y * 0.1) * 2;
            vertices[i + 2] = z;
        }
        geometry.attributes.position.needsUpdate = true; // Notify Three.js that vertices have been updated
        geometry.computeVertexNormals(); // Recalculate normals for correct lighting

        const material = new THREE.MeshStandardMaterial({ color: 0x4a7d2c, side: THREE.DoubleSide });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.rotation.x = -Math.PI / 2; // Rotate to be horizontal

        this.raycaster = new THREE.Raycaster();

        this.placeObjects();
    }

    placeObjects() {
        const treeModel = this.game.assetLoader.getAsset('tree');
        const rockModel = this.game.assetLoader.getAsset('rock');

        if (!treeModel && !rockModel) {
            console.warn("Tree and Rock models not loaded. Skipping object placement.");
            return;
        }

        const numObjects = 50; // Number of trees and rocks to place
        const terrainHalfSize = FieldConst.terrainSize / 2;

        for (let i = 0; i < numObjects; i++) {
            const isTree = Math.random() > 0.5;
            const model = isTree ? treeModel : rockModel;
            if (!model) continue;

            const instance = model.clone();

            const x = (Math.random() * FieldConst.terrainSize) - terrainHalfSize;
            const z = (Math.random() * FieldConst.terrainSize) - terrainHalfSize;
            const y = this.getHeightAt(x, z);

            // Adjust scale if needed (example: random scale for variety)
            const scale = Math.random() * 0.5 + 0.5; // Scale between 0.5 and 1.0
            instance.scale.set(scale, scale, scale);

            // Calculate object height and adjust y position AFTER scaling
            const bbox = new THREE.Box3().setFromObject(instance);
            const objectMinY = bbox.min.y;
            instance.position.set(x, y - objectMinY, z);

            this.game.sceneManager.add(instance);
        }

        // Place clouds
        const cloudModel = this.game.assetLoader.getAsset('cloud');
        if (cloudModel) {
            const numClouds = 10;
            const cloudHeight = 20; // Height above terrain
            for (let i = 0; i < numClouds; i++) {
                const instance = cloudModel.clone();
                const x = (Math.random() * FieldConst.terrainSize * 2) - FieldConst.terrainSize;
                const z = (Math.random() * FieldConst.terrainSize * 2) - FieldConst.terrainSize;
                const y = cloudHeight + (Math.random() * 10 - 5); // Larger variation in height
                instance.position.set(x, y, z);
                const scale = Math.random() * 0.5 + 0.5;
                instance.scale.set(scale, scale, scale);
                this.game.sceneManager.add(instance);
            }
        }

        // Place sun
        const sunModel = this.game.assetLoader.getAsset('sun');
        if (sunModel) {
            const instance = sunModel.clone();
            instance.position.set(FieldConst.terrainSize / 2, FieldConst.terrainSize / 2 + 10, -FieldConst.terrainSize / 2); // Fixed position
            instance.scale.set(5, 5, 5); // Adjust size as needed
            this.game.sceneManager.add(instance);
        }
    }

    getHeightAt(x, z) {
        this.mesh.updateMatrixWorld(); // Ensure world matrix is up-to-date
        this.raycaster.set(new THREE.Vector3(x, 50, z), new THREE.Vector3(0, -1, 0));
        const intersects = this.raycaster.intersectObject(this.mesh);
        if (intersects.length > 0) {
            return intersects[0].point.y;
        }
        return 0; // Default height if no intersection
    }
}
