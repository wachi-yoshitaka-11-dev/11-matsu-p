import * as THREE from 'three';
import { Skill } from './skill.js';

export class Projectile extends Skill {
  constructor(game, projectileType, startPosition, direction) {
    const geometry = new THREE.TorusGeometry(0.5, 0.1, 16, 100);
    const material = new THREE.MeshStandardMaterial({
      color: 0xffff00,
      emissive: 0xffff00,
    });

    super(game, projectileType, geometry, material);

    const skillData = game.data.skills[projectileType];
    this.speed = skillData.speed || 10;
    this.lifespan = skillData.lifespan || 2; // seconds
    this.damage = skillData.damage || 30;

    this.mesh.position.copy(startPosition);
    this.mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.normalize()
    );

    this.direction = direction.clone().normalize();
  }

  update(deltaTime) {
    super.update(deltaTime);

    this.lifespan -= deltaTime;

    const movement = this.direction
      .clone()
      .multiplyScalar(this.speed * deltaTime);
    this.mesh.position.add(movement);
  }
}
