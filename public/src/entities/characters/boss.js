import * as THREE from 'three';
import { Enemy } from './enemy.js';
import {
  AttackTypes,
  AnimationNames,
} from '../../utils/constants.js';

export class Boss extends Enemy {
  constructor(game, enemyId, position, options = {}) {
    super(game, enemyId, position, options);
  }

  update(deltaTime) {
    // 親クラスの更新処理を呼び出し（物理演算、アニメーション等）
    super.update(deltaTime);

    if (this.isDead) {
      this.updateDeathAnimation();
      return;
    }

    // スキル実行中かどうかを動的にチェック
    const isPerformingAnySkill = Object.values(
      this.skillPerformanceStates || {}
    ).some((state) => state);
    if (
      this.isPerformingWeakAttack ||
      this.isPerformingStrongAttack ||
      isPerformingAnySkill
    ) {
      // スキル実行中でもアニメーションは更新する
      this.updateBossAnimation();
      return;
    }

    this.updateBossAnimation();

    const distance = this.mesh.position.distanceTo(this.player.mesh.position);
    // 基本攻撃の範囲で移動判定（スキルは独自に範囲判定）
    const basicAttackRange = Math.min(
      this.data.weakAttack.range,
      this.data.strongAttack.range
    );

    if (distance > basicAttackRange) {
      const direction = new THREE.Vector3()
        .subVectors(this.player.mesh.position, this.mesh.position)
        .normalize();
      this.mesh.position.x += direction.x * this.speed * deltaTime;
      this.mesh.position.z += direction.z * this.speed * deltaTime;
    }

    this.mesh.lookAt(this.player.mesh.position);

    // 全攻撃タイプのクールダウンを更新
    this.weakAttackCooldown = Math.max(0, this.weakAttackCooldown - deltaTime);
    this.strongAttackCooldown = Math.max(
      0,
      this.strongAttackCooldown - deltaTime
    );

    // 継承した共通の行動選択ロジックを使用
    this.chooseAndPerformAction(distance);
  }

  // ボス専用の行動選択ロジック（オーバーライド）
  selectNextAction() {
    const rand = Math.random();
    let cumulativeProbability = 0;

    // スキルの確率判定を動的に処理（攻撃、バフ、回復など全て含む）
    if (this.data.skills) {
      for (const skillId of Object.keys(this.data.skills)) {
        const skillConfig = this.data.skills[skillId];
        if (skillConfig.probability) {
          cumulativeProbability += skillConfig.probability;
          if (rand < cumulativeProbability) {
            this.nextAction = skillId;
            return;
          }
        }
      }
    }

    // 基本攻撃の確率判定
    cumulativeProbability += this.data.strongAttack.probability;
    if (rand < cumulativeProbability) {
      this.nextAction = AttackTypes.STRONG;
    } else {
      this.nextAction = AttackTypes.WEAK;
    }
  }

  // ボス専用の行動実行ロジック（オーバーライド）
  executeSelectedAction(distance) {
    if (this.data.skills && this.data.skills[this.nextAction]) {
      // スキルの実行（攻撃、バフ、回復など）
      if (this.canPerformSkill(this.nextAction, distance)) {
        if (this.performSkill(this.nextAction)) {
          this.nextAction = null;
        }
      } else {
        // スキルが実行できない場合はリセットして次回新しい行動を選択
        this.nextAction = null;
      }
    } else if (
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
    } else {
      // 攻撃が実行できない場合はリセットして次回新しい行動を選択
      this.nextAction = null;
    }
  }

  // ボス専用のアニメーション更新
  updateBossAnimation() {
    // 既に攻撃アニメーション中の場合は何もしない
    if (this.isPerformingWeakAttack || this.isPerformingStrongAttack) {
      return;
    }

    // スキル実行中のチェック
    const isPerformingAnySkill = Object.values(
      this.skillPerformanceStates || {}
    ).some((state) => state);
    if (isPerformingAnySkill) {
      return; // スキル実行中は現在のアニメーションを維持
    }

    const distance = this.mesh.position.distanceTo(this.player.mesh.position);

    // 基本攻撃の範囲でアニメーション判定
    const basicAttackRange = Math.min(
      this.data.weakAttack.range,
      this.data.strongAttack.range
    );

    if (distance > basicAttackRange) {
      this.playAnimation(AnimationNames.WALK);
    } else {
      this.playAnimation(AnimationNames.IDLE);
    }
  }

  // damageMultiplierを適用するためにオーバーライド
  dealDamageToPlayer(damage) {
    const actualDamage = damage * (this.damageMultiplier || 1);
    super.dealDamageToPlayer(actualDamage);
  }

  // Boss版のスキル実行（状態管理付き）
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

  // 攻撃状態の強制リセット（バックアップ機能）
  performWeakAttack() {
    super.performWeakAttack();
    // バックアップリセット：アニメーション終了時間 + 安全マージン
    setTimeout(
      () => {
        this.isPerformingWeakAttack = false;
      },
      (this.data.weakAttack.castTime + 2) * 1000
    );
  }

  performStrongAttack() {
    super.performStrongAttack();
    // バックアップリセット：アニメーション終了時間 + 安全マージン
    setTimeout(
      () => {
        this.isPerformingStrongAttack = false;
      },
      (this.data.strongAttack.castTime + 2) * 1000
    );
  }
}
