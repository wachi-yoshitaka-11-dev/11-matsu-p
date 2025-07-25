import * as THREE from 'three';
import { Character } from './character.js';
import { AssetNames } from '../utils/constants.js';

export class Enemy extends Character {
    constructor(game, player, position, options = {}) {
        const model = game.assetLoader.getAsset(AssetNames.ENEMY_MODEL);
        if (model) {
            super(game, model.clone(), null, { hp: 30, speed: game.data.enemies.grunt.speed, modelName: AssetNames.ENEMY_MODEL, textureName: AssetNames.ENEMY_TEXTURE });
        } else {
            const geometry = new THREE.BoxGeometry(0.6, 1.2, 0.6);
            const material = new THREE.MeshStandardMaterial({ color: 0x0000ff });
            super(game, geometry, material, { hp: 30, speed: game.data.enemies.grunt.speed });
        }

        this.player = player;

        this.placeOnGround(position.x, position.z);

        this.attackCooldown = this.game.data.enemies.grunt.attackCooldown;
        this.experience = 10;
    }

    update(deltaTime) {
        super.update(deltaTime);

        if (this.isDead) return;

        const distance = this.mesh.position.distanceTo(this.player.mesh.position);
        const gruntData = this.game.data.enemies.grunt;

        if (distance > gruntData.attackRange) {
            const direction = new THREE.Vector3().subVectors(this.player.mesh.position, this.mesh.position).normalize();
            this.mesh.position.x += direction.x * this.speed * deltaTime;
            this.mesh.position.z += direction.z * this.speed * deltaTime;
        }

        this.mesh.lookAt(this.player.mesh.position);

        this.attackCooldown -= deltaTime;
        if (distance <= gruntData.attackRange && this.attackCooldown <= 0) {
            this.attack();
            this.attackCooldown = gruntData.attackCooldown;
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
            this.game.playSound('guard');
        } else {
            this.player.takeDamage(damageToPlayer);
            this.game.playSound('damage');
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
