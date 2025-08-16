import { Enemy } from './enemy.js';

/**
 * Grunt class - represents grunt enemies (non-boss enemies)
 * Inherits all functionality from Enemy class
 * This class exists for conceptual clarity and future extensibility
 */
export class Grunt extends Enemy {
  constructor(game, enemyId, position, options = {}) {
    super(game, enemyId, position, options);
  }

  // Currently no additional functionality beyond Enemy
  // This class exists for:
  // 1. Conceptual clarity (grunts vs bosses)
  // 2. Future extensibility (grunt-specific behaviors)
  // 3. Design consistency with other specialized classes
}
