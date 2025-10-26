/**
 * AUDIO MANAGER
 *
 * Manages background music and sound effects for the game.
 * Handles play, pause, mute, and volume control.
 */

var AudioManager = (function () {
  'use strict';

  var audio = null;
  var isMuted = false;
  var isInitialized = false;

  /**
   * Initialize the audio system with the theme music
   */
  function init() {
    if (isInitialized) return;

    audio = new Audio('sounds/theme.mp3');
    audio.loop = true;
    audio.volume = 0.5; // Set default volume to 50%

    // Try to preload the audio
    audio.preload = 'auto';

    // Check localStorage for saved mute preference
    var savedMuteState = localStorage.getItem('gameAudioMuted');
    if (savedMuteState === 'true') {
      isMuted = true;
      audio.muted = true;
    }

    isInitialized = true;
    console.log('Audio Manager initialized');
  }

  /**
   * Play the background music
   */
  function play() {
    if (!isInitialized) init();

    if (audio && !isMuted) {
      // Use a promise to handle autoplay restrictions
      var playPromise = audio.play();

      if (playPromise !== undefined) {
        playPromise
          .then(function () {
            console.log('Background music started playing');
          })
          .catch(function (error) {
            console.warn('Autoplay prevented. User interaction required:', error);
          });
      }
    }
  }

  /**
   * Pause the background music
   */
  function pause() {
    if (audio) {
      audio.pause();
    }
  }

  /**
   * Stop the music and reset to beginning
   */
  function stop() {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }

  /**
   * Toggle mute on/off
   */
  function toggleMute() {
    if (!isInitialized) init();

    isMuted = !isMuted;
    if (audio) {
      audio.muted = isMuted;

      // If unmuting and audio wasn't playing, start it
      if (!isMuted && audio.paused) {
        play();
      }
    }

    // Save preference to localStorage
    localStorage.setItem('gameAudioMuted', isMuted.toString());

    return isMuted;
  }

  /**
   * Check if audio is currently muted
   */
  function getMuteState() {
    return isMuted;
  }

  /**
   * Set volume (0.0 to 1.0)
   */
  function setVolume(volume) {
    if (!isInitialized) init();

    if (audio) {
      audio.volume = Math.max(0, Math.min(1, volume));
    }
  }

  /**
   * Get current volume
   */
  function getVolume() {
    return audio ? audio.volume : 0.5;
  }

  /**
   * Check if audio is currently playing
   */
  function isPlaying() {
    return audio ? !audio.paused : false;
  }

  function playSoundEffect(src, volume = 1.0) {
    if (isMuted) return;

    try {
      var soundEffect = new Audio(src);
      soundEffect.preload = 'auto';
      soundEffect.volume = Math.max(0, Math.min(1, volume));
      soundEffect.play().catch(function (error) {
        console.warn('Sound effect playback failed:', error);
      });
    } catch (err) {
      console.warn('Sound effect could not be played:', err);
    }
  }

  // Public API
  return {
    init: init,
    play: play,
    pause: pause,
    stop: stop,
    toggleMute: toggleMute,
    getMuteState: getMuteState,
    setVolume: setVolume,
    getVolume: getVolume,
    isPlaying: isPlaying,
    playSoundEffect: playSoundEffect
  };
})();
