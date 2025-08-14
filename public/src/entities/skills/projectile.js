import * as THREE from 'three';
import { Skill } from './skill.js';

export class Projectile extends Skill {
  constructor(game, projectileId, startPosition, direction, caster) {
    super(game, projectileId);

    this.caster = caster;

    const skillData = game.data.skills[projectileId];
    this.speed = skillData.speed || 10;
    this.lifespan = skillData.lifespan || 2; // seconds
    this.damage = skillData.damage || 30;

    this.mesh.position.copy(startPosition);

    const unitDir =
      direction && direction.lengthSq() > 1e-8
        ? direction.clone().normalize()
        : new THREE.Vector3(0, 0, -1);
    // Map -Z (forward) to unitDir instead of Y-up for consistent orientation
    this.mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 0, -1),
      unitDir
    );
    this.direction = unitDir;
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
