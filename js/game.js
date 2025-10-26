import { WorldMap } from '../scripts/maps.js';
import { SinglePlayerStrategy } from '../scripts/network-strategy.js';
import { updateSoundButtonUI } from '../scripts/utils.js';

/**
 * HISTORY SURFERS - SINGLE PLAYER MODE
 */

window.addEventListener('load', function () {
  // Initialize audio manager
  AudioManager.init();

  AudioManager.loadAll().then(function () {
    // nếu người chơi đã tương tác ở lobby, gọi:
    AudioManager.playIntro(); // intro sẽ loop perfectly

    // setup UI toggle
    var soundToggleBtn = document.getElementById('sound-toggle');
    if (soundToggleBtn) {
      updateSoundButtonUI(); // your function
      soundToggleBtn.addEventListener('click', function () {
        AudioManager.toggleMute();
        updateSoundButtonUI();
      });
    }
  }).catch(function (e) {
    console.error('Audio preload failed', e);
    // fallback: you may call AudioManager.playIntro() later after user gesture
  });

  // Create single player strategy
  const networkStrategy = new SinglePlayerStrategy();

  // Create world with single player strategy
  const world = new WorldMap(networkStrategy);

  // Store reference globally for cleanup
  window.currentWorld = world;

  // Cleanup on page unload
  window.addEventListener('beforeunload', function () {
    if (window.currentWorld && typeof window.currentWorld.cleanup === 'function') {
      window.currentWorld.cleanup();
    }

    // Stop all audio when leaving
    AudioManager.stop();
  });
});
