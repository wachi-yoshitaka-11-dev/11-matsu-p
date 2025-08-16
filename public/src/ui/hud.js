import { GameState, AssetPaths } from '../utils/constants.js';
import { localization } from '../utils/localization.js';

export class Hud {
  constructor(game) {
    this.game = game;
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
    this.stageDisplay = this.createStageDisplay();
    this.levelUpMenu = this.createLevelUpMenu();
    this.deathOverlay = this.createDeathOverlay();

    this.container.appendChild(this.statusBarsContainer);
    this.container.appendChild(this.equipmentContainer);
    this.container.appendChild(this.experienceDisplay);
    this.container.appendChild(this.stageDisplay);
    this.container.appendChild(this.levelUpMenu.element);

    document.body.appendChild(this.deathOverlay.element);
  }

  createStatusBarsContainer() {
    const container = document.createElement('div');
    container.classList.add('status-bars');

    this.game.playerPortrait = this.createPlayerPortrait();
    container.appendChild(this.game.playerPortrait);

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

    // Add level display overlay on top of portrait
    const levelOverlay = document.createElement('div');
    levelOverlay.classList.add('level-overlay');
    levelOverlay.textContent = '1';

    portraitContainer.appendChild(portraitImage);
    portraitContainer.appendChild(levelOverlay);

    // Store reference to level overlay for updates
    this.levelOverlay = levelOverlay;

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
      () => (this.game.player.maxHp += statusPointsPerLevel)
    );
    const fpButton = this.createStatButton(
      'fp',
      `FP +${statusPointsPerLevel}`,
      () => (this.game.player.maxFp += statusPointsPerLevel)
    );
    const staminaButton = this.createStatButton(
      'stamina',
      `Stamina +${statusPointsPerLevel}`,
      () => (this.game.player.maxStamina += statusPointsPerLevel)
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
      if (this.game.player.statusPoints > 0) {
        onClick();
        this.game.player.statusPoints--;
        this.game.playSound(AssetPaths.SFX_CLICK);

        if (this.game.player.statusPoints === 0) {
          this.game.player.hp = this.game.player.maxHp;
          this.game.player.fp = this.game.player.maxFp;
          this.game.player.stamina = this.game.player.maxStamina;

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

  createStageDisplay() {
    const container = document.createElement('div');
    container.id = 'stage-display';

    const stageLabel = document.createElement('div');
    stageLabel.classList.add('stage-label');
    stageLabel.textContent = localization.getText('ui.stage');

    const stageName = document.createElement('div');
    stageName.id = 'current-stage-name';
    stageName.classList.add('stage-name');
    stageName.textContent = '';

    container.appendChild(stageLabel);
    container.appendChild(stageName);

    this.stageNameElement = stageName;

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
    this.hpBar.fill.style.width = `${(this.game.player.hp / this.game.player.maxHp) * 100}%`;
    this.fpBar.fill.style.width = `${(this.game.player.fp / this.game.player.maxFp) * 100}%`;
    this.staminaBar.fill.style.width = `${(this.game.player.stamina / this.game.player.maxStamina) * 100}%`;

    this.hpBar.background.style.width = `${(this.game.player.maxHp / this.initialMaxHp) * this.baseBarWidth}px`;
    this.fpBar.background.style.width = `${(this.game.player.maxFp / this.initialMaxFp) * this.baseBarWidth}px`;
    this.staminaBar.background.style.width = `${(this.game.player.maxStamina / this.initialMaxStamina) * this.baseBarWidth}px`;

    if (this.game.player.statusPoints > 0) {
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

    this.updateEquipmentDisplay();

    this.updateExperienceDisplay();

    this.updateLevelDisplay();

    this.updateStageDisplay();

    if (this.game.player.isDead) {
      this.deathOverlay.element.classList.remove('hidden');
      this.deathOverlay.element.classList.add('visible-flex');
    } else {
      this.deathOverlay.element.classList.add('hidden');
      this.deathOverlay.element.classList.remove('visible-flex');
    }
  }

  updateEquipmentDisplay() {
    if (!this.equipmentWeapon) return;

    const currentWeapon = this.game.player.getCurrentWeapon();
    this.updateEquipmentSlot(this.equipmentWeapon, currentWeapon);

    const currentShield = this.game.player.getCurrentShield();
    this.updateEquipmentSlot(this.equipmentShield, currentShield);

    const currentItem = this.game.player.getCurrentItem();
    let itemData = null;
    if (currentItem) {
      itemData = this.game.data.items[currentItem];
    }
    this.updateEquipmentSlot(this.equipmentItem, itemData, currentItem);

    const currentSkill = this.game.player.getCurrentSkill();
    this.updateEquipmentSlot(this.equipmentSkill, currentSkill);
  }

  updateEquipmentSlot(slotElement, itemData, itemKey = null) {
    const imageElement = slotElement.querySelector('.item-image');
    const nameElement = slotElement.querySelector('.item-name');
    const placeholderElement = slotElement.querySelector('.placeholder');

    if (itemData) {
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
          imageElement.classList.add('hidden');
          imageElement.classList.remove('visible');
          placeholderElement.classList.remove('hidden');
          placeholderElement.classList.add('visible');
          placeholderElement.textContent = '?';
        };
      } else {
        imageElement.classList.add('hidden');
        imageElement.classList.remove('visible');
        placeholderElement.classList.remove('hidden');
        placeholderElement.classList.add('visible');
        placeholderElement.textContent = '?';
      }
    } else {
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
      this.game.player.totalExperience.toLocaleString();
  }

  updateLevelDisplay() {
    if (!this.levelOverlay) return;

    if (this.game.player && this.game.player.level !== undefined) {
      this.levelOverlay.textContent = this.game.player.level.toString();
    } else {
      this.levelOverlay.textContent = '1';
    }
  }

  updateStageDisplay() {
    if (!this.stageNameElement) return;

    const stageData = this.game.stageManager?.getCurrentStageData();
    if (stageData && stageData.name) {
      this.stageNameElement.textContent = stageData.name;
    } else {
      this.stageNameElement.textContent = '';
    }
  }

  showFpInsufficientEffect() {
    this.fpBar.element.classList.add('fp-insufficient-flash');
    setTimeout(() => {
      this.fpBar.element.classList.remove('fp-insufficient-flash');
    }, 500);
  }

  showHpDamageEffect() {
    this.hpBar.element.classList.add('hp-damage-flash');
    setTimeout(() => {
      this.hpBar.element.classList.remove('hp-damage-flash');
    }, 500);
  }

  showFpUseEffect() {
    this.fpBar.element.classList.add('fp-use-flash');
    setTimeout(() => {
      this.fpBar.element.classList.remove('fp-use-flash');
    }, 300);
  }

  _updateStatusPointsDisplay() {
    this.levelUpMenu.points.textContent = `${localization.getText('ui.statusPoints')}: ${this.game.player.statusPoints}`;
  }
}
