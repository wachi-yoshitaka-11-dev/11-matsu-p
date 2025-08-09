import { GameState, AssetNames } from '../utils/constants.js';
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

    // Create all UI components
    this.statusBarsContainer = this.createStatusBarsContainer();
    this.equipmentContainer = this.createEquipmentContainer();
    this.experienceDisplay = this.createExperienceDisplay();
    this.levelUpMenu = this.createLevelUpMenu();
    this.deathOverlay = this.createDeathOverlay();

    // Add components to main HUD container
    this.container.appendChild(this.statusBarsContainer);
    this.container.appendChild(this.equipmentContainer);
    this.container.appendChild(this.experienceDisplay);
    this.container.appendChild(this.levelUpMenu.element);

    // Add death overlay to body
    document.body.appendChild(this.deathOverlay.element);
  }

  // ================================================================
  // CREATE METHODS - UI要素作成
  // ================================================================

  createStatusBarsContainer() {
    const container = document.createElement('div');
    container.classList.add('status-bars');

    this.hpBar = this.createStatusBar('hp-bar', 'HP');
    this.fpBar = this.createStatusBar('fp-bar', 'FP');
    this.staminaBar = this.createStatusBar('stamina-bar', 'Stamina');

    container.appendChild(this.hpBar.element);
    container.appendChild(this.fpBar.element);
    container.appendChild(this.staminaBar.element);

    return container;
  }

  createStatusBar(id, label) {
    const barContainer = document.createElement('div');
    barContainer.id = id;
    barContainer.classList.add('status-bar-container');

    const barLabel = document.createElement('div');
    barLabel.classList.add('status-bar-label');
    barLabel.textContent = label;

    const barBackground = document.createElement('div');
    barBackground.classList.add('status-bar-background');

    const barFill = document.createElement('div');
    barFill.classList.add('status-bar-fill');

    barBackground.appendChild(barFill);
    barContainer.appendChild(barLabel);
    barContainer.appendChild(barBackground);

    return { element: barContainer, fill: barFill };
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
        this.game.playSound(AssetNames.SFX_CLICK);

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

    return container;
  }

  createEquipmentSlot(type) {
    const element = document.createElement('div');
    element.classList.add('equipment-slot', type);

    element.innerHTML = `
      <img class="item-image hidden" src="" alt="">
      <span class="placeholder">-</span>
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

    this.hpBar.element.querySelector('.status-bar-background').style.width =
      `${(this.player.maxHp / this.initialMaxHp) * this.baseBarWidth}px`;
    this.fpBar.element.querySelector('.status-bar-background').style.width =
      `${(this.player.maxFp / this.initialMaxFp) * this.baseBarWidth}px`;
    this.staminaBar.element.querySelector(
      '.status-bar-background'
    ).style.width =
      `${(this.player.maxStamina / this.initialMaxStamina) * this.baseBarWidth}px`;

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
    const totalExpElement = document.getElementById('total-experience');
    if (totalExpElement) {
      totalExpElement.textContent = this.player.experience.toLocaleString();
    }
  }

  // ================================================================
  // PRIVATE METHODS - 内部ヘルパー
  // ================================================================

  _updateStatusPointsDisplay() {
    this.levelUpMenu.points.textContent = `${localization.getText('ui.statusPoints')}: ${this.player.statusPoints}`;
  }
}
