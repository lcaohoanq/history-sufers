import { WorldMap } from '../scripts/maps.js';
import { SinglePlayerStrategy } from '../scripts/network-strategy.js';
import { updateSoundButtonUI } from '../scripts/utils.js';

/**
 * HISTORY SURFERS - SINGLE PLAYER MODE
 */

window.addEventListener('load', function () {
  // Initialize audio manager
  AudioManager.init();

  // Set up sound toggle button
  var soundToggleBtn = document.getElementById('sound-toggle');
  if (soundToggleBtn) {
    updateSoundButtonUI();

    soundToggleBtn.addEventListener('click', function () {
      var isMuted = AudioManager.toggleMute();
      updateSoundButtonUI();

      if (!isMuted && AudioManager.isPlaying()) {
        AudioManager.play();
      }
    });
  }

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
  });
});
