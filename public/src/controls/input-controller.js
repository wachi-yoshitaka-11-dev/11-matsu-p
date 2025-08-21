import * as THREE from 'three';
import { AnimationNames, AssetPaths, GameState } from '../utils/constants.js';

export class InputController {
  constructor(player, camera, game, canvas) {
    this.player = player;
    this.camera = camera;
    this.game = game;
    this.canvas = canvas;
    this.keys = {};
    this.mouse = { x: 0, y: 0, wheelDelta: 0 };
    this.lastWheelTime = 0;
    this.wheelCooldown = 150;

    this.cameraYaw = 0;
    this.cameraPitch = 0;
    this.cameraSensitivity = 0.002;

    this.shiftPressTime = 0;
    this.isShiftPressed = false;
    this.shortPressThreshold = 400; // milliseconds for short press
    this.movementKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD'];

    this.setupEventListeners();
  }

  _getWeaponParams() {
    const weaponId = this.player.weapons[this.player.currentWeaponIndex];
    const weaponData = this.game.data.weapons[weaponId];
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
      // Prevent browser default behavior for game-related key combinations (during gameplay only)
      const isGameTarget =
        document.pointerLockElement === this.canvas ||
        e.target === this.canvas ||
        this.game.gameState === GameState.PLAYING;
      const isFormField =
        e.target instanceof HTMLElement &&
        (e.target.tagName === 'INPUT' ||
          e.target.tagName === 'TEXTAREA' ||
          e.target.isContentEditable);
      if (
        isGameTarget &&
        !isFormField &&
        (e.ctrlKey || e.metaKey) &&
        ['KeyW', 'KeyD', 'KeyA', 'KeyS', 'KeyE', 'KeyR', 'KeyF'].includes(
          e.code
        )
      ) {
        e.preventDefault();
        e.stopPropagation();
      }

      if (e.code === 'Escape') {
        e.preventDefault();
        if (this.game.gameState === GameState.PLAYING) {
          this.game.togglePause();
          this.game.setPauseMenuVisibility(true);
        } else if (this.game.gameState === GameState.PAUSED) {
          if (this.game.pauseMenu && this.game.pauseMenu.hasActiveModal()) {
            this.game.pauseMenu.closeCurrentModal();
          } else {
            this.game.togglePause();
            this.game.setPauseMenuVisibility(false);
            this.reevaluateKeyStates();
          }
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

        // Lock-on target switching with mouse wheel
        const isGameWheelContext =
          document.pointerLockElement === this.canvas ||
          e.target === this.canvas;
        if (isGameWheelContext && this.player.lockedTarget && e.deltaY !== 0) {
          e.preventDefault();
          // deltaY > 0: Wheel down (downward) = next target
          // deltaY < 0: Wheel up (upward) = previous target
          const direction = e.deltaY > 0 ? 1 : -1;
          this.switchLockOnTarget(direction);
        }
      },
      { passive: false }
    );

    this.canvas.addEventListener('click', () => {
      if (!this._canProcessInput()) return;
      if (typeof window.playwright === 'undefined') {
        this.canvas.requestPointerLock?.();
      }
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
            this.game.playSFX(AssetPaths.SFX_ATTACK_STRONG);
            this.performAttack(params.damageStrong, params.attackRangeStrong);
          } else {
            this.player.isAttackingWeak = true;
            this.player.isAttackingStrong = false;
            this.player.showAttackEffect();
            this.player.playAnimation(AnimationNames.ATTACK_WEAK);
            this.game.playSFX(AssetPaths.SFX_ATTACK_WEAK);
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

    if (this.player.isGuarding) {
      this.player.stamina -=
        (this.game.data.player.staminaCostGuardPerSecond || 10) * deltaTime;
    }

    if (this.player.lockedTarget && !this.player.lockedTarget.isDead) {
      // Check lock-on range
      const targetDistance = this.player.mesh.position.distanceTo(
        this.player.lockedTarget.mesh.position
      );
      const maxLockOnDistance = 20; // Slightly expanded range

      if (targetDistance > maxLockOnDistance) {
        // Release lock-on when out of range
        this.player.lockedTarget = null;
        if (this.game.lockOnUI) {
          this.game.lockOnUI.hideLockOnTarget();
        }
        // Return to normal camera control
        const cameraQuaternion = new THREE.Quaternion();
        cameraQuaternion.setFromEuler(
          new THREE.Euler(this.cameraPitch, this.cameraYaw, 0, 'YXZ')
        );
        this.camera.quaternion.copy(cameraQuaternion);

        const cameraOffset = new THREE.Vector3(0, 2, 5);
        cameraOffset.applyQuaternion(this.camera.quaternion);
        this.camera.position.copy(this.player.mesh.position).add(cameraOffset);
        return;
      }

      const targetPosition = this.player.lockedTarget.mesh.position;
      const playerPosition = this.player.mesh.position;

      // Direction vector from player to target
      const directionToTarget = new THREE.Vector3()
        .subVectors(targetPosition, playerPosition)
        .normalize();

      // Basic camera offset
      const baseOffset = new THREE.Vector3(0, 2, 5);

      // Adjust to a slightly elevated viewing angle during lock-on
      const cameraOffset = new THREE.Vector3(
        directionToTarget.x * -3, // Slight offset opposite to target direction
        3, // Slightly raise height
        directionToTarget.z * -3
      ).add(baseOffset);

      this.camera.position.copy(playerPosition).add(cameraOffset);

      // Set camera to look at target (midpoint between player and target with slight upward offset)
      const lookAtPoint = new THREE.Vector3()
        .addVectors(playerPosition, targetPosition)
        .multiplyScalar(0.5)
        .add(new THREE.Vector3(0, 1, 0)); // Look slightly upward

      this.camera.lookAt(lookAtPoint);
    } else {
      // Normal camera control when not locked on
      const cameraQuaternion = new THREE.Quaternion();
      cameraQuaternion.setFromEuler(
        new THREE.Euler(this.cameraPitch, this.cameraYaw, 0, 'YXZ')
      );
      this.camera.quaternion.copy(cameraQuaternion);

      const cameraOffset = new THREE.Vector3(0, 2, 5);
      cameraOffset.applyQuaternion(this.camera.quaternion);
      this.camera.position.copy(this.player.mesh.position).add(cameraOffset);
    }

    if (this.keys['KeyE']) {
      const npcs = this.game.entities?.characters?.npcs ?? [];
      npcs.forEach((npc) => {
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
      this.game.playSFX(AssetPaths.SFX_JUMP);

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
      this.game.playSFX(AssetPaths.SFX_ROLLING);

      const direction = this.getMovementDirection();

      if (direction.length() > 0) {
        direction.normalize();
        const rollingSpeed = this.game.data.player.rollingSpeed || 8;
        this.player.physics.velocity.x = direction.x * rollingSpeed;
        this.player.physics.velocity.z = direction.z * rollingSpeed;
      }

      setTimeout(() => {
        if (this.player.isRolling) {
          this.player.isRolling = false;
          this.player.physics.velocity.x = 0;
          this.player.physics.velocity.z = 0;
        }
      }, this.game.data.player.rollDuration || 500);
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
      this.game.playSFX(AssetPaths.SFX_BACK_STEP);

      const playerForward = new THREE.Vector3(0, 0, 1);
      playerForward.applyQuaternion(this.player.mesh.quaternion);
      playerForward.y = 0;
      playerForward.normalize();

      const direction = playerForward.clone().negate();

      const backStepSpeed = this.game.data.player.backStepSpeed || 6;
      this.player.physics.velocity.x = direction.x * backStepSpeed;
      this.player.physics.velocity.z = direction.z * backStepSpeed;

      setTimeout(() => {
        if (this.player.isBackStepping) {
          this.player.isBackStepping = false;
          this.player.physics.velocity.x = 0;
          this.player.physics.velocity.z = 0;
        }
      }, this.game.data.player.backStepDuration || 500);
    }
  }

  getMovementDirection() {
    const direction = new THREE.Vector3();

    if (this.keys['KeyW']) direction.z -= 1;
    if (this.keys['KeyS']) direction.z += 1;
    if (this.keys['KeyA']) direction.x -= 1;
    if (this.keys['KeyD']) direction.x += 1;

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
      // Play lock-on release sound
      this.game.playSFX(AssetPaths.SFX_LOCK_ON);
    } else {
      // Search for new target
      const nearestEnemy = this.findNearestEnemy();
      if (nearestEnemy) {
        this.player.lockedTarget = nearestEnemy;
        if (this.game.lockOnUI) {
          this.game.lockOnUI.showLockOnTarget(nearestEnemy);
        }
        this.game.playSFX(AssetPaths.SFX_LOCK_ON);
      } else {
        // Feedback when no target is found
        console.log('No lock-on target found within range');
      }
    }
  }

  switchLockOnTarget(direction) {
    if (!this.player.lockedTarget) return;
    if (direction === 0) return; // Do nothing if direction is 0

    // Check cooldown for wheel operation
    const now = Date.now();
    if (now - this.lastWheelTime < this.wheelCooldown) {
      return;
    }
    this.lastWheelTime = now;

    const allEnemies = this.game.entities?.characters?.enemies ?? [];
    const enemies = allEnemies.filter((enemy) => !enemy.isDead);
    if (enemies.length <= 1) return;

    const currentIndex = enemies.indexOf(this.player.lockedTarget);
    if (currentIndex === -1) return;

    // direction: 1 = next, -1 = previous
    let nextIndex;
    if (direction > 0) {
      nextIndex = (currentIndex + 1) % enemies.length;
    } else {
      nextIndex = (currentIndex - 1 + enemies.length) % enemies.length;
    }

    const nextTarget = enemies[nextIndex];

    this.player.lockedTarget = nextTarget;
    if (this.game.lockOnUI) {
      this.game.lockOnUI.showLockOnTarget(nextTarget);
    }
    this.game.playSFX(AssetPaths.SFX_LOCK_ON);
  }

  findNearestEnemy() {
    let nearestEnemy = null;
    let nearestDistance = Infinity;
    const maxLockOnDistance = 20; // Expanded lock-on range

    const enemies = this.game.entities?.characters?.enemies ?? [];
    const bosses = this.game.entities?.characters?.boss
      ? [this.game.entities.characters.boss]
      : [];
    const allTargets = [...enemies, ...bosses];

    for (const target of allTargets) {
      if (target.isDead) continue;

      const distance = this.player.mesh.position.distanceTo(
        target.mesh.position
      );

      // Also check if target is visible on screen (optional)
      const isVisible = this.isTargetVisible(target);

      if (
        distance < nearestDistance &&
        distance <= maxLockOnDistance &&
        isVisible
      ) {
        nearestDistance = distance;
        nearestEnemy = target;
      }
    }

    return nearestEnemy;
  }

  isTargetVisible(target) {
    // Check if target is within camera frustum
    const targetPosition = target.mesh.position.clone();
    targetPosition.project(this.camera);

    // Check if within screen bounds (-1 to 1 range)
    return (
      targetPosition.x >= -1 &&
      targetPosition.x <= 1 &&
      targetPosition.y >= -1 &&
      targetPosition.y <= 1 &&
      targetPosition.z >= 0 &&
      targetPosition.z <= 1
    );
  }

  performAttack(damage, range) {
    const enemies = this.game.entities?.characters?.enemies ?? [];
    enemies.forEach((enemy) => {
      if (this.player.mesh.position.distanceTo(enemy.mesh.position) < range) {
        const finalDamage = damage * this.player.attackBuffMultiplier;

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

  clearKeyStates() {
    this.keys = {};
  }

  reevaluateKeyStates() {
    const currentlyPressed = new Set();

    const keydownHandler = (e) => {
      currentlyPressed.add(e.code);
    };

    const keyupHandler = (e) => {
      currentlyPressed.delete(e.code);
    };

    document.addEventListener('keydown', keydownHandler);
    document.addEventListener('keyup', keyupHandler);

    requestAnimationFrame(() => {
      document.removeEventListener('keydown', keydownHandler);
      document.removeEventListener('keyup', keyupHandler);

      const allKeys = Object.keys(this.keys);
      for (const key of allKeys) {
        this.keys[key] = currentlyPressed.has(key);
      }

      for (const key of currentlyPressed) {
        this.keys[key] = true;
      }
    });
  }
}
