import * as THREE from 'three';
import { BaseEntity } from './base-entity.js';
import { PhysicsComponent } from '../core/components/physics-component.js';
import {
  EffectColors,
  Fall,
  AnimationNames,
  AssetPaths,
} from '../utils/constants.js';

export class Character extends BaseEntity {
  constructor(game, type, data, geometryOrModel, material, options = {}) {
    super(game, type, data, geometryOrModel, material, options);

    if (geometryOrModel instanceof THREE.Group) {
      this.mixer = new THREE.AnimationMixer(this.mesh);
      this.animations = game.assetLoader.getAnimations(options.modelName);
      if (this.animations && this.animations.length > 0) {
        this.playAnimation(AnimationNames.IDLE);
      }
    }
    this.currentAnimationName = null;

    this.physics = new PhysicsComponent(this.mesh, this.game.field);

    const defaults = {
      hp: 100,
      speed: 2,
    };

    this.maxHp = options.hp ?? defaults.hp;
    this.hp = this.maxHp;
    this.speed = options.speed ?? defaults.speed;
    this.isDead = false;

    this.originalColors = new Map();
    this.effectTimeout = null;

    this.mesh.traverse((object) => {
      if (object.isMesh && object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach((mat, index) => {
            if (mat.color) {
              this.originalColors.set(
                `${object.uuid}-${index}`,
                mat.color.clone()
              );
            }
          });
        } else if (object.material.color) {
          this.originalColors.set(object.uuid, object.material.color.clone());
        }
      }
    });
  }

  clearEffectTimeout() {
    if (this.effectTimeout) {
      clearTimeout(this.effectTimeout);
      this.effectTimeout = null;
    }
  }

  _setMeshColor(color) {
    this.mesh.traverse((object) => {
      if (object.isMesh && object.material) {
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

  _resetMeshColor() {
    this.mesh.traverse((object) => {
      if (object.isMesh && object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach((mat, index) => {
            const originalColor = this.originalColors.get(
              `${object.uuid}-${index}`
            );
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

  showDamageEffect() {
    this.clearEffectTimeout();
    this._setMeshColor(EffectColors.DAMAGE);
    this._startEffectTimeout(100);
  }

  showAttackEffect() {
    this.clearEffectTimeout();
    this._setMeshColor(EffectColors.ATTACK);
    this._startEffectTimeout(150);
  }

  showSkillProjectileEffect() {
    this.clearEffectTimeout();
    this._setMeshColor(EffectColors.SKILL_PROJECTILE);
    this._startEffectTimeout(100);
  }

  showSkillBuffEffect() {
    this.clearEffectTimeout();
    this._setMeshColor(EffectColors.SKILL_BUFF);
    this._startEffectTimeout(100);
  }

  startChargingEffect() {
    this.clearEffectTimeout();
    this._setMeshColor(EffectColors.CHARGE);
  }

  stopChargingEffect() {
    this._resetMeshColor();
  }

  _startEffectTimeout(duration) {
    this.clearEffectTimeout();
    this.effectTimeout = setTimeout(() => {
      this._resetMeshColor();
    }, duration);
  }

  playAnimation(name) {
    if (!this.mixer || !this.animations || this.currentAnimationName === name)
      return;

    const clip = THREE.AnimationClip.findByName(this.animations, name);
    if (clip) {
      const newAction = this.mixer.clipAction(clip);

      const isOneShot =
        name === AnimationNames.ATTACK_WEAK ||
        name === AnimationNames.ATTACK_STRONG ||
        name === AnimationNames.DIE ||
        name === AnimationNames.ROLLING ||
        name === AnimationNames.BACK_STEP ||
        name === AnimationNames.PICK_UP;
      if (isOneShot) {
        newAction.setLoop(THREE.LoopOnce);
        newAction.clampWhenFinished = true;
      } else {
        newAction.setLoop(THREE.LoopRepeat);
      }

      if (this.currentAction) {
        this.currentAction.fadeOut(0.2);
      }

      newAction.reset().fadeIn(0.2).play();
      this.currentAction = newAction;
      this.currentAnimationName = name;
    }
  }

  takeDamage(amount) {
    if (this.isDead) return;

    this.hp -= amount;
    this.showDamageEffect();
    this.game.playSound(AssetPaths.SFX_DAMAGE);
    if (this.hp <= 0) {
      this.hp = 0;
      this.isDead = true;
      this.onDeath();
    }
  }

  onDeath() {}

  update(deltaTime) {
    this.physics.update(deltaTime);

    if (this.mixer) {
      this.mixer.update(deltaTime);
    }

    if (this.isDead) {
      return;
    }

    if (this.mesh.position.y < Fall.FALL_DEATH_THRESHOLD) {
      this.hp = 0;
      this.isDead = true;
      this.onDeath();
    }
  }

  dispose() {
    super.dispose();
    this.clearEffectTimeout();
    this.physics = null;
    this.mixer = null;
    this.animations = null;
    this.originalColors.clear();
  }
}
