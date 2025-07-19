import * as THREE from 'three';
import { PhysicsComponent } from '../core/components/physics-component.js';
import { GRAVITY } from '../utils/constants.js';

export class Enemy {
    constructor(game, player, position) {
        this.game = game;
        this.player = player;
        const geometry = new THREE.BoxGeometry(0.6, 0.6, 0.6);
        const material = new THREE.MeshStandardMaterial({ color: 0x0000ff });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position);

        this.physics = new PhysicsComponent(this.mesh, this.game.field);
        this.velocity = new THREE.Vector3(); // Initialize velocity

        this.hp = 30;
        this.maxHp = 30;
        this.isDead = false;
        this.attackCooldown = this.game.data.enemies.grunt.ATTACK_COOLDOWN; // 2秒に1回攻撃
        this.experience = 10; // 倒した時にもらえる経験値
    }

    update(deltaTime) {
        if (this.hp <= 0) {
            this.isDead = true;
            return;
        }

        // Use the physics component for gravity and ground collision
        this.physics.update(deltaTime);

        const distance = this.mesh.position.distanceTo(this.player.mesh.position);
        const gruntData = this.game.data.enemies.grunt;

        // プレイヤーを追跡
        if (distance > gruntData.ATTACK_RANGE) { // Use ATTACK_RANGE for chase distance
            const direction = new THREE.Vector3().subVectors(this.player.mesh.position, this.mesh.position).normalize();
            this.mesh.position.x += direction.x * gruntData.SPEED * deltaTime;
            this.mesh.position.z += direction.z * gruntData.SPEED * deltaTime;
        }

        // プレイヤーの方を向く
        this.mesh.lookAt(this.player.mesh.position);

        // 攻撃
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

    takeDamage(amount) {
        this.hp -= amount;
    }
}
