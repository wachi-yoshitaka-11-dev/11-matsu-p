import * as THREE from 'three';

export class Projectile {
    constructor(startPosition, direction) {
        const geometry = new THREE.TorusGeometry(0.5, 0.1, 16, 100);
        const material = new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xffff00 });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(startPosition);
        this.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction); // Align with direction

        this.direction = direction;
        this.speed = 10;
        this.lifespan = 2; // seconds
        this.damage = 30;
    }

    update(deltaTime) {
        this.mesh.position.add(this.direction.clone().multiplyScalar(this.speed * deltaTime));
        this.lifespan -= deltaTime;
    }
}
