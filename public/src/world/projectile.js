import * as THREE from 'three';

export class Projectile {
    constructor(startPosition, direction, game) {
        const skillData = game.data.skills.shockwave;
        const geometry = new THREE.TorusGeometry(0.5, 0.1, 16, 100);
        const material = new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xffff00 });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(startPosition);
        this.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()); // Align with direction

        this.direction = direction;
        this.speed = skillData.SPEED;
        this.lifespan = skillData.LIFESPAN; // seconds
        this.damage = skillData.DAMAGE;
    }

    update(deltaTime) {
        this.mesh.position.add(this.direction.clone().multiplyScalar(this.speed * deltaTime));
        this.lifespan -= deltaTime;
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