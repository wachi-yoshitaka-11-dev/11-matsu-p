// Basic game constants

export const GameConstants = {
  GAME_SPEED: 1.0,
  GRAVITY: 9.8,
};

export const Fall = {
  FALL_DEATH_THRESHOLD: -100,
  MAX_FALL_DEPTH: -1000,
};

// Type definitions (equivalent to Enum)

export const GameState = {
  SPLASH_SCREEN: 'splashScreen',
  OPENING: 'opening',
  TITLE: 'title',
  LOADING: 'loading',
  PLAYING: 'playing',
  PAUSED: 'paused',
  ENDING: 'ending',
};

export const MovementState = {
  WALK: 'walk',
  DASH: 'dash',
};

export const SkillTypes = {
  BUFF: 'buff',
  PROJECTILE: 'projectile',
  AREA_ATTACK: 'areaAttack',
};

export const AttackTypes = {
  WEAK: 'weak',
  STRONG: 'strong',
};

export const EnemyTypes = {
  GRUNT: 'grunt',
  BOSS: 'boss',
};

export const EnvironmentTypes = {
  CLOUD: 'cloud',
  GROUND: 'ground',
};

export const StageBGMConditions = {
  DEFAULT: 'default',
  COMBAT: 'combat',
};

export const SequenceStep = {
  IDLE: 'idle',
  TEXT_COMPLETE: 'textComplete',
  SHOWING_TEXT: 'showingText',
  FADING_OUT: 'fadingOut',
  SHOWING_STAFF_ROLL: 'showingStaffRoll',
  SHOWING_FIN: 'showingFin',
};

// Asset path definitions

export const AssetPaths = {
  LOGO_IMAGE: 'sequences/logo.png',
  LOGO_VIDEO: 'sequences/logo.mp4',

  BGM_TITLE: 'sequences/bgm-title.mp3',
  BGM_OPENING: 'sequences/bgm-opening.mp3',
  BGM_ENDING: 'sequences/bgm-ending.mp3',

  SFX_ATTACK_STRONG: 'sfx/attack-strong.mp3',
  SFX_ATTACK_WEAK: 'sfx/attack-weak.mp3',
  SFX_CLICK: 'sfx/click.mp3',
  SFX_DAMAGE: 'sfx/damage.mp3',
  SFX_DEATH: 'sfx/death.mp3',
  SFX_GUARD: 'sfx/guard.mp3',
  SFX_JUMP: 'sfx/jump.mp3',
  SFX_KILL: 'sfx/kill.mp3',
  SFX_LEVEL_UP: 'sfx/level-up.mp3',
  SFX_LOCK_ON: 'sfx/lock-on.mp3',
  SFX_PAUSE: 'sfx/pause.mp3',
  SFX_UNPAUSE: 'sfx/unpause.mp3',
  SFX_ROLLING: 'sfx/rolling.mp3',
  SFX_BACK_STEP: 'sfx/back-step.mp3',
  SFX_DASH: 'sfx/dash.mp3',
  SFX_START: 'sfx/start.mp3',
  SFX_SWITCH_WEAPON: 'sfx/switch-weapon.mp3',
  SFX_SWITCH_SHIELD: 'sfx/switch-shield.mp3',
  SFX_SWITCH_ITEM: 'sfx/switch-item.mp3',
  SFX_SWITCH_SKILL: 'sfx/switch-skill.mp3',
  SFX_TALK: 'sfx/talk.mp3',
  SFX_USE_ITEM: 'sfx/use-item.mp3',
  SFX_PICKUP_ITEM: 'sfx/pickup-item.mp3',
  SFX_USE_SKILL_BUFF: 'sfx/use-skill-buff.mp3',
  SFX_USE_SKILL_PROJECTILE: 'sfx/use-skill-projectile.mp3',
  SFX_USE_SKILL_AREA_ATTACK: 'sfx/use-skill-area-attack.mp3',
  SFX_FP_INSUFFICIENT: 'sfx/fp-insufficient.mp3',
  SFX_WALK: 'sfx/walk.mp3',
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
  USE_SKILL_BUFF: 'holding-left',
  USE_SKILL_PROJECTILE: 'holding-right',
  USE_SKILL_AREA_ATTACK: 'holding-both',
  PICK_UP: 'pick-up',
};

// Feature-specific constants

export const EffectColors = {
  DAMAGE: 0xff0000,
  ATTACK: 0xffff00,
  SKILL_BUFF: 0x00ffff,
  SKILL_PROJECTILE: 0x8a2be2,
  SKILL_AREA_ATTACK: 0xff4500,
  CHARGE: 0xff00ff,
};

export const SkillShape = {
  BOX: 'box',
  CAPSULE: 'capsule',
  CONE: 'cone',
  CYLINDER: 'cylinder',
  DODECAHEDRON: 'dodecahedron',
  ICOSAHEDRON: 'icosahedron',
  OCTAHEDRON: 'octahedron',
  PLANE: 'plane',
  RING: 'ring',
  SPHERE: 'sphere',
  TETRAHEDRON: 'tetrahedron',
  TORUS: 'torus',
  TORUS_KNOT: 'torusKnot',
};

export const AudioConstants = {
  FOOTSTEP_MAX_AUDIBLE_DISTANCE: 20, // Sound is not audible beyond this distance
  FOOTSTEP_MIN_VOLUME: 0.05, // Minimum volume
  FOOTSTEP_MAX_VOLUME: 0.3, // Maximum volume (close range)
  PLAYER_FOOTSTEP_VOLUME: 0.3,
};

export const ItemConstants = {
  PICKUP_RANGE: 2.0,
};

// Helper constants and utilities

export const HTMLTags = {
  BR: '<br>',
};
