import * as THREE from 'three';

export class Item {
    constructor(type, position, game) {
        this.type = type;
        let itemData = game.data.items.generic;
        if (!itemData) {
            console.warn('Item data for generic not found. Using default values.');
            itemData = { pickupRange: 0.5, sphereRadius: 0.2, geometrySegments: 8 };
        }
        const geometry = new THREE.SphereGeometry(itemData.sphereRadius, itemData.geometrySegments, itemData.geometrySegments);
        const material = new THREE.MeshStandardMaterial({ color: this.getColorForType(type) });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position);
    }

    getColorForType(type) {
        switch (type) {
            case 'potion':
                return 0x00ff00; // Green
            case 'key':
                return 0xffff00; // Yellow
            default:
                return 0xffffff; // White
        }
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