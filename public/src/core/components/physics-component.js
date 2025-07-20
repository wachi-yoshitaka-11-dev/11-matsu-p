import * as THREE from 'three';
import { GRAVITY } from '../../utils/constants.js';

export class PhysicsComponent {
    constructor(object, field) {
        if (!object || !(object instanceof THREE.Mesh)) {
            console.error('PhysicsComponent: Invalid object provided. Must be a THREE.Mesh.');
            return;
        }
        if (!field) {
            console.error('PhysicsComponent: Invalid field provided.');
            return;
        }
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
        
        // Calculate object height using bounding box for more flexibility
        const boundingBox = new THREE.Box3().setFromObject(this.object);
        const objectHeight = boundingBox.max.y - boundingBox.min.y;

        if (this.object.position.y < groundHeight + objectHeight / 2) {
            this.object.position.y = groundHeight + objectHeight / 2;
            this.velocity.y = 0;
            this.onGround = true;
        } else {
            this.onGround = false;
        }
    }
}
