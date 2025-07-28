import * as THREE from 'three';
import { GameConstants } from '../../utils/constants.js';

export class PhysicsComponent {
  constructor(object, field) {
    if (!object || !(object instanceof THREE.Object3D)) {
      throw new Error(
        'PhysicsComponent: Invalid object provided. Must be a THREE.Object3D.'
      );
    }
    if (!field) {
      throw new Error('PhysicsComponent: Invalid field provided.');
    }
    this.object = object;
    this.field = field;
    this.velocity = new THREE.Vector3();
    this.onGround = false;

    const box = new THREE.Box3().setFromObject(this.object);
    this.objectHeight = box.getSize(new THREE.Vector3()).y;
  }

  update(deltaTime) {
    const previousY = this.object.position.y;

    this.velocity.y -= GameConstants.GRAVITY * deltaTime;
    this.object.position.y += this.velocity.y * deltaTime;

    this.object.position.x += this.velocity.x * deltaTime;
    this.object.position.z += this.velocity.z * deltaTime;

    const groundHeight = this.field.getHeightAt(
      this.object.position.x,
      this.object.position.z
    );
    const objectBottomY = this.object.position.y - this.objectHeight / 2;

    if (
      this.velocity.y <= 0 &&
      objectBottomY <= groundHeight &&
      previousY >= groundHeight
    ) {
      this.object.position.y = groundHeight + this.objectHeight / 2;
      this.velocity.y = 0;
      this.onGround = true;
    } else {
      this.onGround = false;
    }
  }
}
