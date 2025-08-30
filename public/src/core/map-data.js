/**
 * Map data management class
 * Handles world-to-map coordinate conversion and static terrain element management
 */
export class MapData {
  constructor() {
    // World boundaries (Three.js world coordinate system)
    this.worldBounds = {
      minX: -50,
      maxX: 50,
      minZ: -50,
      maxZ: 50,
    };

    // Map size and scale
    this.mapSize = 180; // Minimap canvas size (px) - matches size in minimap.js
    this.viewRange = 20; // Display range around player (world units)

    // Static terrain elements are now loaded dynamically from the game world
  }

  /**
   * Convert world coordinates to map coordinates
   * @param {number} worldX - World X coordinate
   * @param {number} worldZ - World Z coordinate
   * @param {number} playerX - Player's world X coordinate (center)
   * @param {number} playerZ - Player's world Z coordinate (center)
   * @returns {Object} Map coordinates {x, y}
   */
  worldToMap(worldX, worldZ, playerX, playerZ) {
    // Relative coordinates centered on player
    const relativeX = worldX - playerX;
    const relativeZ = worldZ - playerZ;

    // Convert to map coordinates (player at map center)
    // Three.js -Z is forward, Canvas -Y is forward (up)
    const mapX =
      this.mapSize / 2 + (relativeX / this.viewRange) * (this.mapSize / 2);
    const mapY =
      this.mapSize / 2 + (relativeZ / this.viewRange) * (this.mapSize / 2);

    return { x: mapX, y: mapY };
  }

  /**
   * Convert map coordinates to world coordinates
   * @param {number} mapX - Map X coordinate
   * @param {number} mapY - Map Y coordinate
   * @param {number} playerX - Player's world X coordinate (center)
   * @param {number} playerZ - Player's world Z coordinate (center)
   * @returns {Object} World coordinates {x, z}
   */
  mapToWorld(mapX, mapY, playerX, playerZ) {
    // Relative coordinates from map center
    const relativeMapX = mapX - this.mapSize / 2;
    const relativeMapY = mapY - this.mapSize / 2;

    // Convert to world coordinates
    const worldX =
      playerX + (relativeMapX / (this.mapSize / 2)) * this.viewRange;
    const worldZ =
      playerZ + (relativeMapY / (this.mapSize / 2)) * this.viewRange;

    return { x: worldX, z: worldZ };
  }

  /**
   * Check if specified position is within map display range
   * @param {number} worldX - World X coordinate to check
   * @param {number} worldZ - World Z coordinate to check
   * @param {number} playerX - Player's world X coordinate
   * @param {number} playerZ - Player's world Z coordinate
   * @returns {boolean} Whether within display range
   */
  isInViewRange(worldX, worldZ, playerX, playerZ) {
    const distance = Math.sqrt(
      Math.pow(worldX - playerX, 2) + Math.pow(worldZ - playerZ, 2)
    );
    return distance <= this.viewRange;
  }

  /**
   * Get static terrain elements (from actual game world)
   * @param {number} playerX - Player's world X coordinate
   * @param {number} playerZ - Player's world Z coordinate
   * @returns {Array} Terrain elements within display range
   */
  getVisibleStaticElements(playerX, playerZ) {
    // Static terrain elements disabled - return empty array
    return [];
  }

  /**
   * Get world coordinates from Three.js Vector3
   * @param {THREE.Vector3} position - Three.js position vector
   * @returns {Object} World coordinates {x, z}
   */
  vector3ToWorld(position) {
    return {
      x: position.x,
      z: position.z,
    };
  }

  /**
   * Get entity direction as angle in degrees
   * @param {THREE.Object3D} entity - Three.js object
   * @returns {number} Angle in degrees (north as 0, clockwise)
   */
  getEntityRotation(entity) {
    if (!entity || !entity.rotation) return 0;

    // Convert Three.js Y-axis rotation to degrees (adjust north to 0 degrees)
    let degrees = (entity.rotation.y * 180) / Math.PI;
    degrees = (degrees + 90) % 360; // Adjust north to 0 degrees
    if (degrees < 0) degrees += 360;

    return degrees;
  }

  /**
   * Update map settings
   * @param {Object} options - Update options
   */
  updateSettings(options = {}) {
    if (options.viewRange !== undefined) {
      this.viewRange = Math.max(5, Math.min(50, options.viewRange));
    }
    if (options.mapSize !== undefined) {
      this.mapSize = Math.max(100, Math.min(300, options.mapSize));
    }
  }
}
