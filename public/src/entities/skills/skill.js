import { BaseEntity } from '../base-entity.js';

export class Skill extends BaseEntity {
  constructor(game, skillId, geometry, material, options = {}) {
    const skillData = game.data.skills[skillId];
    if (!skillData) {
      throw new Error(`Skill ID "${skillId}" not found in skills data`);
    }

    // Pass geometry and material received from subclass to BaseEntity
    super(game, skillId, skillData, geometry, material, options);
  }
}
