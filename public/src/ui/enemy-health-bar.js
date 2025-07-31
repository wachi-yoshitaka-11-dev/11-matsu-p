import * as THREE from 'three';

export class EnemyHealthBar {
  constructor(game, sceneManager) {
    this.game = game;
    this.sceneManager = sceneManager;
    this.healthBars = new Map();
    this.maxDisplayDistance = 8; // Maximum distance to show health bar

    this.addStyles();
  }

  addStyles() {
    if (document.getElementById('enemy-health-bar-styles')) return;

    const style = document.createElement('style');
    style.id = 'enemy-health-bar-styles';
    style.textContent = `
      .enemy-health-bar {
        position: absolute;
        width: 60px;
        height: 8px;
        background-color: rgba(0, 0, 0, 0.7);
        border: 1px solid #333;
        border-radius: 4px;
        overflow: hidden;
        z-index: 10;
        pointer-events: none;
      }
      
      .enemy-health-bar-fill {
        height: 100%;
        background: linear-gradient(90deg, #ff4444 0%, #ffaa44 50%, #44ff44 100%);
        transition: width 0.3s ease;
        border-radius: 3px;
      }
      
      .enemy-health-bar-background {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(100, 0, 0, 0.5);
        border-radius: 3px;
      }
    `;
    document.head.appendChild(style);
  }

  createHealthBarElement(enemy) {
    const container = document.createElement('div');
    container.className = 'enemy-health-bar';

    const background = document.createElement('div');
    background.className = 'enemy-health-bar-background';
    container.appendChild(background);

    const fill = document.createElement('div');
    fill.className = 'enemy-health-bar-fill';
    fill.style.width = `${(enemy.hp / enemy.maxHp) * 100}%`;
    container.appendChild(fill);

    document.body.appendChild(container);
    return container;
  }

  updateHealthBar(enemy, element) {
    const fill = element.querySelector('.enemy-health-bar-fill');
    const healthPercent = Math.max(0, (enemy.hp / enemy.maxHp) * 100);
    fill.style.width = `${healthPercent}%`;

    // Change color based on health percentage
    if (healthPercent > 60) {
      fill.style.background = '#44ff44';
    } else if (healthPercent > 30) {
      fill.style.background = '#ffaa44';
    } else {
      fill.style.background = '#ff4444';
    }
  }

  getScreenPosition(enemy) {
    // Get enemy's world position (slightly above the enemy)
    const enemyWorldPos = enemy.mesh.position.clone();
    enemyWorldPos.y += 2; // Position above enemy's head

    // Project to screen coordinates
    const screenPos = enemyWorldPos.clone();
    screenPos.project(this.sceneManager.camera);

    // Convert to pixel coordinates
    const canvas = this.sceneManager.renderer.domElement;
    const x = (screenPos.x * 0.5 + 0.5) * canvas.clientWidth;
    const y = (screenPos.y * -0.5 + 0.5) * canvas.clientHeight;

    // Check if position is behind camera
    if (screenPos.z > 1) {
      return null; // Don't display if behind camera
    }

    return { x, y };
  }

  update() {
    if (!this.game.player) return;

    const playerPos = this.game.player.mesh.position;

    // Update existing health bars and check distances
    for (const [enemy, element] of this.healthBars) {
      if (enemy.isDead || enemy.readyForRemoval) {
        // Remove health bar for dead enemies
        element.remove();
        this.healthBars.delete(enemy);
        continue;
      }

      const distance = playerPos.distanceTo(enemy.mesh.position);

      if (distance <= this.maxDisplayDistance) {
        // Update position
        const screenPos = this.getScreenPosition(enemy);

        if (screenPos) {
          // Show and update health bar
          element.style.display = 'block';
          this.updateHealthBar(enemy, element);
          element.style.left = `${screenPos.x - 30}px`; // Center the 60px wide bar
          element.style.top = `${screenPos.y - 15}px`;
        } else {
          // Hide if behind camera
          element.style.display = 'none';
        }
      } else {
        // Hide health bar when too far
        element.style.display = 'none';
      }
    }

    // Create health bars for new enemies within range
    for (const enemy of this.game.enemies) {
      if (!this.healthBars.has(enemy) && !enemy.isDead) {
        const distance = playerPos.distanceTo(enemy.mesh.position);

        if (distance <= this.maxDisplayDistance) {
          const element = this.createHealthBarElement(enemy);
          this.healthBars.set(enemy, element);
        }
      }
    }
  }

  dispose() {
    // Remove all health bar elements
    for (const [enemy, element] of this.healthBars) {
      element.remove();
    }
    this.healthBars.clear();

    // Remove styles
    const styleElement = document.getElementById('enemy-health-bar-styles');
    if (styleElement) {
      styleElement.remove();
    }
  }
}
