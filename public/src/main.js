function createClickToStartScreen() {
  const clickContainer = document.createElement('div');
  clickContainer.id = 'click-to-start-screen';
  clickContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: #2c3e50;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    cursor: pointer;
    font-family: sans-serif;
  `;

  const clickText = document.createElement('div');
  clickText.textContent = 'タッチしてはじめる';
  clickText.style.cssText = `
    color: white;
    font-size: 2.5em;
    text-shadow: 
      -2px -2px 0 #000,
      2px -2px 0 #000,
      -2px 2px 0 #000,
      2px 2px 0 #000;
    animation: pulse 2s infinite;
  `;

  const style = document.createElement('style');
  style.textContent = `
    @keyframes pulse {
      0%, 100% { opacity: 0.8; transform: scale(1); }
      50% { opacity: 1; transform: scale(1.05); }
    }
  `;
  document.head.appendChild(style);

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

    clickContainer.style.display = 'none';
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
