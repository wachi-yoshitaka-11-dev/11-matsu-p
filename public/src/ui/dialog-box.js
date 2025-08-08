import { localization } from '../utils/localization.js';
import { AssetNames } from '../utils/constants.js';

export class DialogBox {
  constructor(game) {
    this.game = game;
    this.container = document.createElement('div');
    this.container.id = 'dialog-box';
    this.container.classList.add('hidden');

    this.messageElement = document.createElement('p');
    this.container.appendChild(this.messageElement);

    this.closeButton = document.createElement('button');
    this.closeButton.textContent = localization.getText('dialog.close');
    this.closeButton.addEventListener('click', () => this.handleClick());
    this.container.appendChild(this.closeButton);

    document.body.appendChild(this.container);

    this.typewriterSpeed = 50; // milliseconds per character
    this.currentTypewriterTimeout = null;
    this.isTypewriting = false;
    this.fullMessage = '';
    this.talkSound = null;
  }

  updateTexts() {
    this.closeButton.textContent = localization.getText('dialog.close');
  }

  show(message) {
    this.stopTypewriter();

    const formattedMessage = message.replace(/\n/g, '<br>');

    this.container.classList.remove('hidden');
    this.container.classList.add('visible-flex');
    this.game.togglePause();
    this.game.setPauseMenuVisibility(false);

    this.startTypewriter(formattedMessage);
  }

  hide() {
    this.stopTypewriter();
    this.container.classList.add('hidden');
    this.container.classList.remove('visible-flex');

    this.game.togglePause();
    this.game.setPauseMenuVisibility(false);
    this.game.inputController.reevaluateKeyStates();
  }

  startTypewriter(fullMessage) {
    this.fullMessage = fullMessage;
    this.isTypewriting = true;
    this.messageElement.innerHTML = '';

    this.startTalkSound();

    let currentIndex = 0;
    const characters = this.parseHTMLString(fullMessage);

    const typeNextCharacter = () => {
      if (currentIndex < characters.length && this.isTypewriting) {
        this.messageElement.innerHTML += characters[currentIndex];
        currentIndex++;

        this.currentTypewriterTimeout = setTimeout(
          typeNextCharacter,
          this.typewriterSpeed
        );
      } else {
        this.isTypewriting = false;
        this.stopTalkSound();
      }
    };

    typeNextCharacter();
  }

  handleClick() {
    if (this.isTypewriting) {
      this.stopTypewriter();
      this.messageElement.innerHTML = this.fullMessage;
      this.stopTalkSound();
    } else {
      this.hide();
    }
  }

  stopTypewriter() {
    this.isTypewriting = false;
    if (this.currentTypewriterTimeout) {
      clearTimeout(this.currentTypewriterTimeout);
      this.currentTypewriterTimeout = null;
    }
    this.stopTalkSound();
  }

  parseHTMLString(htmlString) {
    // Note: This parser only handles <br> tags. Other HTML tags will be displayed as text.
    const characters = [];
    let i = 0;

    while (i < htmlString.length) {
      if (htmlString.substring(i, i + 4) === '<br>') {
        characters.push('<br>');
        i += 4;
      } else {
        characters.push(htmlString[i]);
        i++;
      }
    }

    return characters;
  }

  startTalkSound() {
    this.talkSound = this.game.createAudio(AssetNames.SFX_TALK, {
      volume: 0.7,
      loop: true,
    });

    if (this.talkSound) {
      this.talkSound.play();
    }
  }

  stopTalkSound() {
    if (this.talkSound && this.talkSound.isPlaying) {
      this.talkSound.stop();
      this.talkSound = null;
    }
  }
}
