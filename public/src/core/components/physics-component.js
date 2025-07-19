import * as THREE from 'three';
import { GRAVITY } from '../../utils/constants.js';

export class PhysicsComponent {
    constructor(object, field) {
        this.object = object;
        this.field = field;
        this.velocity = new THREE.Vector3();
        this.onGround = false;
    }

    update(deltaTime) {
        // Apply gravity
        this.velocity.y -= GRAVITY * deltaTime;
        this.object.position.y += this.velocity.y * deltaTime;

        // Ground collision detection
        const groundHeight = this.field.getHeightAt(this.object.position.x, this.object.position.z);
        const objectHeight = this.object.geometry.parameters.height / 2; // Assuming BoxGeometry

        if (this.object.position.y < groundHeight + objectHeight) {
            this.object.position.y = groundHeight + objectHeight;
            this.velocity.y = 0;
            this.onGround = true;
        } else {
            this.onGround = false;
        }
    }
}
