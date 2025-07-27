import * as THREE from 'three';
import { ItemColors } from '../utils/constants.js';

export class Item {
    constructor(type, position, game) {
        this.type = type;
        const defaultItemData = { pickupRange: 0.5, sphereRadius: 0.2, geometrySegments: 8 };
        const itemData = game.data.items?.generic || defaultItemData;
        const geometry = new THREE.SphereGeometry(itemData.sphereRadius, itemData.geometrySegments, itemData.geometrySegments);
        const material = new THREE.MeshStandardMaterial({ color: this.getColorForType(type) });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position);
    }

    getColorForType(type) {
        return ItemColors[type] || 0xffffff;
    }

    dispose() {
        if (this.mesh.geometry) {
            this.mesh.geometry.dispose();
        }
        if (this.mesh.material) {
            this.mesh.material.dispose();
        }
    }
}