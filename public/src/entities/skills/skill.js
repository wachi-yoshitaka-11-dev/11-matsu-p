import { BaseEntity } from '../base-entity.js';

export class Skill extends BaseEntity {
  constructor(game, skillId, geometry, material, options = {}) {
    const skillData = game.data.skills[skillId];
    if (!skillData) {
      throw new Error(`Skill ID "${skillId}" not found in skills data`);
    }

    // サブクラスから受け取ったジオメトリとマテリアルをBaseEntityに渡す
    super(game, skillId, skillData, geometry, material, options);
  }
}
