import { Skill } from './skill.js';

/**
 * Buff class - represents buff/support skills
 * Inherits all functionality from Skill class
 * This class exists for conceptual clarity and future extensibility
 */
export class Buff extends Skill {
  constructor(game, skillId, options = {}) {
    super(game, skillId, options);
  }

  // Currently no additional functionality beyond Skill
  // This class exists for:
  // 1. Conceptual clarity (buffs vs projectiles vs area attacks)
  // 2. Future extensibility (buff-specific behaviors like duration, stacking, etc.)
  // 3. Design consistency with other specialized skill classes
}
