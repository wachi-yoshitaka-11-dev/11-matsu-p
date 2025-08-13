import * as THREE from 'three';
import { Character } from './character.js';
import {
  AssetPaths,
  AnimationNames,
  SkillTypes,
  AttackTypes,
  MovementState,
} from '../../utils/constants.js';

export class Enemy extends Character {
  constructor(game, enemyId, position, options = {}) {
    if (!position || position.x === undefined || position.z === undefined) {
      throw new Error('Valid position with x and z coordinates is required');
    }
    if (!options.player) {
      throw new Error('Player parameter is required in options for Enemy');
    }

    const enemyData = game.data.enemies[enemyId];
    if (!enemyData) {
      throw new Error(`Enemy ID "${enemyId}" not found in enemies data`);
    }
    const modelName = enemyData.model.replace('.glb', '');
    const model = game.assetLoader.getModel(modelName);
    if (model) {
      super(game, enemyId, enemyData, model.clone(), null, {
        hp: enemyData.hp,
        speed: enemyData.speed,
        modelName: modelName,
        textureName: enemyData.texture.replace('.png', ''),
      });
    } else {
      const geometry = new THREE.BoxGeometry(0.6, 1.2, 0.6);
      const material = new THREE.MeshStandardMaterial({ color: 0x0000ff });
      super(game, enemyId, enemyData, geometry, material, {
        hp: enemyData.hp,
        speed: enemyData.speed,
      });
    }

    this.player = options.player;

    this.placeOnGround(position.x, position.z);

    this.weakAttackCooldown = 0;
    this.strongAttackCooldown = 0;
    this.experience = this.data.experience;
    this.isPerformingWeakAttack = false;
    this.isPerformingStrongAttack = false;
    this.nextAction = null;

    // スキルクールダウン管理（Enemy固有）
    this.initializeSkillCooldowns();

    this.deathAnimationStartTime = null;
    this.deathAnimationDuration = 2000;
    this.readyForRemoval = false;

    if (this.mixer) {
      this.mixer.addEventListener('finished', (e) => {
        const clipName = e.action.getClip().name;
        if (clipName === AnimationNames.ATTACK_WEAK) {
          this.isPerformingWeakAttack = false;
        }
        if (clipName === AnimationNames.ATTACK_STRONG) {
          this.isPerformingStrongAttack = false;
        }
      });
    }
  }

  // スキルクールダウン初期化（Enemy固有）
  initializeSkillCooldowns() {
    this.skillCooldowns = {};

    // データからスキル情報を取得して初期化
    if (this.data && this.data.skills) {
      for (const skillId of Object.keys(this.data.skills)) {
        this.skillCooldowns[skillId] = 0;
        this.skillPerformanceStates[skillId] = false;
      }
    }
  }

  update(deltaTime) {
    super.update(deltaTime);

    // スキルクールダウン更新（Enemy固有）
    this.updateSkillCooldowns(deltaTime);

    if (this.isDead) {
      this.updateDeathAnimation();
      return;
    }

    if (this.isPerformingWeakAttack || this.isPerformingStrongAttack) {
      return;
    }

    this.updateAnimation();

    const distance = this.mesh.position.distanceTo(this.player.mesh.position);
    const minAttackRange = Math.min(
      this.data.weakAttack.range,
      this.data.strongAttack.range
    );

    if (distance > minAttackRange) {
      const direction = new THREE.Vector3()
        .subVectors(this.player.mesh.position, this.mesh.position)
        .normalize();
      this.mesh.position.x += direction.x * this.speed * deltaTime;
      this.mesh.position.z += direction.z * this.speed * deltaTime;
    }

    this.mesh.lookAt(this.player.mesh.position);

    this.weakAttackCooldown = Math.max(0, this.weakAttackCooldown - deltaTime);
    this.strongAttackCooldown = Math.max(
      0,
      this.strongAttackCooldown - deltaTime
    );

    this.chooseAndPerformAction(distance);
  }

  updateAnimation() {
    if (this.isPerformingWeakAttack || this.isPerformingStrongAttack) {
      return;
    }

    const distance = this.mesh.position.distanceTo(this.player.mesh.position);
    const minAttackRange = Math.min(
      this.data.weakAttack.range,
      this.data.strongAttack.range
    );

    if (distance > minAttackRange) {
      this.playAnimation(AnimationNames.WALK);
    } else {
      this.playAnimation(AnimationNames.IDLE);
    }
  }

  chooseAndPerformAction(distance) {
    // 次の行動が決まっていない場合、確率で決定
    if (this.nextAction === null) {
      this.selectNextAction();
    }

    // 決定された行動を実行
    this.executeSelectedAction(distance);
  }

  // 行動選択ロジック（子クラスでオーバーライド可能）
  selectNextAction() {
    // 通常のEnemyは基本攻撃のみ
    this.nextAction =
      Math.random() < this.data.strongAttack.probability
        ? AttackTypes.STRONG
        : AttackTypes.WEAK;
  }

  // 選択された行動の実行（子クラスでオーバーライド可能）
  executeSelectedAction(distance) {
    if (
      this.nextAction === AttackTypes.STRONG &&
      this.strongAttackCooldown <= 0 &&
      distance <= this.data.strongAttack.range
    ) {
      this.performStrongAttack();
      this.nextAction = null;
    } else if (
      this.nextAction === AttackTypes.WEAK &&
      this.weakAttackCooldown <= 0 &&
      distance <= this.data.weakAttack.range
    ) {
      this.performWeakAttack();
      this.nextAction = null;
    }
  }

  performWeakAttack() {
    this.isPerformingWeakAttack = true;
    this.weakAttackCooldown = this.data.weakAttack.cooldown;

    this.playAnimation(AnimationNames.ATTACK_WEAK);

    setTimeout(() => {
      this.dealDamageToPlayer(this.data.weakAttack.damage);
      this.game.playSound(AssetPaths.SFX_ATTACK_WEAK);
    }, this.data.weakAttack.castTime * 1000);
  }

  performStrongAttack() {
    this.isPerformingStrongAttack = true;
    this.strongAttackCooldown = this.data.strongAttack.cooldown;

    this.playAnimation(AnimationNames.ATTACK_STRONG);

    setTimeout(() => {
      this.dealDamageToPlayer(this.data.strongAttack.damage);
      this.game.playSound(AssetPaths.SFX_ATTACK_STRONG);
    }, this.data.strongAttack.castTime * 1000);
  }

  dealDamageToPlayer(damage) {
    const toEnemy = new THREE.Vector3()
      .subVectors(this.mesh.position, this.player.mesh.position)
      .normalize();
    const playerForward = this.player.getForwardDirection();
    const angle = toEnemy.angleTo(playerForward);

    const isGuarded = this.player.isGuarding && angle < Math.PI / 2;

    if (isGuarded) {
      this.player.takeStaminaDamage(this.game.data.player.staminaCostGuard);
      this.game.playSound(AssetPaths.SFX_GUARD);
    } else {
      this.player.takeDamage(damage);
    }
  }

  updateDeathAnimation() {
    if (!this.deathAnimationStartTime) return;

    const elapsedTime = Date.now() - this.deathAnimationStartTime;
    const progress = Math.min(elapsedTime / this.deathAnimationDuration, 1);

    const opacity = 1 - progress;
    this.mesh.traverse((object) => {
      if (object.isMesh && object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach((mat) => {
            mat.transparent = true;
            mat.opacity = opacity;
          });
        } else {
          object.material.transparent = true;
          object.material.opacity = opacity;
        }
      }
    });

    if (progress >= 1) {
      this.readyForRemoval = true;
    }
  }

  onDeath() {
    this.playAnimation(AnimationNames.DIE);
    this.game.playSound(AssetPaths.SFX_KILL);

    this.deathAnimationStartTime = Date.now();
  }

  // スキルクールダウンの更新（Enemy固有）
  updateSkillCooldowns(deltaTime) {
    for (const skillId of Object.keys(this.skillCooldowns)) {
      this.skillCooldowns[skillId] = Math.max(
        0,
        this.skillCooldowns[skillId] - deltaTime
      );
    }
  }

  // スキル実行可能かチェック（Enemy固有）
  canPerformSkill(skillId, distance = 0) {
    const skillData = this.game.data.skills[skillId];
    if (!skillData) return false;

    // クールダウン中か確認
    if (this.skillCooldowns[skillId] > 0) return false;

    // 実行中か確認
    if (this.skillPerformanceStates[skillId]) return false;

    // 距離チェック
    if (skillData.range && distance > skillData.range) {
      return false;
    }

    return true;
  }

  // スキル実行（Enemy固有）
  performSkill(skillId) {
    if (
      !this.data.skills ||
      !this.data.skills[skillId] ||
      !this.game.data.skills[skillId]
    ) {
      return false;
    }

    if (!this.canPerformSkill(skillId)) {
      return false;
    }

    this.skillPerformanceStates[skillId] = true;
    this.skillCooldowns[skillId] = this.data.skills[skillId].cooldown;

    // スキルデータからタイプを取得
    const skillData = this.game.data.skills[skillId]; // skillIdはID
    const skillType = skillData.type; // 実行タイプ

    // タイプ別の実行ロジック
    switch (skillType) {
      case SkillTypes.BUFF:
        this.executeBuffSkill(skillId);
        break;
      case SkillTypes.PROJECTILE:
        this.executeProjectileSkill(skillId);
        break;
      case SkillTypes.AREA_ATTACK:
        this.executeAreaAttackSkill(skillId);
        break;
      default:
        console.warn(
          `Unknown skill type: ${skillType} for skill ID: ${skillId}`
        );
        this.skillPerformanceStates[skillId] = false;
        return false;
    }

    return true;
  }

  // Enemy版のスキル実行（状態管理付き）
  executeBuffSkill(skillId) {
    super.executeBuffSkill(skillId);
    this.scheduleSkillStateReset(skillId, 500);
  }

  executeProjectileSkill(skillId) {
    super.executeProjectileSkill(skillId);
    this.scheduleSkillStateReset(skillId, 500);
  }

  executeAreaAttackSkill(skillId) {
    super.executeAreaAttackSkill(skillId);
    this.scheduleSkillStateReset(skillId, 500);
  }

  // スキル状態リセットのスケジュール
  scheduleSkillStateReset(skillId, delay) {
    setTimeout(() => {
      this.skillPerformanceStates[skillId] = false;
    }, delay);
  }

  // 移動情報取得（Enemy固有のシンプルな移動判定）
  getMovementInfo() {
    if (this.isDead) {
      return { shouldPlay: false, state: null };
    }

    // プレイヤーとの距離による移動判定
    const distance = this.mesh.position.distanceTo(this.player.mesh.position);
    const minAttackRange = Math.min(
      this.data.weakAttack.range,
      this.data.strongAttack.range
    );

    const isMoving = distance > minAttackRange;
    return {
      shouldPlay: isMoving,
      state: isMoving ? MovementState.WALK : null,
    };
  }
}
