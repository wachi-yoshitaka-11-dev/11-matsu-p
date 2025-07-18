import * as THREE from 'three';
import {
    BOSS_ATTACK_COOLDOWN,
    BOSS_NORMAL_ATTACK_DAMAGE,
    BOSS_NORMAL_ATTACK_RANGE
} from '../utils/constants.js';

export class Boss {
    constructor(player) {
        this.player = player;
        const geometry = new THREE.BoxGeometry(1, 1, 1); // Larger than enemy
        const material = new THREE.MeshStandardMaterial({ color: 0x880000 });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(10, 0.5, 10); // Initial position

        this.hp = 200;
        this.maxHp = 200;
        this.isDead = false;
        this.attackCooldown = BOSS_ATTACK_COOLDOWN;
        this.experience = 100;
    }

    update(deltaTime) {
        if (this.hp <= 0) {
            this.isDead = true;
            return;
        }

        const distance = this.mesh.position.distanceTo(this.player.mesh.position);

        // Simple AI: Chase and attack
        if (distance > BOSS_NORMAL_ATTACK_RANGE) {
            const direction = new THREE.Vector3().subVectors(this.player.mesh.position, this.mesh.position).normalize();
            const speed = 1.5;
            this.mesh.position.add(direction.multiplyScalar(speed * deltaTime));
        }

        this.mesh.lookAt(this.player.mesh.position);

        this.attackCooldown -= deltaTime;
        if (distance <= BOSS_NORMAL_ATTACK_RANGE && this.attackCooldown <= 0) {
            console.log('Boss attacks!');
            if (!this.player.isInvincible) {
                this.player.hp -= BOSS_NORMAL_ATTACK_DAMAGE;
                console.log(`Player HP: ${this.player.hp}`);
            }
            this.attackCooldown = BOSS_ATTACK_COOLDOWN; // Reset cooldown
        }
    }
}
