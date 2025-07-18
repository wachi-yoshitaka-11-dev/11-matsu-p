export class TitleScreen {
    constructor(onStart) {
        this.container = document.createElement('div');
        this.container.id = 'title-screen';

        const title = document.createElement('h1');
        title.textContent = 'もふもふアドベンチャー';
        this.container.appendChild(title);

        const startButton = document.createElement('button');
        startButton.textContent = 'Start Game';
        startButton.setAttribute('aria-label', 'Start Game');
        this.startButtonClickHandler = () => {
            this.hide();
            onStart();
        };
        startButton.addEventListener('click', this.startButtonClickHandler);
        this.container.appendChild(startButton);

        document.body.appendChild(this.container);
    }

    hide() {
        this.container.style.display = 'none';
    }

    dispose() {
        const startButton = this.container.querySelector('button');
        if (startButton) {
            startButton.removeEventListener('click', this.startButtonClickHandler);
        }
        if (this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}
