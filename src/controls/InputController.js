import { Projectile } from '../world/Projectile.js';

export class InputController {
    constructor(player, camera, game) {
        this.player = player;
        this.camera = camera;
        this.game = game;
        this.keys = {};
        this.mouse = { x: 0, y: 0 };
        this.isCharging = false;
        this.chargeStartTime = 0;

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
            const weapon = this.player.weapons[this.player.currentWeaponIndex];
            let attackRange = 1.5;
            let attackSpeed = 300;
            let staminaCost = 10;
            let damage = 10;

            if (weapon === 'claws') {
                attackRange = 1.2;
                attackSpeed = 200;
                staminaCost = 7;
                damage = 8;
            }

            if (e.button === 0 && !this.player.isAttacking && this.player.stamina >= staminaCost) { // Left click
                this.player.isAttacking = true;
                this.player.stamina -= staminaCost;
                console.log(`Weak Attack with ${weapon}!`);
                this.game.attackSound.play();

                // Attack Hit Detection
                this.game.enemies.forEach(enemy => {
                    const distance = this.player.mesh.position.distanceTo(enemy.mesh.position);
                    if (distance < attackRange) {
                        enemy.hp -= damage;
                        console.log(`Enemy HP: ${enemy.hp}`);
                    }
                });

                setTimeout(() => {
                    this.player.isAttacking = false;
                }, attackSpeed);
            } else if (e.button === 2 && !this.player.isAttacking) { // Right click
                this.isCharging = true;
                this.chargeStartTime = Date.now();
                console.log(`Charging strong attack with ${weapon}...`);
            }
        });

        document.addEventListener('mouseup', (e) => {
            if (e.button === 2 && this.isCharging) {
                const weapon = this.player.weapons[this.player.currentWeaponIndex];
                let maxDamage = 50;
                let range = 2;
                if (weapon === 'claws') {
                    maxDamage = 40;
                    range = 1.8;
                }

                this.isCharging = false;
                const chargeTime = Date.now() - this.chargeStartTime;
                const damage = Math.min(10 + chargeTime / 100, maxDamage);
                const staminaCost = Math.floor(damage / 2);

                if (this.player.stamina >= staminaCost) {
                    this.player.stamina -= staminaCost;
                    console.log(`Strong Attack with ${weapon}! Damage: ${damage}`);
                    // Strong Attack Hit Detection
                    this.game.enemies.forEach(enemy => {
                        const distance = this.player.mesh.position.distanceTo(enemy.mesh.position);
                        if (distance < range) {
                            enemy.hp -= damage;
                            console.log(`Enemy HP: ${enemy.hp}`);
                        }
                    });
                } else {
                    console.log('Not enough stamina for strong attack!');
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
            speed = 0.2;
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

        // Use Skill
        if (this.keys['Digit3']) {
            if (!this.player.isUsingSkill && this.player.fp >= 20) {
                this.player.isUsingSkill = true;
                this.player.fp -= 20;
                console.log('Used Skill: Shockwave!');

                const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(this.player.mesh.quaternion);
                const projectile = new Projectile(this.player.mesh.position.clone().add(new THREE.Vector3(0, 0.5, 0)), direction);
                this.game.projectiles.push(projectile);
                this.game.scene.add(projectile.mesh);

                setTimeout(() => {
                    this.player.isUsingSkill = false;
                }, 1000);
            }
            this.keys['Digit3'] = false;
        }

        // Interact with NPC
        if (this.keys['KeyE']) {
            this.game.npcs.forEach(npc => {
                const distance = this.player.mesh.position.distanceTo(npc.mesh.position);
                if (distance < 2) {
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
        if (this.keys['Space'] && this.player.onGround && this.player.stamina >= 10) {
            this.player.velocity.y = 5; // ジャンプ力
            this.player.stamina -= 10;
            this.player.onGround = false;
        }

        // Rolling
        if (this.keys['ControlLeft'] && !this.player.isRolling && this.player.stamina >= 20) {
            this.player.isRolling = true;
            this.player.stamina -= 20;
            // TODO: Add rolling animation and movement
            setTimeout(() => {
                this.player.isRolling = false;
            }, 500); // 0.5 seconds for rolling
        }

        // Player rotation based on mouse
        if (!this.player.isLockedOn) {
            this.player.mesh.rotation.y -= this.mouse.x * rotationSpeed;
        }

        // Reset mouse delta
        this.mouse.x = 0;
    }
}
