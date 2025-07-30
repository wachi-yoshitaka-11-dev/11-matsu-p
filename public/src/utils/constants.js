export const GameConstants = {
  GAME_SPEED: 1.0,
  GRAVITY: 9.8,
};

export const Field = {
  TERRAIN_SIZE: 100,
  TERRAIN_SEGMENTS: 50,
  // General object scale (can be overridden by specific object scales)
  OBJECT_MIN_SCALE: 0.5,
  OBJECT_MAX_SCALE: 1.5,

  // Specific object scales
  TREE_MIN_SCALE: 2.0,
  TREE_MAX_SCALE: 6.0,
  ROCK_MIN_SCALE: 2.0,
  ROCK_MAX_SCALE: 10.0,
  GRASS_MIN_SCALE: 0.5,
  GRASS_MAX_SCALE: 4.0,
  CLOUD_MIN_SCALE: 5.0,
  CLOUD_MAX_SCALE: 50.0,
  SUN_MIN_SCALE: 400.0,
  SUN_MAX_SCALE: 400.0,

  // Object counts
  TREE_COUNT: 20,
  ROCK_COUNT: 40,
  GRASS_COUNT: 1000,
  CLOUD_COUNT: 100,
  SUN_COUNT: 1,

  // Opacity
  CLOUD_OPACITY: 0.4,
  SUN_OPACITY: 0.8,
};

export const Fall = {
  FALL_DEATH_THRESHOLD: -100,
  MAX_FALL_DEPTH: -1000,
};

export const EffectColors = {
  DAMAGE: 0xff0000,
  ATTACK: 0xffff00,
  SKILL_PROJECTILE: 0x8a2be2,
  SKILL_BUFF: 0x00ffff,
  CHARGE: 0xff00ff,
};

export const AssetNames = {
  // Models
  PLAYER_MODEL: 'player',
  ENEMY_MODEL: 'enemy',
  BOSS_MODEL: 'boss',
  NPC_MODEL: 'npc',
  ITEM_MODEL: 'item',
  TREE_MODEL: 'tree',
  ROCK_MODEL: 'rock',
  GRASS_MODEL: 'grass',

  // Audio
  BGM_PLAYING: 'bgm-playing',
  BGM_TITLE: 'bgm-title',
  BGM_OPENING: 'bgm-opening',
  BGM_ENDING: 'bgm-ending',
  SFX_ATTACK_STRONG: 'attack-strong',
  SFX_ATTACK_WEAK: 'attack-weak',
  SFX_CLICK: 'click',
  SFX_DAMAGE: 'damage',
  SFX_DEATH: 'death',
  SFX_GUARD: 'guard',
  SFX_JUMP: 'jump',
  SFX_KILL: 'kill',
  SFX_LEVEL_UP: 'level-up',
  SFX_LOCK_ON: 'lock-on',
  SFX_PAUSE: 'pause',
  SFX_ROLLING: 'rolling',
  SFX_START: 'start',
  SFX_SWITCH_WEAPON: 'switch-weapon',
  SFX_TALK: 'talk',
  SFX_USE_ITEM: 'use-item',
  SFX_PICKUP_ITEM: 'pickup-item',
  SFX_USE_SKILL_BUFF: 'use-skill-buff',
  SFX_USE_SKILL_PROJECTILE: 'use-skill-projectile',

  // Textures
  PLAYER_TEXTURE: 'player-texture',
  ENEMY_TEXTURE: 'enemy-texture',
  BOSS_TEXTURE: 'boss-texture',
  NPC_TEXTURE: 'npc-texture',
  ITEM_TEXTURE: 'item-texture',
  TREE_TEXTURE: 'tree-texture',
  ROCK_TEXTURE: 'rock-texture',
  GRASS_TEXTURE: 'grass-texture',
  CLOUD_TEXTURE: 'cloud-texture',
  GROUND_TEXTURE: 'ground-texture',
};

export const AnimationNames = {
  IDLE: 'idle',
  WALK: 'walk',
  DASH: 'sprint',
  ROLLING: 'wheelchair-move-forward',
  JUMP: 'sit',
  DIE: 'die',
  ATTACK_WEAK: 'attack-melee-left',
  ATTACK_STRONG: 'attack-melee-right',
  GUARD: 'holding-right',
  TALK: 'interact-left',
  USE_ITEM: 'interact-right',
  USE_SKILL_BUFF: 'interact-right',
  USE_SKILL_PROJECTILE: 'attack-kick-right',
};

export const GameState = {
  TITLE: 'title',
  PLAYING: 'playing',
  PAUSED: 'paused',
  SEQUENCE: 'sequence',
};

export const ItemTypes = {
  POTION: 'potion',
};
