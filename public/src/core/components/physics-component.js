import * as THREE from 'three';
import { GameConstants } from '../../utils/constants.js';

export class PhysicsComponent {
    constructor(object, field) {
        if (!object || !(object instanceof THREE.Mesh)) {
            throw new Error('PhysicsComponent: Invalid object provided. Must be a THREE.Mesh.');
        }
        if (!field) {
            throw new Error('PhysicsComponent: Invalid field provided.');
        }
        this.object = object;
        this.field = field;
        this.velocity = new THREE.Vector3();
        this.onGround = false;
    }

    update(deltaTime) {
        const previousY = this.object.position.y;

        // Apply gravity
        this.velocity.y -= GameConstants.gravity * deltaTime;
        this.object.position.y += this.velocity.y * deltaTime;

        // Ground collision detection
        if (!this.field.getHeightAt) {
            console.warn('PhysicsComponent: Field object does not implement getHeightAt method');
            return;
        }
        const groundHeight = this.field.getHeightAt(this.object.position.x, this.object.position.z);
        const objectHeight = this.object.geometry.parameters.height; // Assuming simple geometry
        const objectBottomY = this.object.position.y - objectHeight / 2;

        // Check if the object has passed through the ground in this frame
        if (this.velocity.y <= 0 && objectBottomY <= groundHeight && previousY >= groundHeight) {
            this.object.position.y = groundHeight + objectHeight / 2;
            this.velocity.y = 0;
            this.onGround = true;
        } else {
            this.onGround = false;
        }
    }
}
