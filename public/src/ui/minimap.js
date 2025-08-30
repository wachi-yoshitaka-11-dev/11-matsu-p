// Core
import { MapData } from '../core/map-data.js';

/**
 * Minimap UI component
 * Displays a circular minimap with player at center and correct directional indicators
 */
export class Minimap {
  constructor(game) {
    this.game = game;
    this.mapData = new MapData();

    // Rendering settings
    this.size = 180;
    this.radius = this.size / 2;
    this.backgroundColor = 'rgba(0, 0, 0, 0.65)';
    this.borderColor = 'rgba(255, 255, 255, 0.25)';

    // Entity color settings
    this.colors = {
      player: '#00ff00', // Green
      enemy: '#ff4444', // Red
      npc: '#66aaff', // Blue
      item: '#ffff66', // Yellow
      terrain: 'rgba(128, 128, 128, 0.5)', // Gray
    };

    // Create and initialize DOM elements
    this.createElements();
    this.setupCanvas();

    // Rendering flags and optimization settings
    this.isVisible = true;
    this.lastUpdateTime = 0;
    this.updateInterval = 1000 / 30; // Update at 30 FPS

    // Performance optimization settings
    this.maxEntitiesPerType = 30;
    this.cullingEnabled = true;
  }

  /**
   * Create DOM elements
   */
  createElements() {
    this.container = document.createElement('div');
    this.container.id = 'minimap-container';
    this.container.classList.add('minimap-container');

    this.canvas = document.createElement('canvas');
    this.canvas.id = 'minimap-canvas';
    this.container.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d');
    if (!this.ctx) {
      console.error('Failed to get 2D context for minimap canvas');
    }
  }

  /**
   * Setup canvas initial configuration
   */
  setupCanvas() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.size * dpr;
    this.canvas.height = this.size * dpr;
    this.canvas.style.width = `${this.size}px`;
    this.canvas.style.height = `${this.size}px`;
    this.ctx.scale(dpr, dpr);
  }

  /**
   * Update minimap (called every frame)
   * @param {number} currentTime - Current time
   */
  update(currentTime) {
    if (
      !this.isVisible ||
      !this.game.player?.mesh?.position ||
      !this.ctx ||
      currentTime - this.lastUpdateTime < this.updateInterval
    ) {
      return;
    }
    this.lastUpdateTime = currentTime;
    this.render();
  }

  /**
   * Render the minimap
   */
  render() {
    this.clearCanvas();
    this.drawBackground();

    this.ctx.save();
    // Clip to circle
    this.ctx.beginPath();
    this.ctx.arc(this.radius, this.radius, this.radius, 0, Math.PI * 2);
    this.ctx.clip();

    this.drawEntities();
    this.drawTerrain();

    this.ctx.restore();

    this.drawPlayer();
    this.drawCameraDirection();
    this.drawBorder();
  }

  /**
   * Clear the canvas
   */
  clearCanvas() {
    this.ctx.clearRect(0, 0, this.size, this.size);
  }

  /**
   * Draw background
   */
  drawBackground() {
    this.ctx.fillStyle = this.backgroundColor;
    this.ctx.beginPath();
    this.ctx.arc(this.radius, this.radius, this.radius, 0, Math.PI * 2);
    this.ctx.fill();
  }

  /**
   * Draw camera direction (view frustum)
   */
  drawCameraDirection() {
    this.ctx.save();
    this.ctx.translate(this.radius, this.radius);

    const viewAngle = Math.PI / 3; // 60 degrees FOV
    const cameraRotation = this.game.inputController.cameraYaw;

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    this.ctx.lineWidth = 1;

    this.ctx.beginPath();
    this.ctx.moveTo(0, 0);

    // Camera direction should match player direction
    // When camera faces north (rotation=0), fan should point up (north)

    // Convert: Three.js north (0) should be Canvas up (-π/2)
    const cameraCanvasRotation = -cameraRotation - Math.PI / 2;
    const startAngle = cameraCanvasRotation - viewAngle / 2;
    const endAngle = cameraCanvasRotation + viewAngle / 2;

    this.ctx.arc(0, 0, this.radius, startAngle, endAngle);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.restore();
  }

  /**
   * Draw terrain elements
   */
  drawTerrain() {
    const playerPos = this.game.player.mesh.position;
    const staticElements = this.mapData.getVisibleStaticElements(
      playerPos.x,
      playerPos.z
    );

    this.ctx.fillStyle = this.colors.terrain;
    staticElements.forEach((element) => {
      const mapPos = this.mapData.worldToMap(
        element.x,
        element.z,
        playerPos.x,
        playerPos.z
      );
      const elementWidth =
        (element.width / this.mapData.viewRange) * this.radius;
      const elementHeight =
        (element.height / this.mapData.viewRange) * this.radius;

      this.ctx.fillRect(
        mapPos.x - elementWidth / 2,
        mapPos.y - elementHeight / 2,
        elementWidth,
        elementHeight
      );
    });
  }

  /**
   * Draw entities (enemies, NPCs, items)
   */
  drawEntities() {
    const playerPos = this.game.player.mesh.position;
    const entities = [
      ...(this.game.entities.characters.enemies || []),
      ...(this.game.entities.characters.npcs || []),
      ...(this.game.entities.items || []),
    ];

    const visibleEntities = entities
      .map((entity) => {
        if (!entity.mesh?.position) return null;
        const distance = playerPos.distanceTo(entity.mesh.position);
        if (this.cullingEnabled && distance > this.mapData.viewRange) {
          return null;
        }
        return { entity, distance };
      })
      .filter(Boolean)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, this.maxEntitiesPerType);

    visibleEntities.forEach(({ entity }) => {
      let type = 'enemy';
      if (entity.data?.dialogue) type = 'npc';
      if (entity.data?.healAmount || entity.data?.fpHealAmount) type = 'item';

      const mapPos = this.mapData.worldToMap(
        entity.mesh.position.x,
        entity.mesh.position.z,
        playerPos.x,
        playerPos.z
      );

      this.ctx.fillStyle = this.colors[type];
      this.ctx.beginPath();
      this.ctx.arc(mapPos.x, mapPos.y, 3, 0, Math.PI * 2);
      this.ctx.fill();
    });
  }

  /**
   * Draw player (triangle at center)
   */
  drawPlayer() {
    const player = this.game.player;

    this.ctx.save();
    this.ctx.translate(this.radius, this.radius);

    // Player triangle should point towards player's actual facing direction
    // Extract Y-axis rotation from player mesh quaternion for accurate direction
    const playerQuaternion = player.mesh.quaternion;
    const playerRotationY = Math.atan2(
      2 *
        (playerQuaternion.w * playerQuaternion.y +
          playerQuaternion.x * playerQuaternion.z),
      1 -
        2 *
          (playerQuaternion.y * playerQuaternion.y +
            playerQuaternion.z * playerQuaternion.z)
    );

    this.ctx.rotate(-playerRotationY + Math.PI);

    // Draw triangle pointing up
    this.ctx.fillStyle = this.colors.player;
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.moveTo(0, -7);
    this.ctx.lineTo(-5, 5);
    this.ctx.lineTo(5, 5);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.restore();
  }

  /**
   * Draw border
   */
  drawBorder() {
    this.ctx.strokeStyle = this.borderColor;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(this.radius, this.radius, this.radius - 1, 0, Math.PI * 2);
    this.ctx.stroke();
  }

  /**
   * Toggle minimap visibility
   * @param {boolean} visible - Whether to show the minimap
   */
  setVisible(visible) {
    this.isVisible = visible;
    this.container.style.display = visible ? 'block' : 'none';
  }

  show() {
    this.setVisible(true);
  }

  hide() {
    this.setVisible(false);
  }

  dispose() {
    if (this.container?.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.canvas = null;
    this.ctx = null;
    this.container = null;
    this.mapData = null;
  }
}
