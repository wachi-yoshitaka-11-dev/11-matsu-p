import * as THREE from 'three';
import { BaseEntity } from '../base-entity.js';
import { PhysicsComponent } from '../../core/components/physics-component.js';
import { AreaAttack } from '../skills/area-attack.js';
import { Projectile } from '../skills/projectile.js';
import {
  EffectColors,
  Fall,
  AnimationNames,
  AssetPaths,
  SkillTypes,
  MovementState,
  AudioConstants,
} from '../../utils/constants.js';

export class Character extends BaseEntity {
  constructor(game, id, data, geometryOrModel, material, options = {}) {
    super(game, id, data, geometryOrModel, material, options);

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

    // スキルパフォーマンス状態（キャラクター共通）
    this.skillPerformanceStates = {};

    // 歩行音関連（キャラクター共通）
    this.footstepAudio = null;
    this.isPlayingFootsteps = false;
    this.lastMovementState = null;

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
    } else {
      console.warn(
        `${this.constructor.name} animation clip not found for:`,
        name
      );
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
      this.stopFootsteps();
      return;
    }

    if (this.mesh.position.y < Fall.FALL_DEATH_THRESHOLD) {
      this.hp = 0;
      this.isDead = true;
      this.onDeath();
    }

    // 歩行音を自動管理
    this.updateFootsteps();

    // 必要に応じて子クラスで追加のアップデートを実行
  }

  // キャラクターの前方向を取得（共通処理）
  getForwardDirection() {
    const direction = new THREE.Vector3(0, 0, 1).applyQuaternion(
      this.mesh.quaternion
    );
    direction.y = 0; // Y軸方向は無視して水平方向のみ
    direction.normalize();
    return direction;
  }

  // 歩行音管理（キャラクター共通）
  startFootsteps(movementState) {
    if (this.isPlayingFootsteps) {
      this.stopFootsteps();
    }

    const soundName =
      movementState === MovementState.DASH
        ? AssetPaths.SFX_DASH
        : AssetPaths.SFX_WALK;

    // 距離に基づく音量を計算
    const volume = this.calculateFootstepVolume();

    this.footstepAudio = this.game.createAudio(soundName, {
      volume: volume,
      loop: true,
    });

    if (this.footstepAudio) {
      this.footstepAudio.play();
    }

    this.isPlayingFootsteps = true;
  }

  // 距離に基づく歩行音の音量計算
  calculateFootstepVolume() {
    // プレイヤー自身の場合は基本音量
    if (this === this.game.player) {
      return AudioConstants.PLAYER_FOOTSTEP_VOLUME;
    }

    // プレイヤーとの距離を計算
    const distance = this.mesh.position.distanceTo(
      this.game.player.mesh.position
    );

    // 距離が最大可聴距離を超えている場合は音量0
    if (distance >= AudioConstants.FOOTSTEP_MAX_AUDIBLE_DISTANCE) {
      return 0;
    }

    // 線形補間で音量を計算（距離が近いほど音量大）
    const volumeRatio =
      1 - distance / AudioConstants.FOOTSTEP_MAX_AUDIBLE_DISTANCE;
    const volume =
      AudioConstants.FOOTSTEP_MIN_VOLUME +
      (AudioConstants.FOOTSTEP_MAX_VOLUME -
        AudioConstants.FOOTSTEP_MIN_VOLUME) *
        volumeRatio;

    return Math.max(
      AudioConstants.FOOTSTEP_MIN_VOLUME,
      Math.min(AudioConstants.FOOTSTEP_MAX_VOLUME, volume)
    );
  }

  stopFootsteps() {
    if (this.footstepAudio) {
      this.footstepAudio.stop();
      this.footstepAudio = null;
    }
    this.isPlayingFootsteps = false;
    this.lastMovementState = null;
  }

  // 歩行音の自動管理（基底クラス共通処理）
  updateFootsteps() {
    const movementInfo = this.getMovementInfo();

    if (!movementInfo.shouldPlay) {
      this.stopFootsteps();
      return;
    }

    if (movementInfo.state !== this.lastMovementState) {
      this.stopFootsteps();
      this.startFootsteps(movementInfo.state);
      this.lastMovementState = movementInfo.state;
    }

    if (!this.isPlayingFootsteps) {
      this.startFootsteps(movementInfo.state);
    }

    // 再生中の歩行音の音量を距離に応じて動的に更新
    this.updateFootstepVolume();
  }

  // 再生中の歩行音の音量を動的に更新
  updateFootstepVolume() {
    if (this.footstepAudio && this.isPlayingFootsteps) {
      const newVolume = this.calculateFootstepVolume();

      // 音量が0の場合は音を停止
      if (newVolume === 0) {
        this.stopFootsteps();
        return;
      }

      // 音量を更新
      this.footstepAudio.setVolume(newVolume);
    }
  }

  // 移動情報取得（子クラスでオーバーライド）
  getMovementInfo() {
    // デフォルト実装：移動していない
    return { shouldPlay: false, state: null };
  }

  // 共通エフェクトメソッド（子クラスで使用可能）
  createProjectile(skillId) {
    const startPosition = this.mesh.position.clone();
    startPosition.y += 1.5;

    const projectileDirection = this.getForwardDirection();
    startPosition.add(projectileDirection.clone().multiplyScalar(0.5));

    const projectile = new Projectile(
      this.game,
      skillId,
      startPosition,
      projectileDirection,
      this
    );

    this.game.projectiles.push(projectile);
    this.game.sceneManager.add(projectile.mesh);
    return projectile;
  }

  createAreaAttack(skillId) {
    const areaAttack = new AreaAttack(
      this.game,
      skillId,
      this.mesh.position.clone(),
      this
    );

    if (!this.game.areaAttacks) {
      this.game.areaAttacks = [];
    }
    this.game.areaAttacks.push(areaAttack);
    this.game.sceneManager.add(areaAttack.mesh);
    return areaAttack;
  }

  // 共通バフ処理
  applyAttackBuff(skillData) {
    this.attackBuffMultiplier = skillData.attackBuffMultiplier || 1.5;
  }

  removeAttackBuff() {
    this.attackBuffMultiplier = 1.0;
  }

  applyDefenseBuff(skillData) {
    this.defenseBuffMultiplier = skillData.defenseBuffMultiplier || 1.5;
  }

  removeDefenseBuff() {
    this.defenseBuffMultiplier = 1.0;
  }

  // 基本スキル実行メソッド（アニメーション付き）
  executeBuffSkill(skillId) {
    const skillData = this.game.data.skills[skillId];
    if (!skillData) return;

    // 共通のアニメーション実行
    this.playAnimation(this.getSkillAnimation(SkillTypes.BUFF));

    setTimeout(() => {
      this.applyAttackBuff(skillData);
      this.applyDefenseBuff(skillData);

      setTimeout(() => {
        this.removeAttackBuff();
        this.removeDefenseBuff();
      }, skillData.duration || 5000);
    }, skillData.castTime || 0);
  }

  executeProjectileSkill(skillId) {
    const skillData = this.game.data.skills[skillId];
    if (!skillData) return;

    // 共通のアニメーション実行
    this.playAnimation(this.getSkillAnimation(SkillTypes.PROJECTILE));

    setTimeout(() => {
      if (!this.isDead) {
        this.createProjectile(skillId);
      }
    }, skillData.castTime || 200);
  }

  executeAreaAttackSkill(skillId) {
    const skillData = this.game.data.skills[skillId];
    if (!skillData) return;

    // 共通のアニメーション実行
    this.playAnimation(this.getSkillAnimation(SkillTypes.AREA_ATTACK));

    setTimeout(() => {
      if (!this.isDead) {
        this.createAreaAttack(skillId);
      }
    }, skillData.castTime || 200);
  }

  // スキルアニメーション名を取得
  getSkillAnimation(skillType) {
    switch (skillType) {
      case SkillTypes.BUFF:
        return AnimationNames.USE_SKILL_BUFF;
      case SkillTypes.PROJECTILE:
        return AnimationNames.USE_SKILL_PROJECTILE;
      case SkillTypes.AREA_ATTACK:
        return AnimationNames.USE_SKILL_AREA_ATTACK;
      default:
        console.warn(
          `Unknown skill type: ${skillType}, falling back to idle animation`
        );
        return AnimationNames.IDLE;
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
