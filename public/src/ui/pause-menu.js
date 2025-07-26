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
        resumeButton.addEventListener('click', () => {
            this.game.togglePause();
            this.game.setPauseMenuVisibility(false);
        });
        this.container.appendChild(resumeButton);

        document.body.appendChild(this.container);
    }

    toggle(show) {
        this.container.style.display = show ? 'flex' : 'none';
    }
}