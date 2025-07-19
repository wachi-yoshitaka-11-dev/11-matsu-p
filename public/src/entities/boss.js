import * as THREE from 'three';

export class Boss {
    constructor(game, player) {
        this.game = game;
        this.player = player;
        const geometry = new THREE.BoxGeometry(1, 1, 1); // Larger than enemy
        const material = new THREE.MeshStandardMaterial({ color: 0x880000 });
        this.mesh = new THREE.Mesh(geometry, material);

        // Set initial position dynamically based on field height
        const initialPosition = this.game.data.enemies.boss.INITIAL_POSITION;
        const y = this.game.field.getHeightAt(initialPosition.x, initialPosition.z) + this.mesh.geometry.parameters.height / 2;
        this.mesh.position.set(initialPosition.x, y, initialPosition.z);

        this.hp = 200;
        this.maxHp = 200;
        this.isDead = false;
        this.attackCooldown = this.game.data.enemies.boss.ATTACK_COOLDOWN;
        this.experience = 100;
    }

    update(deltaTime) {
        if (this.hp <= 0) {
            this.isDead = true;
            return;
        }

        const distance = this.mesh.position.distanceTo(this.player.mesh.position);
        const bossData = this.game.data.enemies.boss;

        // Simple AI: Chase and attack
        if (distance > bossData.NORMAL_ATTACK_RANGE) {
            const direction = new THREE.Vector3().subVectors(this.player.mesh.position, this.mesh.position).normalize();
            this.mesh.position.add(direction.multiplyScalar(bossData.SPEED * deltaTime));
        }

        this.mesh.lookAt(this.player.mesh.position);

        this.attackCooldown -= deltaTime;
        if (distance <= bossData.NORMAL_ATTACK_RANGE && this.attackCooldown <= 0) {
            this.player.takeDamage(bossData.NORMAL_ATTACK_DAMAGE);
            this.attackCooldown = bossData.ATTACK_COOLDOWN; // Reset cooldown
        }
    }

    takeDamage(amount) {
        this.hp -= amount;
    }
}