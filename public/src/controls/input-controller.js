import * as THREE from 'three';
import { Projectile } from '../world/projectile.js';

export class InputController {
    constructor(player, camera, game) {
        this.player = player;
        this.camera = camera;
        this.game = game;
        this.keys = {};
        this.mouse = { x: 0, y: 0 };
        this.isCharging = false;
        this.chargeStartTime = 0;

        this.setupEventListeners();
    }

    _getWeaponParams() {
        const weaponName = this.player.weapons[this.player.currentWeaponIndex];
        const weaponData = this.game.data.weapons[weaponName];
        if (weaponData) {
            return {
                attackRange: weaponData.ATTACK_RANGE,
                attackSpeed: weaponData.ATTACK_SPEED,
                staminaCost: weaponData.STAMINA_COST_WEAK_ATTACK,
                damage: weaponData.DAMAGE_WEAK_ATTACK,
                maxStrongDamage: weaponData.DAMAGE_STRONG_ATTACK_MAX,
                strongAttackRange: weaponData.RANGE_STRONG_ATTACK,
            };
        }
        // Return a default object if data not found
        return {
            attackRange: 1,
            attackSpeed: 500,
            staminaCost: 10,
            damage: 5,
            maxStrongDamage: 20,
            strongAttackRange: 1.5,
        };
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => this.keys[e.code] = true);
        document.addEventListener('keyup', (e) => this.keys[e.code] = false);
        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement) {
                this.mouse.x = e.movementX || 0;
                this.mouse.y = e.movementY || 0;
            }
        });
        document.body.addEventListener('click', () => {
            document.body.requestPointerLock();
        });

        document.addEventListener('mousedown', (e) => {
            const params = this._getWeaponParams();

            if (e.button === 0 && !this.player.isAttacking && this.player.stamina >= params.staminaCost) { // Left click
                this.player.isAttacking = true;
                this.player.stamina -= params.staminaCost;
                this.player.showAttackEffect();
                this.game.playSound('attack');

                // Attack Hit Detection
                this.game.enemies.forEach(enemy => {
                    const distance = this.player.mesh.position.distanceTo(enemy.mesh.position);
                    if (distance < params.attackRange) {
                        enemy.hp -= params.damage;
                    }
                });

                setTimeout(() => {
                    this.player.isAttacking = false;
                }, params.attackSpeed);
            } else if (e.button === 2 && !this.player.isAttacking) { // Right click
                this.isCharging = true;
                this.chargeStartTime = Date.now();
                this.player.startChargingEffect();
            }
        });

        document.addEventListener('mouseup', (e) => {
            if (e.button === 2 && this.isCharging) {
                const params = this._getWeaponParams();

                this.isCharging = false;
                this.player.stopChargingEffect();
                const chargeTime = Date.now() - this.chargeStartTime;
                const damage = Math.min(10 + chargeTime / 100, params.maxStrongDamage);
                const staminaCost = Math.floor(damage / 2);

                if (this.player.stamina >= staminaCost) {
                    this.player.stamina -= staminaCost;
                    // Strong Attack Hit Detection
                    this.game.enemies.forEach(enemy => {
                        const distance = this.player.mesh.position.distanceTo(enemy.mesh.position);
                        let finalDamage = damage;
                        if (this.player.isAttackBuffed) {
                            finalDamage *= this.game.data.player.ATTACK_BUFF_MULTIPLIER;
                        }
                        if (distance < params.strongAttackRange) {
                            enemy.hp -= finalDamage;
                        }
                    });
                } else {
                }
            }
        });
    }

    update() {
        if (this.player.isDead) return;

        let speed = 0.1;
        const rotationSpeed = 0.05;

        // Dash
        this.player.isDashing = this.keys['ShiftLeft'] && this.player.stamina > 0;
        if (this.player.isDashing) {
            speed *= this.game.data.player.DASH_SPEED_MULTIPLIER;
        }

        // Player movement
        if (!this.player.isRolling && !this.player.isGuarding) {
            if (this.keys['KeyW']) {
                this.player.mesh.translateZ(-speed);
            }
            if (this.keys['KeyS']) {
                this.player.mesh.translateZ(speed);
            }
            if (this.keys['KeyA']) {
                this.player.mesh.translateX(-speed);
            }
            if (this.keys['KeyD']) {
                this.player.mesh.translateX(speed);
            }
        }

        // Guard
        this.player.isGuarding = this.keys['KeyG'] && this.player.stamina > 0;

        // Lock-on
        if (this.keys['Tab']) {
            if (!this.player.isLockedOn) {
                let closestEnemy = null;
                let minDistance = Infinity;
                this.game.enemies.forEach(enemy => {
                    const distance = this.player.mesh.position.distanceTo(enemy.mesh.position);
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestEnemy = enemy;
                    }
                });
                if (closestEnemy) {
                    this.player.isLockedOn = true;
                    this.player.lockedOnTarget = closestEnemy;
                }
            } else {
                this.player.isLockedOn = false;
                this.player.lockedOnTarget = null;
            }
            this.keys['Tab'] = false; // Prevent continuous toggling
        }

        // Use Item
        if (this.keys['Digit1']) {
            this.player.useItem(0);
            this.keys['Digit1'] = false; // Prevent continuous use
        }

        // Switch Weapon
        if (this.keys['Digit2']) {
            this.player.currentWeaponIndex = (this.player.currentWeaponIndex + 1) % this.player.weapons.length;
            console.log(`Switched to ${this.player.weapons[this.player.currentWeaponIndex]}`);
            this.keys['Digit2'] = false; // Prevent continuous switching
        }

        // Use Skill (Projectile)
        if (this.keys['Digit3']) {
            const skillData = this.game.data.skills.shockwave;
            if (!this.player.isUsingSkill && this.player.fp >= skillData.FP_COST) {
                this.player.isUsingSkill = true;
                this.player.fp -= skillData.FP_COST;
                this.player.showSkillEffect();
                console.log('Used Skill: Shockwave!');

                const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(this.player.mesh.quaternion);
                const projectile = new Projectile(this.player.mesh.position.clone().add(new THREE.Vector3(0, 0.5, 0)), direction, this.game);
                this.game.projectiles.push(projectile);
                this.game.sceneManager.add(projectile.mesh);

                setTimeout(() => {
                    this.player.isUsingSkill = false;
                }, skillData.DURATION);
            }
            this.keys['Digit3'] = false;
        }

        // Use Skill (Buff)
        if (this.keys['Digit4']) {
            const buffData = this.game.data.skills.buff;
            if (!this.player.isUsingSkill && this.player.fp >= buffData.FP_COST) {
                this.player.isUsingSkill = true;
                this.player.fp -= buffData.FP_COST;
                console.log('Used Skill: Buff!');

                this.player.applyAttackBuff();
                this.player.applyDefenseBuff();

                setTimeout(() => {
                    this.player.removeAttackBuff();
                    this.player.removeDefenseBuff();
                    this.player.isUsingSkill = false;
                }, buffData.DURATION);
            }
            this.keys['Digit4'] = false;
        }

        // Interact with NPC
        if (this.keys['KeyE']) {
            this.game.npcs.forEach(npc => {
                const distance = this.player.mesh.position.distanceTo(npc.mesh.position);
                if (distance < this.game.data.enemies.npc.INTERACTION_RANGE) {
                    npc.interact();
                }
            });
            this.keys['KeyE'] = false;
        }

        // Pause
        if (this.keys['Escape']) {
            this.game.togglePause();
            this.keys['Escape'] = false;
        }

        // Jump
        if (this.keys['Space'] && this.player.onGround && this.player.stamina >= this.game.data.player.STAMINA_COST_JUMP) {
            this.player.velocity.y = this.game.data.player.JUMP_POWER; // ジャンプ力
            this.player.stamina -= this.game.data.player.STAMINA_COST_JUMP;
            this.player.onGround = false;
        }

        // Rolling
        if (this.keys['ControlLeft'] && !this.player.isRolling && this.player.stamina >= this.game.data.player.STAMINA_COST_ROLL) {
            this.player.isRolling = true;
            this.player.stamina -= this.game.data.player.STAMINA_COST_ROLL;
            // TODO: Add rolling animation and movement. The player should move forward quickly for a short duration.
            setTimeout(() => {
                this.player.isRolling = false;
            }, this.game.data.player.ROLL_DURATION); // 0.5 seconds for rolling
        }

        // Player rotation based on mouse
        if (!this.player.isLockedOn) {
            this.player.mesh.rotation.y -= this.mouse.x * rotationSpeed;
        }

        // Reset mouse delta
        this.mouse.x = 0;
    }
}