export const GameConstants = {
  GAME_SPEED: 1.0,
  GRAVITY: 9.8,
};

export const Field = {
  TERRAIN_SIZE: 100,
  TERRAIN_SEGMENTS: 50,
  OBJECT_MIN_SCALE: 0.5,
  OBJECT_MAX_SCALE: 1.5,

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

  TREE_COUNT: 20,
  ROCK_COUNT: 40,
  GRASS_COUNT: 1000,
  CLOUD_COUNT: 100,
  SUN_COUNT: 1,

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
  PLAYER_MODEL: 'player',
  TREE_MODEL: 'tree',
  ROCK_MODEL: 'rock',
  GRASS_MODEL: 'grass',

  BGM_TITLE: 'bgm-title',
  BGM_OPENING: 'bgm-opening',
  BGM_ENDING: 'bgm-ending',
  BGM_LEVEL_01_01: 'bgm-level-01_01',
  BGM_LEVEL_01_02: 'bgm-level-01_02',
  BGM_LEVEL_02_01: 'bgm-level-02_01',
  BGM_LEVEL_02_02: 'bgm-level-02_02',
  BGM_LEVEL_03_01: 'bgm-level-03_01',
  BGM_LEVEL_03_02: 'bgm-level-03_02',
  BGM_LEVEL_04_01: 'bgm-level-04_01',
  BGM_LEVEL_04_02: 'bgm-level-04_02',
  BGM_LEVEL_05_01: 'bgm-level-05_01',
  BGM_LEVEL_05_02: 'bgm-level-05_02',
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
  SFX_UNPAUSE: 'unpause',
  SFX_ROLLING: 'rolling',
  SFX_BACK_STEP: 'back-step',
  SFX_DASH: 'dash',
  SFX_START: 'start',
  SFX_SWITCH_WEAPON: 'switch-weapon',
  SFX_SWITCH_SHIELD: 'switch-shield',
  SFX_SWITCH_ITEM: 'switch-item',
  SFX_SWITCH_SKILL: 'switch-skill',
  SFX_TALK: 'talk',
  SFX_USE_ITEM: 'use-item',
  SFX_PICKUP_ITEM: 'pickup-item',
  SFX_USE_SKILL_BUFF: 'use-skill-buff',
  SFX_USE_SKILL_PROJECTILE: 'use-skill-projectile',
  SFX_WALK: 'walk',

  PLAYER_TEXTURE: 'player-texture',
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
  BACK_STEP: 'wheelchair-move-back',
  JUMP: 'sit',
  DIE: 'die',
  ATTACK_WEAK: 'attack-melee-left',
  ATTACK_STRONG: 'attack-melee-right',
  GUARD: 'holding-right',
  TALK: 'interact-left',
  USE_ITEM: 'interact-right',
  USE_SKILL_BUFF: 'interact-right',
  USE_SKILL_PROJECTILE: 'attack-kick-right',
  PICK_UP: 'pick-up',
};

export const GameState = {
  OPENING: 'opening',
  TITLE: 'title',
  PLAYING: 'playing',
  PAUSED: 'paused',
  ENDING: 'ending',
};

export const MovementState = {
  WALK: 'walk',
  DASH: 'dash',
};

export const ItemTypes = {
  POTION: 'potion',
};

// BGM Level constants array for easier management
export const LevelBGM = [
  AssetNames.BGM_LEVEL_01_01,
  AssetNames.BGM_LEVEL_01_02,
  AssetNames.BGM_LEVEL_02_01,
  AssetNames.BGM_LEVEL_02_02,
  AssetNames.BGM_LEVEL_03_01,
  AssetNames.BGM_LEVEL_03_02,
  AssetNames.BGM_LEVEL_04_01,
  AssetNames.BGM_LEVEL_04_02,
  AssetNames.BGM_LEVEL_05_01,
  AssetNames.BGM_LEVEL_05_02,
];

// Stage System Constants
export const StageIds = {
  TUTORIAL_PLAINS: 'tutorial-plains',
  CURSED_FOREST: 'cursed-forest',
  ANCIENT_RUINS: 'ancient-ruins',
  SNOWY_MOUNTAIN: 'snowy-mountain',
  ABYSS_CAVE: 'abyss-cave',
};

export const StageTypes = {
  PLAINS: 'plains',
  FOREST: 'forest',
  RUINS: 'ruins',
  MOUNTAIN: 'mountain',
  CAVE: 'cave',
};

export const StageClearConditions = {
  KILL_ALL_ENEMIES: 'kill-all-enemies',
  DEFEAT_BOSS: 'defeat-boss',
  COLLECT_ITEM: 'collect-item',
  REACH_EXIT: 'reach-exit',
};

export const StageEnvironment = {
  LIGHTING: {
    BRIGHT: { intensity: 1.0, color: 0xffffff },
    DIM: { intensity: 0.6, color: 0xcccccc },
    DARK: { intensity: 0.3, color: 0x888888 },
    COLD: { intensity: 0.8, color: 0x8ccfff },
    WARM: { intensity: 0.9, color: 0xffd08c },
  },
  FOG: {
    NONE: { density: 0.0 },
    LIGHT: { density: 0.001, color: 0xffffff },
    MEDIUM: { density: 0.003, color: 0xcccccc },
    HEAVY: { density: 0.007, color: 0x888888 },
  },
  WEATHER: {
    CLEAR: 'clear',
    FOGGY: 'foggy',
    SNOWY: 'snowy',
    STORMY: 'stormy',
  },
};
