import { GameState, AssetNames } from '../utils/constants.js';

export class Hud {
  constructor(game, player) {
    this.game = game;
    this.player = player;
    this.container = document.createElement('div');
    this.container.id = 'hud';
    this.container.style.display = 'none';
    document.body.appendChild(this.container);

    this.initialMaxHp = this.game.data.player.maxHp;
    this.initialMaxFp = this.game.data.player.maxFp;
    this.initialMaxStamina = this.game.data.player.maxStamina;
    this.baseBarWidth = 200;

    this.hpBar = this.createStatusBar('hp-bar', 'HP');
    this.fpBar = this.createStatusBar('fp-bar', 'FP');
    this.staminaBar = this.createStatusBar('stamina-bar', 'Stamina');

    this.deathMessage = document.createElement('div');
    this.deathMessage.id = 'death-message';
    this.deathMessage.textContent = 'YOU DIED';

    this.deathOverlay = document.createElement('div');
    this.deathOverlay.id = 'death-overlay';

    this.levelUpMenu = this.createLevelUpMenu();

    this.container.appendChild(this.hpBar.element);
    this.container.appendChild(this.fpBar.element);
    this.container.appendChild(this.staminaBar.element);
    document.body.appendChild(this.deathOverlay);
    this.deathOverlay.appendChild(this.deathMessage);
    this.container.appendChild(this.levelUpMenu.element);

    this.inventoryDisplay = this.createInventoryDisplay();
    this.container.appendChild(this.inventoryDisplay);

    this.weaponDisplay = this.createWeaponDisplay();
    this.container.appendChild(this.weaponDisplay);

    this.shieldDisplay = this.createShieldDisplay();
    this.container.appendChild(this.shieldDisplay);

    this.skillDisplay = this.createSkillDisplay();
    this.container.appendChild(this.skillDisplay);
  }

  createWeaponDisplay() {
    const weaponContainer = document.createElement('div');
    weaponContainer.id = 'weapon-display';
    return weaponContainer;
  }

  createShieldDisplay() {
    const shieldContainer = document.createElement('div');
    shieldContainer.id = 'shield-display';
    return shieldContainer;
  }

  createSkillDisplay() {
    const skillContainer = document.createElement('div');
    skillContainer.id = 'skill-display';
    return skillContainer;
  }

  createInventoryDisplay() {
    const inventoryContainer = document.createElement('div');
    inventoryContainer.id = 'inventory';
    return inventoryContainer;
  }

  createLevelUpMenu() {
    const menu = document.createElement('div');
    menu.id = 'level-up-menu';

    const title = document.createElement('h2');
    title.textContent = 'Level Up!';
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
        } else {
          this._updateStatusPointsDisplay();
        }
      }
    });
    return button;
  }

  createStatusBar(id, label) {
    const barContainer = document.createElement('div');
    barContainer.id = id;
    barContainer.className = 'status-bar-container';

    const barLabel = document.createElement('div');
    barLabel.className = 'status-bar-label';
    barLabel.textContent = label;

    const barBackground = document.createElement('div');
    barBackground.className = 'status-bar-background';

    const barFill = document.createElement('div');
    barFill.className = 'status-bar-fill';

    barBackground.appendChild(barFill);
    barContainer.appendChild(barLabel);
    barContainer.appendChild(barBackground);

    return { element: barContainer, fill: barFill };
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

    this.deathMessage.style.display = this.player.isDead ? 'block' : 'none';

    if (this.player.statusPoints > 0) {
      this.levelUpMenu.element.style.display = 'block';
      this._updateStatusPointsDisplay();
      if (this.game.gameState === GameState.PLAYING) {
        this.game.togglePause();
      }
    } else {
      this.levelUpMenu.element.style.display = 'none';
    }

    this.inventoryDisplay.innerHTML = '<h3>Inventory</h3>';
    this.player.inventory.forEach((item) => {
      const itemEl = document.createElement('div');
      itemEl.textContent = item;
      this.inventoryDisplay.appendChild(itemEl);
    });

    this.weaponDisplay.innerHTML = `<h3>Weapon</h3><div>${this.player.weapons[this.player.currentWeaponIndex]}</div>`;
    
    const currentShield = this.player.getCurrentShield();
    this.shieldDisplay.innerHTML = `<h3>Shield</h3><div>${currentShield ? currentShield.name : 'なし'}</div>`;
    
    const currentSkill = this.player.getCurrentSkill();
    this.skillDisplay.innerHTML = `<h3>Skill</h3><div>${currentSkill ? currentSkill.name : 'なし'}</div>`;

    this.deathOverlay.style.display = this.player.isDead ? 'flex' : 'none';
  }

  _updateStatusPointsDisplay() {
    this.levelUpMenu.points.textContent = `Status Points: ${this.player.statusPoints}`;
  }

  showDeathScreen() {
    this.deathOverlay.style.opacity = 1;
  }

  hideDeathScreen() {
    this.deathOverlay.style.opacity = 0;
  }
}
