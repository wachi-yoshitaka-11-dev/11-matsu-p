import * as THREE from 'three';

export class LockOnUI {
  constructor(sceneManager, camera) {
    this.sceneManager = sceneManager;
    this.camera = camera;
    this.lockOnIndicators = new Map(); // Map from enemy to UI element
    this.setupUI();
  }

  setupUI() {
    // Create container for lock-on UI elements
    if (!document.querySelector('#lock-on-container')) {
      const container = document.createElement('div');
      container.id = 'lock-on-container';
      container.style.position = 'absolute';
      container.style.top = '0';
      container.style.left = '0';
      container.style.width = '100%';
      container.style.height = '100%';
      container.style.pointerEvents = 'none';
      container.style.zIndex = '1000';
      document.body.appendChild(container);
    }
  }

  showLockOnTarget(enemy) {
    this.hideLockOnTarget(); // Hide any existing target first

    const indicator = document.createElement('div');
    indicator.className = 'lock-on-target';
    indicator.style.position = 'absolute';
    indicator.style.width = '40px';
    indicator.style.height = '40px';
    indicator.style.border = '2px solid #ff4444';
    indicator.style.borderRadius = '50%';
    indicator.style.backgroundColor = 'transparent';
    indicator.style.pointerEvents = 'none';
    indicator.style.transform = 'translate(-50%, -50%)';
    indicator.style.animation = 'pulse 1s infinite';

    // Add pulse animation if not already defined
    if (!document.querySelector('#lock-on-styles')) {
      const style = document.createElement('style');
      style.id = 'lock-on-styles';
      style.textContent = `
        @keyframes pulse {
          0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.6; transform: translate(-50%, -50%) scale(1.2); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `;
      document.head.appendChild(style);
    }

    const container = document.querySelector('#lock-on-container');
    container.appendChild(indicator);

    this.lockOnIndicators.set(enemy, indicator);
  }

  hideLockOnTarget() {
    // Remove all existing lock-on indicators
    this.lockOnIndicators.forEach((indicator) => {
      if (indicator.parentNode) {
        indicator.parentNode.removeChild(indicator);
      }
    });
    this.lockOnIndicators.clear();
  }

  update() {
    // Update positions of all lock-on indicators
    this.lockOnIndicators.forEach((indicator, enemy) => {
      if (enemy.mesh && !enemy.isDead) {
        const position = this.worldToScreen(enemy.mesh.position);
        if (position) {
          indicator.style.left = position.x + 'px';
          indicator.style.top = position.y + 'px';
          indicator.style.display = 'block';
        } else {
          indicator.style.display = 'none';
        }
      } else {
        // Remove indicator if enemy is dead or invalid
        if (indicator.parentNode) {
          indicator.parentNode.removeChild(indicator);
        }
        this.lockOnIndicators.delete(enemy);
      }
    });
  }

  worldToScreen(worldPosition) {
    const vector = worldPosition.clone();
    vector.project(this.camera);

    const canvas = this.sceneManager.renderer.domElement;
    const widthHalf = canvas.clientWidth / 2;
    const heightHalf = canvas.clientHeight / 2;

    vector.x = vector.x * widthHalf + widthHalf;
    vector.y = -(vector.y * heightHalf) + heightHalf;

    // Return null if position is behind camera or outside view
    if (vector.z > 1) return null;

    return { x: vector.x, y: vector.y };
  }
}
