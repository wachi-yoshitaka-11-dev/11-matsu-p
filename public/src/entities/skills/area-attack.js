import * as THREE from 'three';
import { Skill } from './skill.js';
import { EffectColors } from '../../utils/constants.js';

export class AreaAttack extends Skill {
  constructor(game, areaAttackType, centerPosition) {
    const skillData = game.data.skills[areaAttackType];

    // 範囲攻撃の視覚的エフェクト用のリングジオメトリ
    const geometry = new THREE.RingGeometry(0.5, skillData.range || 4.0, 16);
    const material = new THREE.MeshBasicMaterial({
      color: EffectColors.SKILL_AREA_ATTACK,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    });

    super(game, areaAttackType, geometry, material);

    this.range = skillData.range || 4.0;
    this.damage = skillData.damage || 50;
    this.castTime = skillData.castTime || 800; // ms
    this.duration = skillData.duration || 1500; // ms

    // エフェクトの開始時刻
    this.startTime = Date.now();
    this.hasDealtDamage = false;

    // 位置設定
    this.mesh.position.copy(centerPosition);
    this.mesh.position.y += 0.1; // 地面より少し上に表示
    this.mesh.rotation.x = -Math.PI / 2; // 水平に回転

    // 初期スケールを0に設定（アニメーションで拡大）
    this.mesh.scale.setScalar(0);
  }

  update(deltaTime) {
    super.update(deltaTime);

    const elapsed = Date.now() - this.startTime;
    const progress = Math.min(elapsed / this.duration, 1);

    // キャストタイムが経過したらダメージを与える
    if (elapsed >= this.castTime && !this.hasDealtDamage) {
      this.dealDamage();
      this.hasDealtDamage = true;
    }

    // エフェクトのアニメーション
    this.mesh.scale.setScalar(progress);
    this.mesh.material.opacity = 0.6 * (1 - progress);

    // 持続時間が終了したら削除マーク
    if (progress >= 1) {
      this.lifespan = 0;
    }
  }

  dealDamage() {
    const centerPosition = this.mesh.position;

    // プレイヤー周囲の敵にダメージを与える
    this.game.enemies.forEach((enemy) => {
      const distance = centerPosition.distanceTo(enemy.mesh.position);
      if (distance <= this.range) {
        enemy.takeDamage(this.damage);
        // 個別ダメージエフェクトを表示
        this.showDamageEffect(enemy.mesh.position);
      }
    });
  }

  showDamageEffect(position) {
    // ダメージエフェクトの表示
    const effectGeometry = new THREE.SphereGeometry(0.3, 8, 8);
    const effectMaterial = new THREE.MeshBasicMaterial({
      color: EffectColors.DAMAGE,
      transparent: true,
      opacity: 0.8,
    });
    const effectMesh = new THREE.Mesh(effectGeometry, effectMaterial);

    effectMesh.position.copy(position);
    effectMesh.position.y += 1.0;

    this.game.sceneManager.add(effectMesh);

    // アニメーション
    let elapsed = 0;
    const duration = 500;
    const animate = () => {
      elapsed += 16;
      const progress = elapsed / duration;

      if (progress < 1) {
        effectMesh.position.y += 0.02;
        effectMaterial.opacity = 0.8 * (1 - progress);
        requestAnimationFrame(animate);
      } else {
        this.game.sceneManager.remove(effectMesh);
        effectGeometry.dispose();
        effectMaterial.dispose();
      }
    };
    animate();
  }
}
