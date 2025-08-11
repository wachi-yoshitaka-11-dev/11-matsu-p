import { BaseEntity } from './base-entity.js';

export class Skill extends BaseEntity {
  constructor(game, skillType, geometry, material, options = {}) {
    const skillData = game.data.skills[skillType];
    if (!skillData) {
      throw new Error(`Skill type "${skillType}" not found in skills data`);
    }

    // サブクラスから受け取ったジオメトリとマテリアルをBaseEntityに渡す
    super(game, skillType, skillData, geometry, material, options);
  }

  update(deltaTime) {
    super.update(deltaTime);
  }
}
