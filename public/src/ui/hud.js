export class Hud {
    constructor(game, player) {
        this.game = game;
        this.player = player;
        this.container = document.createElement('div');
        this.container.id = 'hud';
        this.container.style.display = 'none'; // Initially hidden
        document.body.appendChild(this.container);

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
        document.body.appendChild(this.deathOverlay); // Add overlay to body
        this.deathOverlay.appendChild(this.deathMessage); // Add message to overlay
        this.container.appendChild(this.levelUpMenu.element);

        this.inventoryDisplay = this.createInventoryDisplay();
        this.container.appendChild(this.inventoryDisplay);

        this.weaponDisplay = this.createWeaponDisplay();
        this.container.appendChild(this.weaponDisplay);

        this.damageOverlay = document.createElement('div');
        this.damageOverlay.id = 'damage-overlay';
        document.body.appendChild(this.damageOverlay);

        this.addStyles();
    }

    createWeaponDisplay() {
        const weaponContainer = document.createElement('div');
        weaponContainer.id = 'weapon-display';
        return weaponContainer;
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

        const hpButton = this.createStatButton('hp', `HP +${statusPointsPerLevel}`, () => this.player.maxHp += statusPointsPerLevel);
        const fpButton = this.createStatButton('fp', `FP +${statusPointsPerLevel}`, () => this.player.maxFp += statusPointsPerLevel);
        const staminaButton = this.createStatButton('stamina', `Stamina +${statusPointsPerLevel}`, () => this.player.maxStamina += statusPointsPerLevel);

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

        this.deathMessage.style.display = this.player.isDead ? 'block' : 'none';

        if (this.player.statusPoints > 0) {
            this.levelUpMenu.element.style.display = 'block';
            this.levelUpMenu.points.textContent = `Status Points: ${this.player.statusPoints}`;
        } else {
            this.levelUpMenu.element.style.display = 'none';
        }

        // Update inventory display
        this.inventoryDisplay.innerHTML = '<h3>Inventory</h3>';
        this.player.inventory.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.textContent = item;
            this.inventoryDisplay.appendChild(itemEl);
        });

        // Update weapon display
        this.weaponDisplay.innerHTML = `<h3>Weapon</h3><div>${this.player.weapons[this.player.currentWeaponIndex]}</div>`;

        this.deathOverlay.style.display = this.player.isDead ? 'flex' : 'none';
    }

    showDeathScreen() {
        this.deathOverlay.style.opacity = 1;
    }

    hideDeathScreen() {
        this.deathOverlay.style.opacity = 0;
    }

    showDamageEffect() {
        if (this.damageEffectTimeout) {
            clearTimeout(this.damageEffectTimeout);
        }
        this.damageOverlay.classList.add('active');
        this.damageEffectTimeout = setTimeout(() => {
            this.damageOverlay.classList.remove('active');
            this.damageEffectTimeout = null;
        }, 200); // Effect duration
    }

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            #hud {
                position: absolute;
                top: 10px;
                left: 10px;
                color: white;
                font-family: sans-serif;
            }
            .status-bar-container {
                margin-bottom: 5px;
            }
            .status-bar-label {
                font-size: 12px;
            }
            .status-bar-background {
                width: 200px;
                height: 15px;
                background-color: rgba(0, 0, 0, 0.5);
                border: 1px solid #fff;
            }
            .status-bar-fill {
                height: 100%;
                background-color: #ff0000; /* Default to red for HP */
                transition: width 0.2s;
            }
            #fp-bar .status-bar-fill {
                background-color: #0000ff; /* Blue for FP */
            }
            #stamina-bar .status-bar-fill {
                background-color: #00ff00; /* Green for Stamina */
            }
            #death-message {
                font-size: 5em;
                color: #8b0000; /* DarkRed */
                text-align: center;
            }
            #death-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.7);
                display: none; /* Initially hidden */
                justify-content: center;
                align-items: center;
                opacity: 0;
                transition: opacity 1s;
                z-index: 100;
            }
            #level-up-menu {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background-color: rgba(0,0,0,0.8);
                padding: 20px;
                border: 2px solid white;
                display: none;
            }
            #inventory {
                position: absolute;
                top: 150px;
                left: 10px;
                background-color: rgba(0,0,0,0.5);
                padding: 10px;
                border: 1px solid white;
            }
            #weapon-display {
                position: absolute;
                top: 250px; /* Adjust as needed */
                left: 10px;
                background-color: rgba(0,0,0,0.5);
                padding: 10px;
                border: 1px solid white;
            }
            #damage-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(255, 0, 0, 0.5);
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.1s;
                z-index: 99;
            }
            #damage-overlay.active {
                opacity: 1;
            }
        `;
        document.head.appendChild(style);
    }
}