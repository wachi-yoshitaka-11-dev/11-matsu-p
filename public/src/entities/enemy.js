import * as THREE from 'three';

export class Enemy {
    constructor(game, player) {
        this.game = game;
        this.player = player;
        const geometry = new THREE.BoxGeometry(0.6, 0.6, 0.6);
        const material = new THREE.MeshStandardMaterial({ color: 0x0000ff });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(5, 0.3, 0); // 初期位置

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

        const distance = this.mesh.position.distanceTo(this.player.mesh.position);
        const gruntData = this.game.data.enemies.grunt;

        // プレイヤーを追跡
        if (distance > 1) {
            const direction = new THREE.Vector3().subVectors(this.player.mesh.position, this.mesh.position).normalize();
            this.mesh.position.add(direction.multiplyScalar(gruntData.SPEED * deltaTime));
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