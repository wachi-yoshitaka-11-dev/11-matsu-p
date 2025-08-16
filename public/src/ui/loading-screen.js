export class LoadingScreen {
  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'loading-screen';
    this.container.classList.add('hidden');

    const loadingSpinner = document.createElement('div');
    loadingSpinner.classList.add('loading-spinner');

    this.container.appendChild(loadingSpinner);

    document.body.appendChild(this.container);
  }

  show() {
    this.container.classList.remove('hidden');
    this.container.classList.add('visible-flex');
  }

  hide() {
    this.container.classList.add('hidden');
    this.container.classList.remove('visible-flex');
  }
}
