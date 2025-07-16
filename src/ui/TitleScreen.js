export class TitleScreen {
    constructor(onStart) {
        this.container = document.createElement('div');
        this.container.id = 'title-screen';

        const title = document.createElement('h1');
        title.textContent = 'もふもふアドベンチャー';
        this.container.appendChild(title);

        const startButton = document.createElement('button');
        startButton.textContent = 'Start Game';
        startButton.addEventListener('click', () => {
            this.hide();
            onStart();
        });
        this.container.appendChild(startButton);

        this.addStyles();
        document.body.appendChild(this.container);
    }

    hide() {
        this.container.style.display = 'none';
    }

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            #title-screen {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.8);
                color: white;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                font-family: sans-serif;
                z-index: 100;
            }
        `;
        document.head.appendChild(style);
    }
}
