import { Enemy } from './enemy.js';

export class Boss extends Enemy {
  constructor(game, enemyType, position, options = {}) {
    super(game, enemyType, position, options);
    // Boss固有の初期化はここに追加予定
  }

  update(deltaTime) {
    // Boss固有の処理がない場合は親クラスの処理をそのまま使用
    super.update(deltaTime);
  }

  // Boss固有のメソッドは後で追加予定
}
