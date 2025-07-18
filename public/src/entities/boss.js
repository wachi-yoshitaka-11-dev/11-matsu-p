import * as THREE from 'three';
import { Boss as BossConst } from '../utils/constants.js';

export class Boss {
    constructor(player) {
        this.player = player;
        const geometry = new THREE.BoxGeometry(1, 1, 1); // Larger than enemy
        const material = new THREE.MeshStandardMaterial({ color: 0x880000 });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(BossConst.INITIAL_POSITION);

        this.hp = 200;
        this.maxHp = 200;
        this.isDead = false;
        this.attackCooldown = BossConst.ATTACK_COOLDOWN;
        this.experience = 100;
    }

    update(deltaTime) {
        if (this.hp <= 0) {
            this.isDead = true;
            return;
        }

        const distance = this.mesh.position.distanceTo(this.player.mesh.position);

        // Simple AI: Chase and attack
        if (distance > BossConst.NORMAL_ATTACK_RANGE) {
            const direction = new THREE.Vector3().subVectors(this.player.mesh.position, this.mesh.position).normalize();
            this.mesh.position.add(direction.multiplyScalar(BossConst.SPEED * deltaTime));
        }

        this.mesh.lookAt(this.player.mesh.position);

        this.attackCooldown -= deltaTime;
        if (distance <= BossConst.NORMAL_ATTACK_RANGE && this.attackCooldown <= 0) {
            this.player.takeDamage(BossConst.NORMAL_ATTACK_DAMAGE);
            this.attackCooldown = BossConst.ATTACK_COOLDOWN; // Reset cooldown
        }
    }

    takeDamage(amount) {
        this.hp -= amount;
    }
}
