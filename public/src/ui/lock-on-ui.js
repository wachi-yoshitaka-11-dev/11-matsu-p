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
      document.body.appendChild(container);
    }
  }

  showLockOnTarget(enemy) {
    this.hideLockOnTarget(); // Hide any existing target first

    const indicator = document.createElement('div');
    indicator.classList.add('lock-on-target');

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
          indicator.classList.remove('hidden');
          indicator.classList.add('visible');
        } else {
          indicator.classList.add('hidden');
          indicator.classList.remove('visible');
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
