import { localization } from '../utils/localization.js';
import { AssetNames } from '../utils/constants.js';

const MODAL_TYPES = {
  CONTROLS: 'controls',
};

export class PauseMenu {
  constructor(game) {
    this.game = game;
    this.container = document.createElement('div');
    this.container.id = 'pause-menu';
    this.currentActiveModal = null;

    this.title = document.createElement('h1');
    this.title.textContent = localization.getText('messages.gamePaused');
    this.container.appendChild(this.title);

    this.resumeButton = document.createElement('button');
    this.resumeButton.textContent = localization.getText('ui.resume');
    this.resumeButton.addEventListener('click', () => {
      this.game.playSound(AssetNames.SFX_CLICK);
      this.game.togglePause();
      this.game.setPauseMenuVisibility(false);
      this.game.inputController.reevaluateKeyStates();
    });
    this.container.appendChild(this.resumeButton);

    this.controlsButton = document.createElement('button');
    this.controlsButton.textContent = localization.getText('ui.controls');
    this.controlsButton.addEventListener('click', () => {
      this.game.playSound(AssetNames.SFX_CLICK);
      this.showModal(MODAL_TYPES.CONTROLS);
    });
    this.container.appendChild(this.controlsButton);

    this.controlsModal = this.createControlsModal();
    this.container.appendChild(this.controlsModal);

    document.body.appendChild(this.container);
  }

  createControlsModal() {
    const modal = document.createElement('div');
    modal.id = 'controls-modal';
    modal.classList.add('hidden');

    const modalContent = document.createElement('div');
    modalContent.className = 'controls-modal-content';

    const title = document.createElement('h2');
    title.textContent = localization.getText('controls.title');
    modalContent.appendChild(title);

    const controlsList = document.createElement('div');
    controlsList.id = 'controls-list';
    modalContent.appendChild(controlsList);

    const closeButton = document.createElement('button');
    closeButton.textContent = localization.getText('dialog.close');
    closeButton.addEventListener('click', () => {
      this.game.playSound(AssetNames.SFX_CLICK);
      this.hideModal(MODAL_TYPES.CONTROLS);
    });
    modalContent.appendChild(closeButton);

    modal.appendChild(modalContent);
    return modal;
  }

  showModal(modalType) {
    switch (modalType) {
      case MODAL_TYPES.CONTROLS:
        this.controlsModal.classList.remove('hidden');
        this.controlsModal.classList.add('visible-flex');
        this.fetchAndDisplayControls();
        break;
    }
    this.currentActiveModal = modalType;
  }

  hideModal(modalType) {
    switch (modalType) {
      case MODAL_TYPES.CONTROLS:
        this.controlsModal.classList.add('hidden');
        this.controlsModal.classList.remove('visible-flex');
        break;
    }
    this.currentActiveModal = null;
  }

  hasActiveModal() {
    return this.currentActiveModal !== null;
  }

  closeCurrentModal() {
    if (this.currentActiveModal) {
      this.hideModal(this.currentActiveModal);
    }
  }

  async fetchAndDisplayControls() {
    try {
      const response = await fetch('data/documents.json');
      const documents = await response.json();
      const controls = documents.controls;
      const controlsList = document.getElementById('controls-list');
      let html = '<table>';
      for (const category of controls.categories) {
        html += `<tr><th colspan="2">${localization.getText(`controls.${category.name}`)}</th></tr>`;
        for (const action of category.actions) {
          html += `<tr><td>${localization.getText(`controls.${action.action}`)}</td><td>${localization.getText(`controls.${action.key}`)}</td></tr>`;
        }
      }
      html += '</table>';
      controlsList.innerHTML = html;
    } catch (error) {
      console.error('Error fetching controls:', error);
    }
  }

  updateTexts() {
    this.title.textContent = localization.getText('messages.gamePaused');
    this.resumeButton.textContent = localization.getText('ui.resume');
    this.controlsButton.textContent = localization.getText('ui.controls');
  }

  toggle(show) {
    if (show) {
      this.container.classList.remove('hidden');
      this.container.classList.add('visible-flex');
    } else {
      this.container.classList.add('hidden');
      this.container.classList.remove('visible-flex');
    }
  }

  dispose() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}
