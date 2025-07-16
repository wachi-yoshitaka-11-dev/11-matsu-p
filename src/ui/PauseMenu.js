export class PauseMenu {
    constructor(game) {
        this.game = game;
        this.container = document.createElement('div');
        this.container.id = 'pause-menu';

        const title = document.createElement('h2');
        title.textContent = 'Paused';
        this.container.appendChild(title);

        const resumeButton = document.createElement('button');
        resumeButton.textContent = 'Resume';
        resumeButton.addEventListener('click', () => this.game.togglePause());
        this.container.appendChild(resumeButton);

        // TODO: Add settings like volume control

        this.addStyles();
        document.body.appendChild(this.container);
    }

    toggle(show) {
        this.container.style.display = show ? 'flex' : 'none';
    }

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            #pause-menu {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                color: white;
                display: none;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                font-family: sans-serif;
                z-index: 99;
            }
        `;
        document.head.appendChild(style);
    }
}
