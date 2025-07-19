import * as THREE from 'three';
import { Character } from './character.js';

export class Boss extends Character {
    constructor(game, player) {
        const geometry = new THREE.BoxGeometry(1, 1, 1); // Larger than enemy
        const material = new THREE.MeshStandardMaterial({ color: 0x880000 });
        super(game, geometry, material, { hp: 200, speed: game.data.enemies.boss.SPEED });

        this.player = player;

        // Set initial position dynamically based on field height
        const initialPosition = this.game.data.enemies.boss.INITIAL_POSITION;
        const y = this.game.field.getHeightAt(initialPosition.x, initialPosition.z) + this.mesh.geometry.parameters.height / 2;
        this.mesh.position.set(initialPosition.x, y, initialPosition.z);

        this.attackCooldown = this.game.data.enemies.boss.ATTACK_COOLDOWN;
        this.experience = 100;
    }

    update(deltaTime) {
        super.update(deltaTime); // Handle physics and death check

        if (this.isDead) return;

        const distance = this.mesh.position.distanceTo(this.player.mesh.position);
        const bossData = this.game.data.enemies.boss;

        // Simple AI: Chase and attack
        if (distance > bossData.NORMAL_ATTACK_RANGE) {
            const direction = new THREE.Vector3().subVectors(this.player.mesh.position, this.mesh.position).normalize();
            this.mesh.position.add(direction.multiplyScalar(this.speed * deltaTime));
        }

        this.mesh.lookAt(this.player.mesh.position);

        this.attackCooldown -= deltaTime;
        if (distance <= bossData.NORMAL_ATTACK_RANGE && this.attackCooldown <= 0) {
            this.player.takeDamage(bossData.NORMAL_ATTACK_DAMAGE);
            this.attackCooldown = bossData.ATTACK_COOLDOWN; // Reset cooldown
        }
    }

    // takeDamage is inherited from Character
}
