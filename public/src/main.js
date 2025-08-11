function createClickToStartScreen() {
  const clickContainer = document.createElement('div');
  clickContainer.id = 'click-to-start-screen';

  const sparklesEffect = document.createElement('div');
  sparklesEffect.id = 'sparkles-effect';
  sparklesEffect.setAttribute('aria-hidden', 'true');
  sparklesEffect.style.pointerEvents = 'none';

  const clickText = document.createElement('div');
  clickText.classList.add('click-text');
  clickText.textContent = 'タッチしてはじめる';

  clickContainer.appendChild(sparklesEffect);
  clickContainer.appendChild(clickText);
  document.body.appendChild(clickContainer);

  clickContainer.addEventListener('click', async () => {
    try {
      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
    } catch (error) {
      console.warn('AudioContext initialization failed:', error);
    }

    clickContainer.classList.add('hidden');
    clickContainer.remove();

    startGame();
  });
}

async function startGame() {
  const { Game } = await import('./core/game.js');

  const game = new Game();
  window.game = game;

  try {
    await game.init();
    game.start();
  } catch (error) {
    console.error('Failed to initialize game:', error);
  }
}

createClickToStartScreen();
