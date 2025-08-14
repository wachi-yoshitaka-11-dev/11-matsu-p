import * as THREE from 'three';
import { Skill } from './skill.js';
import { EffectColors } from '../../utils/constants.js';

export class AreaAttack extends Skill {
  constructor(game, areaAttackId, centerPosition, caster) {
    super(game, areaAttackId); // geometry, materialを削除

    this.caster = caster;

    const skillData = game.data.skills[areaAttackId];

    this.range = skillData.range || 4.0;
    this.damage = skillData.damage || 50;
    this.castTime = skillData.castTime || 800; // ms
    this.duration = skillData.duration || 1500; // ms

    // Elapsed time for the effect
    this.elapsedTime = 0;
    this.hasDealtDamage = false;

    // Position setting
    this.mesh.position.copy(centerPosition);
    this.mesh.position.y += 0.1; // Display slightly above ground
    this.mesh.rotation.x = -Math.PI / 2; // Rotate horizontally

    // Set initial scale to 0 (enlarge with animation)
    this.mesh.scale.setScalar(0);
  }

  update(deltaTime) {
    super.update(deltaTime);

    this.elapsedTime += deltaTime * 1000;
    const elapsed = this.elapsedTime;
    const progress = Math.min(elapsed / this.duration, 1);

    // Deal damage after cast time has elapsed
    if (elapsed >= this.castTime && !this.hasDealtDamage) {
      this.dealDamage();
      this.hasDealtDamage = true;
    }

    // Effect animation
    this.mesh.scale.setScalar(progress);
    // AreaAttackのmaterialはSkillクラスで生成されるので、そのopacityを操作する
    if (this.mesh.material) {
      this.mesh.material.opacity =
        (this.data.effect.opacity || 0.6) * (1 - progress);
    }

    // Mark for removal when duration ends
    if (progress >= 1) {
      this.lifespan = 0;
    }
  }

  dealDamage() {
    const centerPosition = this.mesh.position;

    if (this.caster !== this.game.player) {
      // Enemy attack: deal damage to player
      const distance = centerPosition.distanceTo(
        this.game.player.mesh.position
      );
      if (distance <= this.range) {
        this.game.player.takeDamage(this.damage);
        this.showDamageEffect(this.game.player.mesh.position);
      }
    } else {
      this.game.enemies.forEach((enemy) => {
        const distance = centerPosition.distanceTo(enemy.mesh.position);
        if (distance <= this.range) {
          enemy.takeDamage(this.damage);
          // Display individual damage effect
          this.showDamageEffect(enemy.mesh.position);
        }
      });
    }
  }

  showDamageEffect(position) {
    // Display damage effect
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

    // Animation
    let lastTime = performance.now();
    const duration = 500;
    let elapsed = 0;
    const animate = () => {
      const currentTime = performance.now();
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;
      elapsed += deltaTime;
      const progress = elapsed / duration;

      if (progress < 1) {
        effectMesh.position.y += 0.02 * (deltaTime / 16);
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
