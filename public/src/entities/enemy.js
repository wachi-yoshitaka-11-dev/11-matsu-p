import * as THREE from 'three';
import { Character } from './character.js';

export class Enemy extends Character {
    constructor(game, player, position) {
        const geometry = new THREE.BoxGeometry(0.6, 0.6, 0.6);
        const material = new THREE.MeshStandardMaterial({ color: 0x0000ff });
        super(game, geometry, material, { hp: 30, speed: game.data.enemies.grunt.SPEED });

        this.player = player;
        this.mesh.position.copy(position);

        this.attackCooldown = this.game.data.enemies.grunt.ATTACK_COOLDOWN;
        this.experience = 10;
    }

    update(deltaTime) {
        super.update(deltaTime); // Handle physics and death check

        if (this.isDead) return;

        const distance = this.mesh.position.distanceTo(this.player.mesh.position);
        const gruntData = this.game.data.enemies.grunt;

        // Chase the player
        if (distance > gruntData.ATTACK_RANGE) {
            const direction = new THREE.Vector3().subVectors(this.player.mesh.position, this.mesh.position).normalize();
            this.mesh.position.x += direction.x * this.speed * deltaTime;
            this.mesh.position.z += direction.z * this.speed * deltaTime;
        }

        // Look at the player
        this.mesh.lookAt(this.player.mesh.position);

        // Attack
        this.attackCooldown -= deltaTime;
        if (distance <= gruntData.ATTACK_RANGE && this.attackCooldown <= 0) {
            this.attack();
            this.attackCooldown = gruntData.ATTACK_COOLDOWN; // Reset cooldown
        }
    }

    attack() {
        const toPlayer = new THREE.Vector3().subVectors(this.player.mesh.position, this.mesh.position).normalize();
        const playerForward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.player.mesh.quaternion);
        const angle = toPlayer.angleTo(playerForward);

        let damageToPlayer = this.game.data.enemies.grunt.DAMAGE;
        if (this.player.isDefenseBuffed) {
            damageToPlayer *= this.game.data.player.DEFENSE_BUFF_MULTIPLIER;
        }

        const isGuarded = this.player.isGuarding && angle < Math.PI / 2;

        if (isGuarded) {
            this.player.takeStaminaDamage(this.game.data.player.STAMINA_COST_GUARD);
        } else {
            this.player.takeDamage(damageToPlayer);
        }
    }
}