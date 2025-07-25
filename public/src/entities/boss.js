import * as THREE from 'three';
import { Character } from './character.js';
import { AssetNames } from '../utils/constants.js';

export class Boss extends Character {
    constructor(game, player, options = {}) {
        const model = game.assetLoader.getAsset(AssetNames.BOSS_MODEL);
        if (model) {
            super(game, model.clone(), null, { hp: 200, speed: game.data.enemies.boss.speed, modelName: AssetNames.BOSS_MODEL, textureName: AssetNames.BOSS_TEXTURE });
        } else {
            const geometry = new THREE.BoxGeometry(2, 2, 2);
            const material = new THREE.MeshStandardMaterial({ color: 0x880000 });
            super(game, geometry, material, { hp: 200, speed: game.data.enemies.boss.speed });
        }

        this.player = player;

        const initialPosition = this.game.data.enemies.boss.initialPosition;
        this.placeOnGround(initialPosition.x, initialPosition.z);

        this.attackCooldown = this.game.data.enemies.boss.attackCooldown;
        this.experience = 100;
    }

    update(deltaTime) {
        super.update(deltaTime);

        if (this.isDead) return;

        const distance = this.mesh.position.distanceTo(this.player.mesh.position);
        const bossData = this.game.data.enemies.boss;

        if (distance > bossData.normalAttackRange) {
            const direction = new THREE.Vector3().subVectors(this.player.mesh.position, this.mesh.position).normalize();
            this.mesh.position.add(direction.multiplyScalar(this.speed * deltaTime));
        }

        this.mesh.lookAt(this.player.mesh.position);

        this.attackCooldown -= deltaTime;
        if (distance <= bossData.normalAttackRange && this.attackCooldown <= 0) {
            this.player.takeDamage(bossData.normalAttackDamage);
            this.attackCooldown = bossData.attackCooldown;
        }
    }
}