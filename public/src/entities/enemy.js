import * as THREE from 'three';
import { Character } from './character.js';

export class Enemy extends Character {
    constructor(game, player, position) {
        const model = game.assetLoader.getAsset('enemy');
        if (model) {
            super(game, model.clone(), null, { hp: 30, speed: game.data.enemies.grunt.speed });
        } else {
            const geometry = new THREE.BoxGeometry(0.6, 1.2, 0.6);
            const material = new THREE.MeshStandardMaterial({ color: 0x0000ff });
            super(game, geometry, material, { hp: 30, speed: game.data.enemies.grunt.speed });
        }

        this.player = player;

        const box = new THREE.Box3().setFromObject(this.mesh);
        const height = box.getSize(new THREE.Vector3()).y;
        const y = game.field.getHeightAt(position.x, position.z) + height / 2;
        this.mesh.position.set(position.x, y, position.z);

        this.attackCooldown = this.game.data.enemies.grunt.attackCooldown;
        this.experience = 10;
    }

    update(deltaTime) {
        super.update(deltaTime); // Handle physics and death check

        if (this.isDead) return;

        const distance = this.mesh.position.distanceTo(this.player.mesh.position);
        const gruntData = this.game.data.enemies.grunt;

        // Chase the player
        if (distance > gruntData.attackRange) {
            const direction = new THREE.Vector3().subVectors(this.player.mesh.position, this.mesh.position).normalize();
            this.mesh.position.x += direction.x * this.speed * deltaTime;
            this.mesh.position.z += direction.z * this.speed * deltaTime;
        }

        // Look at the player
        this.mesh.lookAt(this.player.mesh.position);

        // Attack
        this.attackCooldown -= deltaTime;
        if (distance <= gruntData.attackRange && this.attackCooldown <= 0) {
            this.attack();
            this.attackCooldown = gruntData.attackCooldown; // Reset cooldown
        }
    }

    attack() {
        const damageToPlayer = this._calculateDamage();
        const toPlayer = new THREE.Vector3().subVectors(this.player.mesh.position, this.mesh.position).normalize();
        const playerForward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.player.mesh.quaternion);
        const angle = toPlayer.angleTo(playerForward);

        const isGuarded = this.player.isGuarding && angle < Math.PI / 2;

        if (isGuarded) {
            this.player.takeStaminaDamage(this.game.data.player.staminaCostGuard);
            this.game.playSound('guard'); // ガード成功時にガード音を再生
        } else {
            this.player.takeDamage(damageToPlayer);
            this.game.playSound('damage'); // ガードしていない場合はダメージ音を再生
        }
    }

    _calculateDamage() {
        let damage = this.game.data.enemies.grunt.damage;
        if (this.player.isDefenseBuffed) {
            damage *= this.game.data.player.attackBuffMultiplier;
        }
        return damage;
    }
}
