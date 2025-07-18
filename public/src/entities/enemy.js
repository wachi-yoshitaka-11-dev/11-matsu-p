import * as THREE from 'three';
import {
    ENEMY_ATTACK_COOLDOWN,
    ENEMY_DAMAGE,
    ENEMY_ATTACK_RANGE,
    PLAYER_DEFENSE_BUFF_MULTIPLIER,
    ENEMY_SPEED
} from '../utils/constants.js';

export class Enemy {
    constructor(player) {
        this.player = player;
        const geometry = new THREE.BoxGeometry(0.6, 0.6, 0.6);
        const material = new THREE.MeshStandardMaterial({ color: 0x0000ff });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(5, 0.3, 0); // 初期位置

        this.hp = 30;
        this.maxHp = 30;
        this.isDead = false;
        this.attackCooldown = ENEMY_ATTACK_COOLDOWN; // 2秒に1回攻撃
        this.experience = 10; // 倒した時にもらえる経験値
    }

    update(deltaTime) {
        if (this.hp <= 0) {
            this.isDead = true;
            return;
        }

        const distance = this.mesh.position.distanceTo(this.player.mesh.position);

        // プレイヤーを追跡
        if (distance > 1) {
            const direction = new THREE.Vector3().subVectors(this.player.mesh.position, this.mesh.position).normalize();
            this.mesh.position.add(direction.multiplyScalar(ENEMY_SPEED * deltaTime));
        }

        // プレイヤーの方を向く
        this.mesh.lookAt(this.player.mesh.position);

        // 攻撃
        this.attackCooldown -= deltaTime;
        if (distance <= ENEMY_ATTACK_RANGE && this.attackCooldown <= 0) {
            this.attack();
            this.attackCooldown = ENEMY_ATTACK_COOLDOWN; // Reset cooldown
        }
    }

    attack() {
        const toPlayer = new THREE.Vector3().subVectors(this.player.mesh.position, this.mesh.position).normalize();
        const playerForward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.player.mesh.quaternion);
        const angle = toPlayer.angleTo(playerForward);

        let damageToPlayer = ENEMY_DAMAGE;
        if (this.player.isDefenseBuffed) {
            damageToPlayer *= PLAYER_DEFENSE_BUFF_MULTIPLIER;
        }

        const isGuarded = this.player.isGuarding && angle < Math.PI / 2;

        if (isGuarded) {
            this.player.takeStaminaDamage(Player.STAMINA_COST_GUARD);
        } else {
            this.player.takeDamage(damageToPlayer);
        }
    }

    takeDamage(amount) {
        this.hp -= amount;
    }
}
