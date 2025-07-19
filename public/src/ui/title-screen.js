export class TitleScreen {
    constructor(onStart) {
        this.container = document.createElement('div');
        this.container.id = 'title-screen';

        const title = document.createElement('h1');
        title.textContent = 'もふもふアドベンチャー';
        this.container.appendChild(title);

        const subtitle = document.createElement('p');
        subtitle.textContent = 'Click anywhere to start';
        this.container.appendChild(subtitle);

        this.clickHandler = () => {
            if (this.container) { // Prevent multiple clicks
                onStart();
            }
        };

        this.container.addEventListener('click', this.clickHandler, { once: true }); // Fire only once

        document.body.appendChild(this.container);
    }

    dispose() {
        if (this.container) {
            // The event listener is already removed with { once: true }
            if (this.container.parentNode) {
                this.container.parentNode.removeChild(this.container);
            }
            this.container = null;
        }
    }

    // The setReady method is no longer needed as the screen is ready by default.
}