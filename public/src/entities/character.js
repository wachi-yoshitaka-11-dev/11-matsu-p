import * as THREE from 'three';
import { PhysicsComponent } from '../core/components/physics-component.js';

export class Character {
    constructor(game, geometryOrModel, material, options = {}) {
        this.game = game;

        if (geometryOrModel instanceof THREE.Group) {
            this.mesh = geometryOrModel;
        } else {
            this.mesh = new THREE.Mesh(geometryOrModel, material);
        }

        this.physics = new PhysicsComponent(this.mesh, this.game.field);

        const defaults = {
            hp: 100,
            speed: 2
        };

        this.maxHp = options.hp ?? defaults.hp;
        this.hp = this.maxHp;
        this.speed = options.speed ?? defaults.speed;
        this.isDead = false;

        // For damage effects
        this.originalColors = new Map(); // Stores original colors for all sub-meshes
        this.effectTimeout = null; // For managing effect timeouts
    }

    // Clears any active effect timeout
    clearEffectTimeout() {
        if (this.effectTimeout) {
            clearTimeout(this.effectTimeout);
            this.effectTimeout = null;
        }
    }

    // Sets the color of the mesh(es)
    _setMeshColor(color) {
        this.mesh.traverse(object => {
            if (object.isMesh && object.material) {
                // Store original color if not already stored
                if (Array.isArray(object.material)) {
                    object.material.forEach((mat, index) => {
                        const key = `${object.uuid}-${index}`;
                        if (mat.color) {
                            if (!this.originalColors.has(key)) {
                                this.originalColors.set(key, mat.color.clone());
                            }
                            mat.color.set(color);
                        }
                    });
                } else if (object.material.color) {
                    if (!this.originalColors.has(object.uuid)) {
                        this.originalColors.set(object.uuid, object.material.color.clone());
                    }
                    object.material.color.set(color);
                }
            }
        });
    }

    // Resets the color of the mesh(es) to their original state
    _resetMeshColor() {
        this.mesh.traverse(object => {
            if (object.isMesh && object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach((mat, index) => {
                        const originalColor = this.originalColors.get(`${object.uuid}-${index}`);
                        if (mat.color && originalColor) {
                            mat.color.copy(originalColor);
                        }
                    });
                } else if (object.material && object.material.color) {
                    const originalColor = this.originalColors.get(object.uuid);
                    if (originalColor) {
                        object.material.color.copy(originalColor);
                    }
                }
            }
        });
    }

    // Shows a temporary damage effect (flashes red)
    showDamageEffect() {
        this.clearEffectTimeout();
        this._setMeshColor(0xff0000); // Flash red
        this._startEffectTimeout(100); // Revert after 100ms
    }

    // Generic effect methods (moved from Player.js)
    showAttackEffect() {
        this.clearEffectTimeout();
        this._setMeshColor(0xffffff); // White
        this._startEffectTimeout(100);
    }

    showSkillEffect() {
        this.clearEffectTimeout();
        this._setMeshColor(0x8a2be2); // BlueViolet
        this._startEffectTimeout(100);
    }

    startChargingEffect() {
        this.clearEffectTimeout(); // Clear any existing timeout
        this._setMeshColor(0xffff00); // Yellow
    }

    stopChargingEffect() {
        this._resetMeshColor();
    }

    // Helper to manage effect timeouts
    _startEffectTimeout(duration) {
        this.clearEffectTimeout();
        this.effectTimeout = setTimeout(() => {
            this._resetMeshColor();
        }, duration);
    }

    takeDamage(amount) {
        if (this.isDead) return;

        this.hp -= amount;
        this.showDamageEffect(); // ダメージエフェクトを呼び出す
        if (this.hp <= 0) {
            this.hp = 0;
            this.isDead = true;
            this.onDeath();
        }
    }

    onDeath() {}

    update(deltaTime) {
        if (this.isDead) return;
        this.physics.update(deltaTime);
    }

    getPosition() {
        return this.mesh.position;
    }

    dispose() {
        if (this.mesh instanceof THREE.Group) {
            this.mesh.traverse(object => {
                if (object.isMesh) {
                    object.geometry?.dispose();
                    if (Array.isArray(object.material)) {
                        object.material.forEach(mat => mat.dispose());
                    } else {
                        object.material?.dispose();
                    }
                }
            });
        } else {
            this.mesh.geometry?.dispose();
            this.mesh.material?.dispose();
        }

        if (this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
        }
    }
}