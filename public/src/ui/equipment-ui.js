export class EquipmentUI {
  constructor(game, player) {
    this.game = game;
    this.player = player;
    this.container = null;
    this.weaponDisplay = null;
    this.shieldDisplay = null;
    this.itemDisplay = null;
    this.skillDisplay = null;
    this.setupUI();
  }

  setupUI() {
    // Create main container
    this.container = document.createElement('div');
    this.container.id = 'equipment-ui';
    this.container.style.position = 'absolute';
    this.container.style.bottom = '20px';
    this.container.style.right = '20px';
    this.container.style.display = 'flex';
    this.container.style.flexDirection = 'column';
    this.container.style.gap = '10px';
    this.container.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    this.container.style.padding = '15px';
    this.container.style.borderRadius = '8px';
    this.container.style.border = '2px solid #444';
    this.container.style.fontFamily = 'Arial, sans-serif';
    this.container.style.fontSize = '14px';
    this.container.style.color = '#white';
    this.container.style.minWidth = '200px';
    this.container.style.zIndex = '100';

    // Create equipment slots
    this.weaponDisplay = this.createEquipmentSlot('武器', '→', '#ff6b6b');
    this.shieldDisplay = this.createEquipmentSlot('盾', '←', '#4ecdc4');
    this.itemDisplay = this.createEquipmentSlot('アイテム', '↓', '#45b7d1');
    this.skillDisplay = this.createEquipmentSlot('スキル', '↑', '#96ceb4');

    this.container.appendChild(this.weaponDisplay.element);
    this.container.appendChild(this.shieldDisplay.element);
    this.container.appendChild(this.itemDisplay.element);
    this.container.appendChild(this.skillDisplay.element);

    document.body.appendChild(this.container);
  }

  createEquipmentSlot(label, keyHint, color) {
    const element = document.createElement('div');
    element.style.display = 'flex';
    element.style.alignItems = 'center';
    element.style.justifyContent = 'space-between';
    element.style.padding = '8px';
    element.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    element.style.borderRadius = '4px';
    element.style.border = `2px solid ${color}`;

    const labelElement = document.createElement('span');
    labelElement.textContent = label;
    labelElement.style.fontWeight = 'bold';
    labelElement.style.color = color;
    labelElement.style.minWidth = '60px';

    const nameElement = document.createElement('span');
    nameElement.style.flex = '1';
    nameElement.style.textAlign = 'center';
    nameElement.style.color = '#ffffff';

    const keyElement = document.createElement('span');
    keyElement.textContent = keyHint;
    keyElement.style.fontWeight = 'bold';
    keyElement.style.color = color;
    keyElement.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
    keyElement.style.padding = '2px 6px';
    keyElement.style.borderRadius = '3px';
    keyElement.style.fontSize = '12px';

    element.appendChild(labelElement);
    element.appendChild(nameElement);
    element.appendChild(keyElement);

    return {
      element: element,
      nameElement: nameElement
    };
  }

  update() {
    if (!this.player) return;

    try {
      // Update weapon display
      const currentWeapon = this.player.getCurrentWeapon();
      if (currentWeapon && currentWeapon.name) {
        this.weaponDisplay.nameElement.textContent = currentWeapon.name;
      } else {
        const weaponName = this.player.weapons[this.player.currentWeaponIndex];
        this.weaponDisplay.nameElement.textContent = weaponName || 'なし';
      }
    } catch (error) {
      console.warn('Error updating weapon display:', error);
      this.weaponDisplay.nameElement.textContent = 'エラー';
    }

    // Update shield display
    const currentShield = this.player.getCurrentShield();
    if (currentShield && currentShield.name) {
      this.shieldDisplay.nameElement.textContent = currentShield.name;
    } else {
      const shieldName = this.player.shields[this.player.currentShieldIndex];
      this.shieldDisplay.nameElement.textContent = shieldName || 'なし';
    }

    // Update item display
    const currentItem = this.player.getCurrentItem();
    if (currentItem) {
      const itemData = this.game.data.items[currentItem];
      if (itemData && itemData.name) {
        this.itemDisplay.nameElement.textContent = itemData.name;
      } else {
        this.itemDisplay.nameElement.textContent = currentItem;
      }
    } else {
      this.itemDisplay.nameElement.textContent = 'なし';
    }

    // Update skill display
    const currentSkill = this.player.getCurrentSkill();
    if (currentSkill && currentSkill.name) {
      this.skillDisplay.nameElement.textContent = currentSkill.name;
    } else {
      const skillName = this.player.skills[this.player.currentSkillIndex];
      this.skillDisplay.nameElement.textContent = skillName || 'なし';
    }
  }

  setVisibility(visible) {
    if (this.container) {
      this.container.style.display = visible ? 'flex' : 'none';
    }
  }

  dispose() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}