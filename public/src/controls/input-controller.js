import * as THREE from 'three';
import { Projectile } from '../world/projectile.js';
import { AnimationNames, AssetNames } from '../utils/constants.js';

export class InputController {
    constructor(player, camera, game, canvas) {
        this.player = player;
        this.camera = camera;
        this.game = game;
        this.canvas = canvas;
        this.keys = {};
        this.mouse = { x: 0, y: 0, wheelDelta: 0 };
        this.isCharging = false;
        this.chargeStartTime = 0;

        this.cameraYaw = 0;
        this.cameraPitch = 0;
        this.cameraSensitivity = 0.002;

        this.setupEventListeners();
    }

    _getWeaponParams() {
        const weaponName = this.player.weapons[this.player.currentWeaponIndex];
        const weaponData = this.game.data.weapons[weaponName];
        if (weaponData) {
            return {
                attackRange: weaponData.attackRange,
                attackSpeed: weaponData.attackSpeed,
                staminaCost: weaponData.staminaCostWeakAttack,
                damage: weaponData.damageWeakAttack,
                maxStrongDamage: weaponData.damageStrongAttackMax,
                strongAttackRange: weaponData.rangeStrongAttack,
            };
        }
        return { attackRange: 1, attackSpeed: 500, staminaCost: 10, damage: 5, maxStrongDamage: 20, strongAttackRange: 1.5 };
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Escape') {
                this.game.togglePause();
                this.keys[e.code] = false;
                return;
            }
            if (this.game.gameState !== 'playing') return;
            this.keys[e.code] = true;
        });
        document.addEventListener('keyup', (e) => {
            if (this.game.gameState !== 'playing') return;
            this.keys[e.code] = false;
        });

        document.addEventListener('mousemove', (e) => {
            if (this.game.gameState !== 'playing') return;
            if (document.pointerLockElement) {
                this.cameraYaw -= e.movementX * this.cameraSensitivity;
                this.cameraPitch -= e.movementY * this.cameraSensitivity;

                this.cameraPitch = Math.max(-Math.PI / 4, Math.min(Math.PI / 8, this.cameraPitch));
            }
        });

        document.addEventListener('wheel', (e) => {
            if (this.game.gameState !== 'playing') return;
            this.mouse.wheelDelta = e.deltaY;
        }, { passive: false });

        this.canvas.addEventListener('click', () => {
            if (typeof window.playwright === 'undefined') {
                this.canvas.requestPointerLock();
            }
            if (this.game.gameState !== 'playing') return;
        });

        document.addEventListener('mousedown', (e) => {
            if (this.game.gameState !== 'playing') return;
            const params = this._getWeaponParams();
            if (e.button === 0 && !this.player.isAttacking && this.player.stamina >= params.staminaCost) {
                this.player.isAttacking = true;
                this.player.isWeakAttacking = true;
                this.player.stamina -= params.staminaCost;
                this.player.showAttackEffect();
                this.player.playAnimation(AnimationNames.WEAK_ATTACK);
                this.game.playSound(AssetNames.SFX_WEAK_ATTACK);
                this.game.enemies.forEach(enemy => {
                    if (this.player.mesh.position.distanceTo(enemy.mesh.position) < params.attackRange) {
                        enemy.takeDamage(params.damage);
                    }
                });
            } else if (e.button === 2 && !this.player.isAttacking) {
                this.isCharging = true;
                this.chargeStartTime = Date.now();
                this.player.startChargingEffect();
            }
        });

        document.addEventListener('mouseup', (e) => {
            if (this.game.gameState !== 'playing') return;
            if (e.button === 2 && this.isCharging) {
                const params = this._getWeaponParams();
                this.isCharging = false;
                this.player.stopChargingEffect();
                const chargeTime = Date.now() - this.chargeStartTime;
                const damage = Math.min(10 + chargeTime / 100, params.maxStrongDamage);
                const staminaCost = Math.floor(damage / 2);
                if (this.player.stamina >= staminaCost) {
                    this.player.stamina -= staminaCost;
                    this.player.isStrongAttacking = true;
                    this.player.playAnimation(AnimationNames.STRONG_ATTACK);
                    this.game.playSound(AssetNames.SFX_STRONG_ATTACK);
                    this.game.enemies.forEach(enemy => {
                        let finalDamage = this.player.isAttackBuffed ? damage * this.player.attackBuffMultiplier : damage;
                        if (this.player.mesh.position.distanceTo(enemy.mesh.position) < params.strongAttackRange) {
                            enemy.takeDamage(finalDamage);
                        }
                    });
                }
            }
        });
    }

    update(deltaTime) {
        if (this.game.gameState !== 'playing') return;

        if (this.player.isDead) {
            this.player.physics.velocity.x = 0;
            this.player.physics.velocity.z = 0;
            return;
        }

        const isTryingToRoll = this.keys['ControlLeft'];
        const canRoll = !this.player.isRolling && this.player.stamina >= this.game.data.player.staminaCostRoll;

        if (isTryingToRoll && canRoll) {
            this.player.isRolling = true;
            this.player.stamina -= this.game.data.player.staminaCostRoll;
            this.player.playAnimation(AnimationNames.ROLLING);
            this.game.playSound('rolling');

            const rollDirection = new THREE.Vector3(0, 0, 1).applyQuaternion(this.player.mesh.quaternion);
            const rollSpeed = this.game.data.player.rollDistance / (this.game.data.player.rollDuration / 1000);

            this.player.physics.velocity.x = rollDirection.x * rollSpeed;
            this.player.physics.velocity.z = rollDirection.z * rollSpeed;

            setTimeout(() => { this.player.isRolling = false; }, this.game.data.player.rollDuration);
        }

        if (!this.player.isRolling) {
            this.player.isDashing = this.keys['ShiftLeft'] && this.player.stamina > 0;
            if (this.player.isDashing) {
                this.player.stamina -= this.game.data.player.staminaCostDash * deltaTime;
            }

            const speed = 5.0;
            const moveDirection = new THREE.Vector3();
            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
            forward.y = 0;
            forward.normalize();

            const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
            right.y = 0;
            right.normalize();

            if (this.keys['KeyW']) moveDirection.add(forward);
            if (this.keys['KeyS']) moveDirection.sub(forward);
            if (this.keys['KeyA']) moveDirection.sub(right);
            if (this.keys['KeyD']) moveDirection.add(right);

            if (moveDirection.lengthSq() > 0.001) {
                moveDirection.normalize();
                const currentSpeed = this.player.isDashing ? speed * this.game.data.player.dashSpeedMultiplier : speed;
                this.player.physics.velocity.x = moveDirection.x * currentSpeed;
                this.player.physics.velocity.z = moveDirection.z * currentSpeed;

                const targetAngle = Math.atan2(moveDirection.x, moveDirection.z);
                const targetQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), targetAngle);
                this.player.mesh.quaternion.slerp(targetQuaternion, 0.2);
            } else {
                this.player.physics.velocity.x = 0;
                this.player.physics.velocity.z = 0;
            }
        } else {
            // If rolling, we let the rolling velocity take over and don't apply new input
        }

        this.player.isGuarding = this.keys['KeyG'] && this.player.stamina > 0;
        if (this.player.isGuarding) {
            this.player.stamina -= (this.game.data.player.staminaCostGuardPerSecond || 10) * deltaTime;
        }

        if (this.keys['Tab']) {
            if (!this.player.isLockedOn) {
                let closestEnemy = this.game.enemies.sort((a, b) => a.mesh.position.distanceTo(this.player.mesh.position) - b.mesh.position.distanceTo(this.player.mesh.position))[0];
                if (closestEnemy) {
                    this.player.isLockedOn = true;
                    this.player.lockedOnTarget = closestEnemy;
                    this.game.playSound(AssetNames.SFX_LOCK_ON);
                }
            } else {
                this.player.isLockedOn = false;
                this.player.lockedOnTarget = null;
            }
            this.keys['Tab'] = false;
        }

        if (this.player.isLockedOn && this.player.lockedOnTarget) {
            const targetPosition = this.player.lockedOnTarget.mesh.position;
            const playerPosition = this.player.mesh.position;

            const midPoint = new THREE.Vector3().addVectors(playerPosition, targetPosition).multiplyScalar(0.5);
            const cameraOffset = new THREE.Vector3(0, 2, 5);
            cameraOffset.applyQuaternion(this.player.mesh.quaternion);
            this.camera.position.copy(this.player.mesh.position).add(cameraOffset);
            this.camera.lookAt(midPoint);
        } else {
            const cameraQuaternion = new THREE.Quaternion();
            cameraQuaternion.setFromEuler(new THREE.Euler(this.cameraPitch, this.cameraYaw, 0, 'YXZ'));
            this.camera.quaternion.copy(cameraQuaternion);

            const cameraOffset = new THREE.Vector3(0, 2, 5);
            cameraOffset.applyQuaternion(this.camera.quaternion);
            this.camera.position.copy(this.player.mesh.position).add(cameraOffset);
        }


        if (this.keys['Digit1']) { this.player.useItem(0); this.keys['Digit1'] = false; }
        if (this.keys['Digit2']) {
            this.player.currentWeaponIndex = (this.player.currentWeaponIndex + 1) % this.player.weapons.length;
            this.game.playSound('switch-weapon');
            this.keys['Digit2'] = false;
        }

        if (this.keys['Digit3']) {
            const skillData = this.game.data.skills.projectile;
            if (!this.player.isUsingSkill && this.player.fp >= skillData.fpCost) {
                this.player.isUsingSkill = true;
                this.player.fp -= skillData.fpCost;
                this.player.showSkillProjectileEffect();
                this.player.playAnimation(AnimationNames.USE_SKILL_PROJECTILE);
                this.game.playSound('use-skill-projectile');
                const direction = new THREE.Vector3();
                this.player.mesh.getWorldDirection(direction);
                const projectile = new Projectile(this.player.mesh.position.clone().add(new THREE.Vector3(0, 0.5, 0)), direction, this.game);
                this.game.projectiles.push(projectile);
                this.game.sceneManager.add(projectile.mesh);
                setTimeout(() => { this.player.isUsingSkill = false; }, skillData.duration);
            }
            this.keys['Digit3'] = false;
        }

        if (this.keys['Digit4']) {
            const buffData = this.game.data.skills.buff;
            if (!this.player.isUsingSkill && this.player.fp >= buffData.fpCost) {
                this.player.isUsingSkill = true;
                this.player.fp -= buffData.fpCost;
                this.game.playSound('use-skill-buff');
                this.player.showSkillBuffEffect();
                this.player.playAnimation(AnimationNames.USE_SKILL_BUFF);
                this.player.applyAttackBuff();
                this.player.applyDefenseBuff();
                setTimeout(() => {
                    this.player.removeAttackBuff();
                    this.player.removeDefenseBuff();
                    this.player.isUsingSkill = false;
                }, buffData.duration);
            }
            this.keys['Digit4'] = false;
        }

        if (this.keys['KeyE']) {
            this.game.npcs.forEach(npc => {
                if (this.player.mesh.position.distanceTo(npc.mesh.position) < this.game.data.enemies.npc.interactionRange) {
                    npc.interact();
                    this.player.playAnimation(AnimationNames.TALK);
                    this.game.playSound('talk');
                }
            });
            this.keys['KeyE'] = false;
        }

        if (this.keys['Escape']) { this.game.togglePause(); this.keys['Escape'] = false; }

        if (this.keys['Space'] && this.player.onGround && this.player.stamina >= this.game.data.player.staminaCostJump) {
            this.player.physics.velocity.y = this.game.data.player.jumpPower;
            this.player.stamina -= this.game.data.player.staminaCostJump;
            this.game.playSound(AssetNames.SFX_JUMP);
        }
    }
}
