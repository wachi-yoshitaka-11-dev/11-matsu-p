import { localization } from '../utils/localization.js';
import { AssetNames } from '../utils/constants.js';

export class DialogBox {
  constructor(game) {
    this.game = game;
    this.container = document.createElement('div');
    this.container.id = 'dialog-box';
    this.container.style.display = 'none';

    this.messageElement = document.createElement('p');
    this.container.appendChild(this.messageElement);

    this.closeButton = document.createElement('button');
    this.closeButton.textContent = localization.getText('dialog.close');
    this.closeButton.addEventListener('click', () => this.handleClick());
    this.container.appendChild(this.closeButton);

    document.body.appendChild(this.container);

    // Typewriter effect properties
    this.typewriterSpeed = 50; // milliseconds per character
    this.currentTypewriterTimeout = null;
    this.isTypewriting = false;
    this.fullMessage = ''; // Store the complete message for skip functionality
    this.talkSound = null; // Store the talk sound for loop control
  }

  updateTexts() {
    this.closeButton.textContent = localization.getText('dialog.close');
  }

  show(message) {
    // Clear any existing typewriter effect
    this.stopTypewriter();

    // Convert newline characters to <br> tags for multi-line display
    const formattedMessage = message.replace(/\n/g, '<br>');

    // Clear key states when showing dialog to prevent stuck movement
    this.game.inputController.clearKeyStates();

    // Show dialog box immediately
    this.container.style.display = 'flex';
    this.game.togglePause();
    this.game.setPauseMenuVisibility(false);

    // Start typewriter effect
    this.startTypewriter(formattedMessage);
  }

  hide() {
    this.stopTypewriter();
    this.container.style.display = 'none';

    // Clear key states when closing dialog to prevent stuck movement
    this.game.inputController.clearKeyStates();

    this.game.togglePause();
    this.game.setPauseMenuVisibility(false);
  }

  startTypewriter(fullMessage) {
    this.fullMessage = fullMessage;
    this.isTypewriting = true;
    this.messageElement.innerHTML = '';

    // Start talk sound loop
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
        // Stop talk sound when typewriting is complete
        this.stopTalkSound();
      }
    };

    typeNextCharacter();
  }

  handleClick() {
    if (this.isTypewriting) {
      // Skip typewriter effect and show full message immediately
      this.stopTypewriter();
      this.messageElement.innerHTML = this.fullMessage;
      this.stopTalkSound(); // Stop talk sound when skipping
    } else {
      // Close dialog if typewriting is complete
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
    // Simple parser to handle <br> tags properly
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
    // Use common createAudio method for standardized audio creation
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
