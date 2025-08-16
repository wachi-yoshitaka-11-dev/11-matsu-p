import * as THREE from 'three';
import { GameConstants, Fall } from '../../utils/constants.js';

export class PhysicsComponent {
  constructor(object, game) {
    if (!object || !(object instanceof THREE.Object3D)) {
      throw new Error(
        'PhysicsComponent: Invalid object provided. Must be a THREE.Object3D.'
      );
    }
    if (!game) {
      throw new Error('PhysicsComponent: Invalid game provided.');
    }
    this.object = object;
    this.game = game;
    this.velocity = new THREE.Vector3();
    this.onGround = false;

    const box = new THREE.Box3().setFromObject(this.object);
    this.objectHeight = box.getSize(new THREE.Vector3()).y;
  }

  update(deltaTime) {
    // Apply gravity
    this.velocity.y -= GameConstants.GRAVITY * deltaTime;

    // Apply all movement including gravity
    this.object.position.x += this.velocity.x * deltaTime;
    this.object.position.y += this.velocity.y * deltaTime;
    this.object.position.z += this.velocity.z * deltaTime;

    // Ground collision detection - prioritize stage GLB, fallback to field
    let groundHeight = Fall.MAX_FALL_DEPTH;

    // First check stage GLB (higher priority)
    if (this.game.stageManager) {
      groundHeight = this.game.stageManager.getHeightAt(
        this.object.position.x,
        this.object.position.z
      );
    }

    // StageManager provides comprehensive height detection for all stage elements

    // Apply ground collision if surface exists
    if (groundHeight > Fall.MAX_FALL_DEPTH) {
      if (this.object.position.y <= groundHeight + this.objectHeight / 2) {
        this.object.position.y = groundHeight + this.objectHeight / 2;
        this.velocity.y = 0;
        this.onGround = true;
      } else {
        this.onGround = false;
      }
    } else {
      // No ground surface - allow falling
      this.onGround = false;
    }
  }
}
