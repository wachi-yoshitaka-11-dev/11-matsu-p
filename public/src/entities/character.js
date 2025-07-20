import * as THREE from 'three';
import { PhysicsComponent } from '../core/components/physics-component.js';

/**
 * Represents a base class for all characters in the game (Player, Enemy, Boss).
 */
export class Character {
    /**
     * @param {Game} game - The main game instance.
     * @param {THREE.BufferGeometry} geometry - The geometry for the character's mesh.
     * @param {THREE.Material} material - The material for the character's mesh.
     * @param {object} options - Additional options for the character.
     * @param {number} options.hp - The health points of the character.
     * @param {number} options.speed - The movement speed of the character.
     */
    constructor(game, geometry, material, options = {}) {
        this.game = game;

        this.mesh = new THREE.Mesh(geometry, material);
        this.physics = new PhysicsComponent(this.mesh, this.game.field);

        // Default character stats
        const defaults = {
            hp: 100,
            speed: 2
        };

        this.maxHp = options.hp ?? defaults.hp;
        this.hp = this.maxHp;
        this.speed = options.speed ?? defaults.speed;
        this.isDead = false;
    }

    /**
     * Reduces the character's HP by a given amount.
     * @param {number} amount - The amount of damage to take.
     */
    takeDamage(amount) {
        if (this.isDead) return;

        this.hp -= amount;
        if (this.hp <= 0) {
            this.hp = 0;
            this.isDead = true;
            this.onDeath(); // Call the onDeath hook
        }
    }

    /**
     * A hook method that is called when the character's health reaches zero.
     * Child classes should override this to implement specific death behaviors.
     */
    onDeath() {
        // Base class has no specific death behavior
    }

    /**
     * Updates the character's physics.
     * This method should be called in the update loop of the child class.
     * @param {number} deltaTime - The time since the last frame.
     */
    update(deltaTime) {
        if (this.isDead) return;

        this.physics.update(deltaTime);
    }

    /**
     * Gets the current position of the character.
     * @returns {THREE.Vector3} The position vector.
     */
    getPosition() {
        return this.mesh.position;
    }

    /**
     * Disposes of the character's assets to free up memory.
     */
    dispose() {
        if (this.mesh.geometry) {
            this.mesh.geometry.dispose();
        }
        if (this.mesh.material) {
            this.mesh.material.dispose();
        }
        if (this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
        }
    }
}
