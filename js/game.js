import { WorldMap } from '../scripts/maps.js';
import { updateSoundButtonUI } from '../scripts/utils.js';

// Make a new world when the page is loaded.
window.addEventListener('load', function () {
  // Initialize audio manager
  AudioManager.init();

  // Set up sound toggle button
  var soundToggleBtn = document.getElementById('sound-toggle');
  if (soundToggleBtn) {
    // Set initial state based on saved preference
    updateSoundButtonUI();

    soundToggleBtn.addEventListener('click', function () {
      var isMuted = AudioManager.toggleMute();
      updateSoundButtonUI();

      // If unmuted and game is playing, start the music
      if (!isMuted && AudioManager.isPlaying()) {
        AudioManager.play();
      }
    });
  }

  new WorldMap();
});
