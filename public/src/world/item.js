import * as THREE from 'three';

export class Item {
    constructor(type, position, game) {
        this.type = type;
        let itemData = game.data.items.generic;
        if (!itemData) {
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
                return 0x00ff00;
            case 'key':
                return 0xffff00;
            default:
                return 0xffffff;
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