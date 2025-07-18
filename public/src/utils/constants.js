// src/utils/constants.js

export const GAME_SPEED = 1.0;
export const GRAVITY = 9.8;

export const Player = {
    JUMP_POWER: 5,
    DASH_SPEED_MULTIPLIER: 2.0,
    ROLL_DURATION: 500, // ms
    RESPAWN_DELAY: 3000, // ms
    LEVEL_UP_EXP_MULTIPLIER: 1.5,
    STATUS_POINTS_PER_LEVEL: 5,
    ATTACK_BUFF_MULTIPLIER: 1.5,
    DEFENSE_BUFF_MULTIPLIER: 0.7,
    STAMINA_COST_JUMP: 10,
    STAMINA_COST_ROLL: 20,
    STAMINA_COST_GUARD: 15,
};

export const WeaponSword = {
    ATTACK_RANGE: 1.5,
    ATTACK_SPEED: 300, // ms
    STAMINA_COST_WEAK_ATTACK: 10,
    DAMAGE_WEAK_ATTACK: 10,
    DAMAGE_STRONG_ATTACK_MAX: 50,
    RANGE_STRONG_ATTACK: 2,
};

export const WeaponClaws = {
    ATTACK_RANGE: 1.2,
    ATTACK_SPEED: 200, // ms
    STAMINA_COST_WEAK_ATTACK: 7,
    DAMAGE_WEAK_ATTACK: 8,
    DAMAGE_STRONG_ATTACK_MAX: 40,
    RANGE_STRONG_ATTACK: 1.8,
};

export const Enemy = {
    ATTACK_COOLDOWN: 2, // seconds
    ATTACK_RANGE: 1.5,
    DAMAGE: 10,
    SPEED: 2,
};

export const Boss = {
    ATTACK_COOLDOWN: 3, // seconds
    NORMAL_ATTACK_RANGE: 3,
    NORMAL_ATTACK_DAMAGE: 20,
    SPECIAL_ATTACK_RANGE: 5,
    SPECIAL_ATTACK_DAMAGE: 40,
    SPEED: 1.5,
    INITIAL_POSITION: new THREE.Vector3(10, 0.5, 10),
};

export const Projectile = {
    SPEED: 10,
    LIFESPAN: 2, // seconds
    DAMAGE: 30,
};

export const Npc = {
    INTERACTION_RANGE: 2,
};

export const Item = {
    PICKUP_RANGE: 0.5,
    POTION_HEAL_AMOUNT: 20,
};

export const Skill = {
    FP_COST: 20,
    DURATION: 1000, // ms
    FP_COST_BUFF: 30,
    DURATION_BUFF: 10000, // ms
};
