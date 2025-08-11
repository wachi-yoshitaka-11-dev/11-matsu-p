import { localization } from '../utils/localization.js';
import { AssetPaths, HTMLTags } from '../utils/constants.js';

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

    const formattedMessage = this.sanitizeMessage(message);

    this.container.classList.remove('hidden');
    this.container.classList.add('visible-flex');
    this.game.togglePause();
    this.game.setPauseMenuVisibility(false);

    this.startTypewriter(formattedMessage);
  }

  // Escape all HTML but allow intentional line breaks.
  sanitizeMessage(message) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    const escaped = message.replace(/[&<>"']/g, (ch) => map[ch]);
    return escaped.replace(/\n/g, HTMLTags.BR);
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
      // Safe because fullMessage is sanitized via sanitizeMessage()
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
    // Note: Only handles <br> tags. Other HTML is sanitized in sanitizeMessage().
    const characters = [];
    let i = 0;

    while (i < htmlString.length) {
      if (htmlString.substring(i, i + 4) === HTMLTags.BR) {
        characters.push(HTMLTags.BR);
        i += 4;
      } else {
        characters.push(htmlString[i]);
        i++;
      }
    }

    return characters;
  }

  startTalkSound() {
    this.talkSound = this.game.createAudio(AssetPaths.SFX_TALK, {
      volume: 0.7,
      loop: true,
    });

    if (this.talkSound) {
      try {
        this.talkSound.play();
      } catch (e) {
        /* noop */
      }
    }
  }

  stopTalkSound() {
    if (this.talkSound && this.talkSound.isPlaying) {
      this.talkSound.stop();
      this.talkSound = null;
    }
  }
}
