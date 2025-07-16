import * as THREE from 'three';
import { Game } from './core/Game.js';
import { Player } from './entities/Player.js';
import { Field } from './world/Field.js';
import { Enemy } from './entities/Enemy.js';
import { InputController } from './controls/InputController.js';
import { Item } from './world/Item.js';
import { Boss } from './entities/Boss.js';
import { Npc } from './entities/Npc.js';
import { SceneManager } from './core/SceneManager.js';
import { AssetLoader } from './core/AssetLoader.js';

// 1. ワールド（地形）の生成
const field = new Field();

// 2. プレイヤーの生成（地形情報を渡す）
const player = new Player(field);

// 3. ゲーム本体の生成（プレイヤー情報を渡す）
const game = new Game(player);

// 4. 入力コントローラーの生成（プレイヤー、カメラ、ゲーム本体を渡す）
const inputController = new InputController(player, game.sceneManager.camera, game);
game.inputController = inputController; // ゲーム本体に入力コントローラーをセット

// 5. シーンにオブジェクトを追加
game.sceneManager.add(field.mesh);
game.sceneManager.add(player.mesh);

// 6. 敵やアイテムなどを生成してシーンとゲーム管理リストに追加
const enemy = new Enemy(player);
game.enemies.push(enemy);
game.sceneManager.add(enemy.mesh);

const item = new Item('potion', new THREE.Vector3(3, 0.2, 3));
game.items.push(item);
game.sceneManager.add(item.mesh);

const boss = new Boss(player);
game.boss = boss;
game.sceneManager.add(boss.mesh);

const npc = new Npc('こんにちは、冒険者よ。この先には強力なボスが待ち構えているぞ。');
game.npcs.push(npc);
game.sceneManager.add(npc.mesh);

// 7. ゲーム開始
game.start();
