export class TitleScreen {
    constructor(onStart) {
        this.onStart = onStart;
        this.container = document.createElement('div');
        this.container.id = 'title-screen';

        const title = document.createElement('h1');
        title.textContent = 'もふもふアドベンチャー';
        this.container.appendChild(title);

        const subtitle = document.createElement('p');
        subtitle.textContent = 'Loading...'; // 初期状態はLoading
        this.container.appendChild(subtitle);

        this.boundClickHandler = this._clickHandler.bind(this);
        this.disableInteraction(); // デフォルトで無効

        document.body.appendChild(this.container);
    }

    _clickHandler() {
        if (this.container) {
            this.onStart();
        }
    }

    enableInteraction() {
        this.container.addEventListener('click', this.boundClickHandler, { once: true });
        this.container.querySelector('p').textContent = 'Click anywhere to start';
    }

    disableInteraction() {
        this.container.removeEventListener('click', this.boundClickHandler);
        this.container.querySelector('p').textContent = 'Loading...';
    }

    dispose() {
        if (this.container) {
            this.disableInteraction(); // dispose時にイベントリスナーを削除
            if (this.container.parentNode) {
                this.container.parentNode.removeChild(this.container);
            }
            this.container = null;
        }
    }
}