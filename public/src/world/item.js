import * as THREE from 'three';
import { Item as ItemConst } from '../utils/constants.js';

export class Item {
    constructor(type, position) {
        this.type = type;
        const geometry = new THREE.SphereGeometry(ItemConst.SPHERE_RADIUS, ItemConst.GEOMETRY_SEGMENTS, ItemConst.GEOMETRY_SEGMENTS);
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
