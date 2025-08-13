import { GameState, AssetPaths } from '../utils/constants.js';
import { localization } from '../utils/localization.js';

export class Hud {
  constructor(game, player) {
    this.game = game;
    this.player = player;
    this.container = document.createElement('div');
    this.container.id = 'hud';
    this.container.classList.add('hidden');
    document.body.appendChild(this.container);

    this.initialMaxHp = this.game.data.player.maxHp;
    this.initialMaxFp = this.game.data.player.maxFp;
    this.initialMaxStamina = this.game.data.player.maxStamina;
    this.baseBarWidth = 200;

    this.statusBarsContainer = this.createStatusBarsContainer();
    this.equipmentContainer = this.createEquipmentContainer();
    this.experienceDisplay = this.createExperienceDisplay();
    this.levelUpMenu = this.createLevelUpMenu();
    this.deathOverlay = this.createDeathOverlay();

    this.container.appendChild(this.statusBarsContainer);
    this.container.appendChild(this.equipmentContainer);
    this.container.appendChild(this.experienceDisplay);
    this.container.appendChild(this.levelUpMenu.element);

    document.body.appendChild(this.deathOverlay.element);
  }

  // ================================================================
  // CREATE METHODS - UI要素作成
  // ================================================================

  createStatusBarsContainer() {
    const container = document.createElement('div');
    container.classList.add('status-bars');

    this.playerPortrait = this.createPlayerPortrait();
    container.appendChild(this.playerPortrait);

    const barsContainer = document.createElement('div');
    barsContainer.classList.add('bars-container');

    this.hpBar = this.createStatusBar('hp-bar');
    this.fpBar = this.createStatusBar('fp-bar');
    this.staminaBar = this.createStatusBar('stamina-bar');

    barsContainer.appendChild(this.hpBar.element);
    barsContainer.appendChild(this.fpBar.element);
    barsContainer.appendChild(this.staminaBar.element);

    container.appendChild(barsContainer);

    return container;
  }

  createPlayerPortrait() {
    const portraitContainer = document.createElement('div');
    portraitContainer.classList.add('player-portrait');

    const portraitImage = document.createElement('img');
    portraitImage.src = `./assets/images/${this.game.data.player.image}`;
    portraitImage.alt = 'Player Portrait';
    portraitImage.classList.add('portrait-image');

    portraitImage.onerror = () => {
      portraitImage.classList.add('hidden');
      portraitImage.classList.remove('visible');
      let placeholder = portraitContainer.querySelector(
        '.portrait-placeholder'
      );
      if (!placeholder) {
        placeholder = document.createElement('div');
        placeholder.classList.add('portrait-placeholder');
        placeholder.textContent = '?';
        portraitContainer.appendChild(placeholder);
      }
    };

    portraitContainer.appendChild(portraitImage);
    return portraitContainer;
  }

  createStatusBar(id) {
    const barContainer = document.createElement('div');
    barContainer.id = id;
    barContainer.classList.add('status-bar-container');

    const barBackground = document.createElement('div');
    barBackground.classList.add('status-bar-background');

    const barFill = document.createElement('div');
    barFill.classList.add('status-bar-fill');

    barBackground.appendChild(barFill);
    barContainer.appendChild(barBackground);

    return { element: barContainer, fill: barFill, background: barBackground };
  }

  createDeathOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'death-overlay';

    const message = document.createElement('div');
    message.id = 'death-message';
    message.textContent = localization.getText('ui.youDied');

    overlay.appendChild(message);

    return { element: overlay, message };
  }

  createLevelUpMenu() {
    const menu = document.createElement('div');
    menu.id = 'level-up-menu';

    const title = document.createElement('h2');
    title.textContent = localization.getText('ui.levelUp');
    menu.appendChild(title);

    const points = document.createElement('p');
    points.id = 'status-points';
    menu.appendChild(points);

    const statusPointsPerLevel = this.game.data.player.statusPointsPerLevel;

    const hpButton = this.createStatButton(
      'hp',
      `HP +${statusPointsPerLevel}`,
      () => (this.player.maxHp += statusPointsPerLevel)
    );
    const fpButton = this.createStatButton(
      'fp',
      `FP +${statusPointsPerLevel}`,
      () => (this.player.maxFp += statusPointsPerLevel)
    );
    const staminaButton = this.createStatButton(
      'stamina',
      `Stamina +${statusPointsPerLevel}`,
      () => (this.player.maxStamina += statusPointsPerLevel)
    );

    menu.appendChild(hpButton);
    menu.appendChild(fpButton);
    menu.appendChild(staminaButton);

    return { element: menu, points, hpButton, fpButton, staminaButton };
  }

  createStatButton(stat, text, onClick) {
    const button = document.createElement('button');
    button.textContent = text;
    button.addEventListener('click', () => {
      if (this.player.statusPoints > 0) {
        onClick();
        this.player.statusPoints--;
        this.game.playSound(AssetPaths.SFX_CLICK);

        if (this.player.statusPoints === 0) {
          this.player.hp = this.player.maxHp;
          this.player.fp = this.player.maxFp;
          this.player.stamina = this.player.maxStamina;

          this.game.togglePause();
          this.game.setPauseMenuVisibility(false);

          // Re-evaluate key states to sync with actual keyboard state
          this.game.inputController.reevaluateKeyStates();
        } else {
          this._updateStatusPointsDisplay();
        }
      }
    });
    return button;
  }

  createEquipmentContainer() {
    const container = document.createElement('div');
    container.id = 'equipment-container';

    // Create equipment slots
    this.equipmentWeapon = this.createEquipmentSlot('weapon');
    this.equipmentShield = this.createEquipmentSlot('shield');
    this.equipmentItem = this.createEquipmentSlot('item');
    this.equipmentSkill = this.createEquipmentSlot('skill');

    container.appendChild(this.equipmentWeapon);
    container.appendChild(this.equipmentShield);
    container.appendChild(this.equipmentItem);
    container.appendChild(this.equipmentSkill);

    return container;
  }

  createExperienceDisplay() {
    const container = document.createElement('div');
    container.id = 'experience-display';

    const label = document.createElement('div');
    label.textContent = localization.getText('ui.experience');

    const value = document.createElement('div');
    value.id = 'total-experience';
    value.textContent = '0';

    container.appendChild(label);
    container.appendChild(value);

    this.totalExperienceValue = value;

    return container;
  }

  createEquipmentSlot(type) {
    const element = document.createElement('div');
    element.classList.add('equipment-slot', type);

    element.innerHTML = `
      <div class="item-icon-container">
        <img class="item-image" src="" alt="" style="display: none;">
        <span class="placeholder">-</span>
      </div>
      <span class="item-name"></span>
    `;

    return element;
  }

  // ================================================================
  // PUBLIC METHODS - 外部インターフェース
  // ================================================================

  show() {
    this.container.classList.remove('hidden');
    this.container.classList.add('visible');
  }

  hide() {
    this.container.classList.add('hidden');
    this.container.classList.remove('visible');
  }

  showDeathScreen() {
    this.deathOverlay.element.classList.remove('transparent');
    this.deathOverlay.element.classList.add('opaque');
  }

  hideDeathScreen() {
    this.deathOverlay.element.classList.add('transparent');
    this.deathOverlay.element.classList.remove('opaque');
  }

  update() {
    this.hpBar.fill.style.width = `${(this.player.hp / this.player.maxHp) * 100}%`;
    this.fpBar.fill.style.width = `${(this.player.fp / this.player.maxFp) * 100}%`;
    this.staminaBar.fill.style.width = `${(this.player.stamina / this.player.maxStamina) * 100}%`;

    this.hpBar.background.style.width = `${(this.player.maxHp / this.initialMaxHp) * this.baseBarWidth}px`;
    this.fpBar.background.style.width = `${(this.player.maxFp / this.initialMaxFp) * this.baseBarWidth}px`;
    this.staminaBar.background.style.width = `${(this.player.maxStamina / this.initialMaxStamina) * this.baseBarWidth}px`;

    if (this.player.statusPoints > 0) {
      this.levelUpMenu.element.classList.remove('hidden');
      this.levelUpMenu.element.classList.add('visible');
      this._updateStatusPointsDisplay();
      if (this.game.gameState === GameState.PLAYING) {
        this.game.togglePause();
      }
    } else {
      this.levelUpMenu.element.classList.add('hidden');
      this.levelUpMenu.element.classList.remove('visible');
    }

    // Update equipment container
    this.updateEquipmentDisplay();

    // Update experience display
    this.updateExperienceDisplay();

    if (this.player.isDead) {
      this.deathOverlay.element.classList.remove('hidden');
      this.deathOverlay.element.classList.add('visible-flex');
    } else {
      this.deathOverlay.element.classList.add('hidden');
      this.deathOverlay.element.classList.remove('visible-flex');
    }
  }

  // ================================================================
  // UPDATE METHODS - 更新処理
  // ================================================================

  updateEquipmentDisplay() {
    if (!this.equipmentWeapon) return;

    // Update weapon
    const currentWeapon = this.player.getCurrentWeapon();
    this.updateEquipmentSlot(this.equipmentWeapon, currentWeapon);

    // Update shield
    const currentShield = this.player.getCurrentShield();
    this.updateEquipmentSlot(this.equipmentShield, currentShield);

    // Update item
    const currentItem = this.player.getCurrentItem();
    let itemData = null;
    if (currentItem) {
      itemData = this.game.data.items[currentItem];
    }
    this.updateEquipmentSlot(this.equipmentItem, itemData, currentItem);

    // Update skill
    const currentSkill = this.player.getCurrentSkill();
    this.updateEquipmentSlot(this.equipmentSkill, currentSkill);
  }

  updateEquipmentSlot(slotElement, itemData, itemKey = null) {
    const imageElement = slotElement.querySelector('.item-image');
    const nameElement = slotElement.querySelector('.item-name');
    const placeholderElement = slotElement.querySelector('.placeholder');

    if (itemData) {
      // アイテムが存在する場合
      nameElement.textContent =
        itemData.name ||
        (itemKey ? localization.getText(`items.${itemKey}`) || itemKey : '');

      if (itemData.image) {
        imageElement.src = `./assets/images/${itemData.image}`;
        imageElement.classList.remove('hidden');
        imageElement.classList.add('visible');
        placeholderElement.classList.add('hidden');
        placeholderElement.classList.remove('visible');

        imageElement.onerror = () => {
          // 画像が見つからない場合はプレースホルダーを表示
          imageElement.classList.add('hidden');
          imageElement.classList.remove('visible');
          placeholderElement.classList.remove('hidden');
          placeholderElement.classList.add('visible');
          placeholderElement.textContent = '?';
        };
      } else {
        // 画像が指定されていない場合
        imageElement.classList.add('hidden');
        imageElement.classList.remove('visible');
        placeholderElement.classList.remove('hidden');
        placeholderElement.classList.add('visible');
        placeholderElement.textContent = '?';
      }
    } else {
      // アイテムが存在しない場合
      nameElement.textContent = '';
      imageElement.classList.add('hidden');
      imageElement.classList.remove('visible');
      placeholderElement.classList.remove('hidden');
      placeholderElement.classList.add('visible');
      placeholderElement.textContent = '-';
    }
  }

  updateExperienceDisplay() {
    this.totalExperienceValue.textContent =
      this.player.totalExperience.toLocaleString();
  }

  // FP不足時のエフェクト表示
  showFpInsufficientEffect() {
    // FPバーを紫色フラッシュ
    this.fpBar.element.classList.add('fp-insufficient-flash');
    // 0.5秒後にフラッシュエフェクトを削除
    setTimeout(() => {
      this.fpBar.element.classList.remove('fp-insufficient-flash');
    }, 500);
  }

  // HPダメージ時のエフェクト表示
  showHpDamageEffect() {
    // HPバーを赤色フラッシュ
    this.hpBar.element.classList.add('hp-damage-flash');
    // 0.5秒後にフラッシュエフェクトを削除
    setTimeout(() => {
      this.hpBar.element.classList.remove('hp-damage-flash');
    }, 500);
  }

  // FP使用時のエフェクト表示
  showFpUseEffect() {
    // FPバーを青色フラッシュ
    this.fpBar.element.classList.add('fp-use-flash');
    // 0.3秒後にフラッシュエフェクトを削除
    setTimeout(() => {
      this.fpBar.element.classList.remove('fp-use-flash');
    }, 300);
  }

  // ================================================================
  // PRIVATE METHODS - 内部ヘルパー
  // ================================================================

  _updateStatusPointsDisplay() {
    this.levelUpMenu.points.textContent = `${localization.getText('ui.statusPoints')}: ${this.player.statusPoints}`;
  }
}
