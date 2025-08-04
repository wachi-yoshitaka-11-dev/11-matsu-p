import * as THREE from 'three';
import { AnimationNames, AssetNames, GameState } from '../utils/constants.js';

export class InputController {
  constructor(player, camera, game, canvas) {
    this.player = player;
    this.camera = camera;
    this.game = game;
    this.canvas = canvas;
    this.keys = {};
    this.mouse = { x: 0, y: 0, wheelDelta: 0 };

    this.cameraYaw = 0;
    this.cameraPitch = 0;
    this.cameraSensitivity = 0.002;

    this.shiftPressTime = 0;
    this.isShiftPressed = false;
    this.shortPressThreshold = 250; // milliseconds for short press
    this.movementKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD'];

    this.setupEventListeners();
  }

  _getWeaponParams() {
    const weaponName = this.player.weapons[this.player.currentWeaponIndex];
    const weaponData = this.game.data.weapons[weaponName];
    if (weaponData) {
      return {
        attackRange: weaponData.attackRange,
        attackSpeed: weaponData.attackSpeed,
        staminaCost: weaponData.staminaCostAttackWeak,
        staminaCostStrong:
          weaponData.staminaCostAttackStrong ||
          weaponData.staminaCostAttackWeak * 2,
        damage: weaponData.damageAttackWeak,
        damageStrong:
          weaponData.damageAttackStrongMax || weaponData.damageAttackWeak * 2,
        attackRangeStrong:
          weaponData.attackRangeStrong || weaponData.attackRange * 1.2,
      };
    }
    return {
      attackRange: 1,
      attackSpeed: 500,
      staminaCost: 10,
      staminaCostStrong: 20,
      damage: 5,
      damageStrong: 15,
      attackRangeStrong: 1.5,
    };
  }

  _canProcessInput() {
    return this.game.gameState === GameState.PLAYING && !this.player.isDead;
  }

  setupEventListeners() {
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Escape') {
        if (this.game.gameState === GameState.PLAYING) {
          this.game.togglePause();
          this.game.setPauseMenuVisibility(true);
        } else if (this.game.gameState === GameState.PAUSED) {
          this.game.togglePause();
          this.game.setPauseMenuVisibility(false);
          this.reevaluateKeyStates();
        }
        this.keys[e.code] = false;
        return;
      }
      if (!this._canProcessInput()) return;

      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        if (!this.isShiftPressed) {
          this.isShiftPressed = true;
          this.shiftPressTime = Date.now();
        }
      }

      this.keys[e.code] = true;
    });
    document.addEventListener('keyup', (e) => {
      if (!this._canProcessInput()) return;

      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        if (this.isShiftPressed) {
          const pressDuration = Date.now() - this.shiftPressTime;
          this.handleShiftRelease(pressDuration);
          this.isShiftPressed = false;
        }
      }

      this.keys[e.code] = false;
    });

    document.addEventListener('mousemove', (e) => {
      if (!this._canProcessInput()) return;
      if (document.pointerLockElement) {
        this.cameraYaw -= e.movementX * this.cameraSensitivity;
        this.cameraPitch -= e.movementY * this.cameraSensitivity;

        this.cameraPitch = Math.max(
          -Math.PI / 4,
          Math.min(Math.PI / 8, this.cameraPitch)
        );
      }
    });

    document.addEventListener(
      'wheel',
      (e) => {
        if (!this._canProcessInput()) return;
        this.mouse.wheelDelta = e.deltaY;
      },
      { passive: false }
    );

    this.canvas.addEventListener('click', () => {
      if (typeof window.playwright === 'undefined') {
        this.canvas.requestPointerLock();
      }
      if (!this._canProcessInput()) return;
    });

    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    this.canvas.addEventListener('auxclick', (e) => {
      e.preventDefault();
    });

    document.addEventListener('mousedown', (e) => {
      if (!this._canProcessInput()) return;
      const params = this._getWeaponParams();

      if (e.button === 0 && !this.player.isAttacking) {
        const isStrongAttack =
          this.keys['ControlLeft'] || this.keys['ControlRight'];
        const staminaCost = isStrongAttack
          ? params.staminaCostStrong
          : params.staminaCost;

        if (this.player.stamina >= staminaCost) {
          this.player.isAttacking = true;
          this.player.stamina -= staminaCost;

          if (isStrongAttack) {
            this.player.isAttackingStrong = true;
            this.player.isAttackingWeak = false;
            this.player.showAttackEffect();
            this.player.playAnimation(AnimationNames.ATTACK_STRONG);
            this.game.playSound(AssetNames.SFX_ATTACK_STRONG);
            this.performAttack(params.damageStrong, params.attackRangeStrong);
          } else {
            this.player.isAttackingWeak = true;
            this.player.isAttackingStrong = false;
            this.player.showAttackEffect();
            this.player.playAnimation(AnimationNames.ATTACK_WEAK);
            this.game.playSound(AssetNames.SFX_ATTACK_WEAK);
            this.performAttack(params.damage, params.attackRange);
          }
        }
      } else if (e.button === 1) {
        e.preventDefault();
        this.handleLockOnToggle();
      } else if (e.button === 2) {
        e.preventDefault();
        if (!this.player.isGuarding && this.player.stamina > 0) {
          this.player.isGuarding = true;
        }
      }
    });

    document.addEventListener('mouseup', (e) => {
      if (!this._canProcessInput()) return;

      if (e.button === 2) {
        this.player.isGuarding = false;
      }
    });
  }

  update(deltaTime) {
    if (!this._canProcessInput()) {
      if (this.player.isDead) {
        this.player.physics.velocity.x = 0;
        this.player.physics.velocity.z = 0;
      }
      return;
    }

    if (!this.player.isRolling && !this.player.isBackStepping) {
      const isShiftHeld = this.keys['ShiftLeft'] || this.keys['ShiftRight'];
      const isMoving = this.movementKeys.some((key) => this.keys[key]);

      this.player.isDashing =
        isShiftHeld &&
        isMoving &&
        this.player.stamina > 0 &&
        !this.player.isRolling &&
        !this.player.isBackStepping &&
        !this.player.isJumping;
      if (this.player.isDashing) {
        this.player.stamina -=
          this.game.data.player.staminaCostDash * deltaTime;
      }

      const speed = 5.0;
      const moveDirection = new THREE.Vector3();
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(
        this.camera.quaternion
      );
      forward.y = 0;
      forward.normalize();

      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(
        this.camera.quaternion
      );
      right.y = 0;
      right.normalize();

      if (this.keys['KeyW']) moveDirection.add(forward);
      if (this.keys['KeyS']) moveDirection.sub(forward);
      if (this.keys['KeyA']) moveDirection.sub(right);
      if (this.keys['KeyD']) moveDirection.add(right);

      if (moveDirection.lengthSq() > 0.001) {
        moveDirection.normalize();
        const currentSpeed = this.player.isDashing
          ? speed * this.game.data.player.dashSpeedMultiplier
          : speed;
        this.player.physics.velocity.x = moveDirection.x * currentSpeed;
        this.player.physics.velocity.z = moveDirection.z * currentSpeed;

        const targetAngle = Math.atan2(moveDirection.x, moveDirection.z);
        const targetQuaternion = new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 1, 0),
          targetAngle
        );
        this.player.mesh.quaternion.slerp(targetQuaternion, 0.2);
      } else if (!this.player.isBackStepping) {
        this.player.physics.velocity.x = 0;
        this.player.physics.velocity.z = 0;
      }
    }

    this.player.isGuarding = this.keys['KeyG'] && this.player.stamina > 0;
    if (this.player.isGuarding) {
      this.player.stamina -=
        (this.game.data.player.staminaCostGuardPerSecond || 10) * deltaTime;
    }

    if (this.keys['KeyQ'] && this.player.lockedTarget) {
      this.switchLockOnTarget();
      this.keys['KeyQ'] = false;
    }

    if (this.player.lockedTarget && !this.player.lockedTarget.isDead) {
      const targetPosition = this.player.lockedTarget.mesh.position;
      const playerPosition = this.player.mesh.position;

      const midPoint = new THREE.Vector3()
        .addVectors(playerPosition, targetPosition)
        .multiplyScalar(0.5);
      const cameraOffset = new THREE.Vector3(0, 2, 5);
      cameraOffset.applyQuaternion(this.player.mesh.quaternion);
      this.camera.position.copy(this.player.mesh.position).add(cameraOffset);
      this.camera.lookAt(midPoint);
    } else {
      const cameraQuaternion = new THREE.Quaternion();
      cameraQuaternion.setFromEuler(
        new THREE.Euler(this.cameraPitch, this.cameraYaw, 0, 'YXZ')
      );
      this.camera.quaternion.copy(cameraQuaternion);

      const cameraOffset = new THREE.Vector3(0, 2, 5);
      cameraOffset.applyQuaternion(this.camera.quaternion);
      this.camera.position.copy(this.player.mesh.position).add(cameraOffset);
    }

    if (this.keys['Digit1']) {
      this.player.useItem(0);
      this.keys['Digit1'] = false;
    }

    if (this.keys['KeyE']) {
      this.game.npcs.forEach((npc) => {
        if (
          this.player.mesh.position.distanceTo(npc.mesh.position) <
          npc.data.interactionRange
        ) {
          npc.interact();
          this.player.playAnimation(AnimationNames.TALK);
        }
      });
      this.keys['KeyE'] = false;
    }

    if (this.keys['Space'] && !this.player.isJumping) {
      this.handleJump();
      this.keys['Space'] = false;
    }

    if (this.keys['ArrowRight']) {
      this.player.switchWeapon();
      this.keys['ArrowRight'] = false;
    }

    if (this.keys['ArrowLeft']) {
      this.player.switchShield();
      this.keys['ArrowLeft'] = false;
    }

    if (this.keys['ArrowDown']) {
      this.player.switchItem();
      this.keys['ArrowDown'] = false;
    }

    if (this.keys['ArrowUp']) {
      this.player.switchSkill();
      this.keys['ArrowUp'] = false;
    }

    if (this.keys['KeyR']) {
      this.player.useCurrentItem();
      this.keys['KeyR'] = false;
    }

    if (this.keys['KeyF']) {
      this.player.useCurrentSkill();
      this.keys['KeyF'] = false;
    }
  }

  handleJump() {
    if (
      this.player.onGround &&
      this.player.stamina >= this.game.data.player.staminaCostJump
    ) {
      this.player.isJumping = true;
      this.player.physics.velocity.y = this.game.data.player.jumpPower;
      this.player.stamina -= this.game.data.player.staminaCostJump;
      this.player.playAnimation(AnimationNames.JUMP);
      this.game.playSound(AssetNames.SFX_JUMP);

      setTimeout(() => {
        this.player.isJumping = false;
      }, this.game.data.player.jumpDuration || 1000);
    }
  }

  handleShiftRelease(pressDuration) {
    const isMoving = this.movementKeys.some((key) => this.keys[key]);
    const isShortPress = pressDuration < this.shortPressThreshold;

    if (isShortPress) {
      if (isMoving) {
        this.handleRolling();
      } else {
        this.handleBackStep();
      }
    }
  }

  handleRolling() {
    if (
      !this.player.isRolling &&
      this.player.stamina >= this.game.data.player.staminaCostRolling &&
      this.player.onGround
    ) {
      this.player.isRolling = true;
      this.player.stamina -= this.game.data.player.staminaCostRolling;
      this.player.playAnimation(AnimationNames.ROLLING);
      this.game.playSound(AssetNames.SFX_ROLLING);

      const direction = this.getMovementDirection();
      if (direction.length() > 0) {
        direction.normalize();
        const rollingSpeed = this.game.data.player.rollingSpeed || 8;
        this.player.physics.velocity.x = direction.x * rollingSpeed;
        this.player.physics.velocity.z = direction.z * rollingSpeed;
      }
    }
  }

  handleBackStep() {
    if (
      !this.player.isBackStepping &&
      this.player.stamina >= this.game.data.player.staminaCostBackStep &&
      this.player.onGround
    ) {
      this.player.isBackStepping = true;
      this.player.stamina -= this.game.data.player.staminaCostBackStep;
      this.player.playAnimation(AnimationNames.BACK_STEP);
      this.game.playSound(AssetNames.SFX_BACK_STEP);

      const playerForward = new THREE.Vector3(0, 0, 1);
      playerForward.applyQuaternion(this.player.mesh.quaternion);
      playerForward.y = 0;
      playerForward.normalize();

      // Move backward relative to player's facing direction (negate for backward)
      const direction = playerForward.clone().negate();

      const backStepSpeed = this.game.data.player.backStepSpeed || 6;
      this.player.physics.velocity.x = direction.x * backStepSpeed;
      this.player.physics.velocity.z = direction.z * backStepSpeed;

      // Set timer to stop backStep movement after a set duration
      setTimeout(() => {
        if (this.player.isBackStepping) {
          this.player.physics.velocity.x = 0;
          this.player.physics.velocity.z = 0;
        }
      }, this.game.data.player.rollDuration || 500); // Use same duration as rolling
    }
  }

  getMovementDirection() {
    const direction = new THREE.Vector3();

    if (this.keys['KeyW']) direction.z -= 1;
    if (this.keys['KeyS']) direction.z += 1;
    if (this.keys['KeyA']) direction.x -= 1;
    if (this.keys['KeyD']) direction.x += 1;

    // Apply camera rotation to movement direction
    if (direction.length() > 0) {
      direction.applyQuaternion(
        new THREE.Quaternion().setFromEuler(
          new THREE.Euler(0, this.cameraYaw, 0, 'YXZ')
        )
      );
    }

    return direction;
  }

  handleLockOnToggle() {
    if (this.player.lockedTarget) {
      // Release lock-on
      this.player.lockedTarget = null;
      if (this.game.lockOnUI) {
        this.game.lockOnUI.hideLockOnTarget();
      }
    } else {
      // Find nearest enemy to lock onto
      const nearestEnemy = this.findNearestEnemy();
      if (nearestEnemy) {
        this.player.lockedTarget = nearestEnemy;
        if (this.game.lockOnUI) {
          this.game.lockOnUI.showLockOnTarget(nearestEnemy);
        }
        this.game.playSound(AssetNames.SFX_LOCK_ON);
      }
    }
  }

  switchLockOnTarget() {
    if (!this.player.lockedTarget) return;

    const enemies = this.game.enemies.filter((enemy) => !enemy.isDead);
    if (enemies.length <= 1) return;

    const currentIndex = enemies.indexOf(this.player.lockedTarget);
    if (currentIndex === -1) return;

    const nextIndex = (currentIndex + 1) % enemies.length;
    const nextTarget = enemies[nextIndex];

    this.player.lockedTarget = nextTarget;
    if (this.game.lockOnUI) {
      this.game.lockOnUI.showLockOnTarget(nextTarget);
    }
    this.game.playSound(AssetNames.SFX_LOCK_ON);
  }

  findNearestEnemy() {
    let nearestEnemy = null;
    let nearestDistance = Infinity;
    const maxLockOnDistance = 15; // Maximum distance for lock-on

    for (const enemy of this.game.enemies) {
      if (enemy.isDead) continue;

      const distance = this.player.mesh.position.distanceTo(
        enemy.mesh.position
      );
      if (distance < nearestDistance && distance <= maxLockOnDistance) {
        nearestDistance = distance;
        nearestEnemy = enemy;
      }
    }

    return nearestEnemy;
  }

  performAttack(damage, range) {
    this.game.enemies.forEach((enemy) => {
      if (this.player.mesh.position.distanceTo(enemy.mesh.position) < range) {
        const finalDamage = damage * this.player.attackBuffMultiplier;

        // Check if enemy is guarding and reduce damage
        if (enemy.isGuarding && typeof enemy.getShieldDefense === 'function') {
          const shieldDefense = enemy.getShieldDefense();
          const reducedDamage = Math.max(1, finalDamage - shieldDefense);
          enemy.takeDamage(reducedDamage);
        } else {
          enemy.takeDamage(finalDamage);
        }
      }
    });
  }

  // Clear all key states (useful when pausing/unpausing)
  clearKeyStates() {
    this.keys = {};
  }

  // Re-evaluate current key states based on actual keyboard state
  reevaluateKeyStates() {
    // Create a temporary event listener to detect currently pressed keys
    const currentlyPressed = new Set();

    // Listen for keydown events briefly to capture currently pressed keys
    const keydownHandler = (e) => {
      currentlyPressed.add(e.code);
    };

    const keyupHandler = (e) => {
      currentlyPressed.delete(e.code);
    };

    // Add listeners temporarily
    document.addEventListener('keydown', keydownHandler);
    document.addEventListener('keyup', keyupHandler);

    // After a brief delay, update our key states to match actual pressed keys
    setTimeout(() => {
      // Remove temporary listeners
      document.removeEventListener('keydown', keydownHandler);
      document.removeEventListener('keyup', keyupHandler);

      // Update our key states to match currently pressed keys
      const allKeys = Object.keys(this.keys);
      for (const key of allKeys) {
        this.keys[key] = currentlyPressed.has(key);
      }

      // Also add any newly detected pressed keys
      for (const key of currentlyPressed) {
        this.keys[key] = true;
      }
    }, 16); // One frame delay at 60fps
  }
}
