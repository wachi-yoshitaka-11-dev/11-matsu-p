import * as THREE from 'three';
// Core
import { MapData } from '../core/map-data.js';
import {
  EnemyTypes,
  MinimapDisplayType,
  ItemTypes,
} from '../utils/constants.js';
// Entity classes
import { Npc } from '../entities/characters/npc.js';
import { Item } from '../entities/items/item.js';
import { Enemy } from '../entities/characters/enemy.js';

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
      area_fill: 'rgba(255, 255, 255, 0.1)', // A single faint color for all areas
      area_border: 'rgba(255, 255, 255, 0.15)', // Less conspicuous border
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
    const playerPos = this.game.player.mesh.position;
    const stageData = this.game.stageManager.getCurrentStageData();

    // 1. Draw the base minimap circle (as the abyss)
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.beginPath();
    this.ctx.arc(this.radius, this.radius, this.radius, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.save();
    // Clip subsequent drawing to the main minimap circle
    this.ctx.beginPath();
    this.ctx.arc(this.radius, this.radius, this.radius, 0, Math.PI * 2);
    this.ctx.clip();

    // 2. Draw the ground as a circle with a brighter color
    const groundColor = 'rgba(80, 120, 80, 0.75)'; // Brighter green
    this.ctx.fillStyle = groundColor;

    const groundEnv =
      stageData?.world?.environments?.find((env) => env.id === 'ground') || {};
    const groundPlacement = groundEnv.placements?.[0] || {};

    const groundWorldRadius = (groundPlacement.scale || 100) / 2;
    const groundWorldCenter = groundPlacement.position || [0, 0, 0];

    const groundMapCenter = this.mapData.worldToMap(
      groundWorldCenter[0],
      groundWorldCenter[2],
      playerPos.x,
      playerPos.z
    );
    const groundMapRadius =
      (groundWorldRadius / this.mapData.viewRange) * this.radius;

    this.ctx.beginPath();
    this.ctx.arc(
      groundMapCenter.x,
      groundMapCenter.y,
      groundMapRadius,
      0,
      Math.PI * 2
    );
    this.ctx.fill();

    // 3. Draw the area fills and borders
    this.ctx.strokeStyle = this.colors.area_border;
    this.ctx.fillStyle = this.colors.area_fill;
    this.ctx.lineWidth = 1;

    if (stageData && stageData.areas) {
      const areas = stageData.areas;
      for (const areaKey in areas) {
        if (areaKey === 'sky') continue;
        const area = areas[areaKey];
        if (area.center && area.radius) {
          const mapCenter = this.mapData.worldToMap(
            area.center[0],
            area.center[2],
            playerPos.x,
            playerPos.z
          );
          const mapRadius =
            (area.radius / this.mapData.viewRange) * this.radius;

          // Fill and stroke the area
          this.ctx.beginPath();
          this.ctx.arc(mapCenter.x, mapCenter.y, mapRadius, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.stroke();
        }
      }
    }

    this.ctx.restore();
  }

  /**
   * Draw camera direction (view frustum)
   */
  drawCameraDirection() {
    this.ctx.save();
    this.ctx.translate(this.radius, this.radius);

    const viewAngle = Math.PI / 3; // 60 degrees FOV
    const cameraRotation = this.game.inputController.cameraYaw;

    // Convert: Three.js north (0) should be Canvas up (-π/2)
    const cameraCanvasRotation = -cameraRotation - Math.PI / 2;
    const startAngle = cameraCanvasRotation - viewAngle / 2;
    const endAngle = cameraCanvasRotation + viewAngle / 2;

    // Create a radial gradient for the lighting effect
    const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.25)'); // Bright center
    gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.1)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0.0)'); // Fade to transparent

    this.ctx.fillStyle = gradient;

    // Draw the sector (arc) shape
    this.ctx.beginPath();
    this.ctx.moveTo(0, 0);
    this.ctx.arc(0, 0, this.radius, startAngle, endAngle);
    this.ctx.closePath();
    this.ctx.fill();

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
        const playerPos2D = new THREE.Vector2(playerPos.x, playerPos.z);
        const entityPos2D = new THREE.Vector2(
          entity.mesh.position.x,
          entity.mesh.position.z
        );
        const distance = playerPos2D.distanceTo(entityPos2D);
        if (this.cullingEnabled && distance > this.mapData.viewRange) {
          return null;
        }
        return { entity, distance };
      })
      .filter(Boolean)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, this.maxEntitiesPerType);

    this.ctx.save();

    visibleEntities.forEach(({ entity }) => {
      const mapPos = this.mapData.worldToMap(
        entity.mesh.position.x,
        entity.mesh.position.z,
        playerPos.x,
        playerPos.z
      );

      let displayType;

      if (entity instanceof Npc) {
        displayType = MinimapDisplayType.NPC;
      } else if (entity instanceof Item) {
        displayType = MinimapDisplayType.ITEM;
      } else if (entity instanceof Enemy) {
        displayType = MinimapDisplayType.ENEMY;
      }

      const fillColor = this.colors[displayType] || this.colors.enemy;
      const radius =
        (displayType === MinimapDisplayType.ENEMY &&
          entity.data?.type === EnemyTypes.BOSS) ||
        (displayType === MinimapDisplayType.ITEM &&
          entity.data?.type === ItemTypes.KEY)
          ? 5
          : 3;

      // Draw the entity fill and border
      this.ctx.fillStyle = fillColor;
      this.ctx.strokeStyle = 'rgba(0, 0, 0, 1)'; // Black border
      this.ctx.lineWidth = 1; // Border thickness
      this.ctx.beginPath();
      this.ctx.arc(mapPos.x, mapPos.y, radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();
    });

    this.ctx.restore();
  }

  /**
   * Draw player (triangle at center)
   */
  drawPlayer() {
    const player = this.game.player;

    this.ctx.save();
    this.ctx.translate(this.radius, this.radius);

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

    this.ctx.fillStyle = this.colors.player;
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 1)'; // Black border
    this.ctx.lineWidth = 1; // Border thickness
    this.ctx.beginPath();
    this.ctx.moveTo(0, -9.6); // Tip (8 * 1.2)
    this.ctx.lineTo(-6, 7.2); // Left barb (5 * 1.2, 6 * 1.2)
    this.ctx.lineTo(0, 3.6); // Center indent (3 * 1.2)
    this.ctx.lineTo(6, 7.2); // Right barb (5 * 1.2, 6 * 1.2)
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke(); // Draw the border

    this.ctx.restore();
  }

  /**
   * Draw border
   */
  drawBorder() {
    this.ctx.strokeStyle = this.borderColor;
    this.ctx.lineWidth = 1;
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
