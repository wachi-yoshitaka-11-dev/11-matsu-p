import * as THREE from 'three';

export class Boss {
    constructor(player) {
        this.player = player;
        const geometry = new THREE.BoxGeometry(2, 2, 2); // Larger size
        const material = new THREE.MeshStandardMaterial({ color: 0xff00ff });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(0, 1, -10);

        this.hp = 200;
        this.maxHp = 200;
        this.isDead = false;
        this.attackCooldown = 3; // Slower attack speed
        this.experience = 100;
    }

    update(deltaTime) {
        if (this.hp <= 0) {
            this.isDead = true;
            return;
        }

        this.mesh.lookAt(this.player.mesh.position);

        this.attackCooldown -= deltaTime;
        if (this.attackCooldown <= 0) {
            const attackType = Math.random();
            if (attackType < 0.7) {
                this.normalAttack();
            } else {
                this.specialAttack();
            }
            this.attackCooldown = 3 + Math.random() * 2; // Randomize cooldown
        }
    }

    normalAttack() {
        console.log('Boss: Normal Attack!');
        const distance = this.mesh.position.distanceTo(this.player.mesh.position);
        if (distance < 3 && !this.player.isInvincible) {
            this.player.hp -= 20;
            console.log(`Player HP: ${this.player.hp}`);
        }
    }

    specialAttack() {
        console.log('Boss: Special Attack! (Area of Effect)');
        // Simple AoE damage around the boss
        const distance = this.mesh.position.distanceTo(this.player.mesh.position);
        if (distance < 5 && !this.player.isInvincible) {
            this.player.hp -= 40;
            console.log(`Player HP: ${this.player.hp}`);
        }
        // TODO: Add visual effect for special attack
    }
}
