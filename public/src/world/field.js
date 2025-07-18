import * as THREE from 'three';

export class Field {
    constructor() {
        const size = 100;
        const segments = 50;
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
        this.mesh.rotation.x = -Math.PI / 2; // X軸で90度回転して地面にする
    }
}
