# Audio Manager Method Fix

## 🐛 Problem

```
Failed to initialize game: TypeError: AudioManager.playLoop is not a function
```

## 🔍 Root Cause

The SPA was calling `AudioManager.playLoop()` which doesn't exist. Looking at `js/audio-manager.js`, the available methods are:

```javascript
return {
  init: init,
  loadAll: loadAll,
  playIntro: playIntro,      // ← Plays intro track (menu)
  play: play,                // ← Transitions intro -> loop (game starts)
  playGameOver: playGameOver,
  stop: stop,
  pause: pause,
  toggleMute: toggleMute,
  // ... etc
};
```

**There is no `playLoop()` method!**

## ✅ Solution

### Correct Audio Flow

1. **Menu/Lobby**: `AudioManager.playIntro()` - Plays intro track in loop
2. **Race Starts**: `AudioManager.play()` - Crossfades intro → loop
3. **Race Ends**: `AudioManager.playGameOver()` - Crossfades loop → gameover

### Fixed Code

**Before (Wrong)**:
```javascript
// ❌ playLoop() doesn't exist!
if (activeIntro && !activeIntro.paused) {
  activeIntro.addEventListener('ended', () => {
    AudioManager.playLoop(); // TypeError!
  });
} else {
  AudioManager.playLoop();
}
```

**After (Correct)**:
```javascript
// ✅ Use play() to transition intro -> loop
if (typeof AudioManager !== 'undefined') {
  const activeAudio = AudioManager._active();
  if (!activeAudio.loop) {
    // Intro is playing, transition to loop
    console.log('🎵 Transitioning from intro to loop...');
    AudioManager.play(); // Crossfades intro -> loop
  } else {
    console.log('🎵 Loop already playing');
  }
}
```

## 📋 AudioManager API Reference

| Method | Purpose | When to Use |
|--------|---------|-------------|
| `init()` | Initialize audio context | On page load |
| `loadAll()` | Preload all audio files | After init, before first play |
| `playIntro()` | Play intro (menu music) | In lobby/menu |
| `play()` | Start game (intro→loop) | When race starts |
| `playGameOver()` | Play game over music | When race ends |
| `stop()` | Stop all audio | When leaving game |
| `pause()` | Pause audio | When pausing game |
| `toggleMute()` | Mute/unmute | Sound button toggle |
| `setVolume(v)` | Set volume (0-1) | Volume slider |
| `playSoundEffect(url, vol)` | Play SFX | Coin collect, jump, etc. |

## 🎵 Complete Audio Flow for SPA

```javascript
// Page Load
window.addEventListener('load', async () => {
  AudioManager.init();
  await AudioManager.loadAll();
  // Don't auto-play yet (user gesture required)
});

// User clicks "Play Multiplayer"
function showMultiplayerOptions() {
  // Start intro music for lobby
  AudioManager.playIntro();
  // ...
}

// Race starts (via Colyseus event)
networkManager.on('raceStart', () => {
  switchView('gameView');
  setTimeout(() => {
    initMultiplayerGame(); // This calls AudioManager.play()
  }, 100);
});

// Game init (FIXED)
window.initMultiplayerGame = async function() {
  // ... create world ...

  // Audio transition
  if (typeof AudioManager !== 'undefined') {
    const activeAudio = AudioManager._active();
    if (!activeAudio.loop) {
      AudioManager.play(); // ← CORRECT METHOD
    }
  }
};

// Race ends
networkManager.on('raceEnded', (data) => {
  AudioManager.playGameOver();
  displayRaceResults(data.rankings);
});

// Return to lobby
window.returnToLobby = function() {
  AudioManager.stop(); // Stop game music
  switchView('lobbyView');
  // Optionally restart intro
  AudioManager.playIntro();
};
```

## 🔧 Key Points

1. **`AudioManager.play()`** = Start race music (crossfade intro→loop)
2. **`AudioManager.playIntro()`** = Lobby/menu music
3. **No `playLoop()` method exists** - it was a misunderstanding

## 🐛 Prevention

To avoid similar issues:
- ✅ Check `audio-manager.js` for available methods
- ✅ Use browser console to inspect: `AudioManager`
- ✅ Read inline docs in audio-manager.js
- ✅ Test audio flow before deploying

---

**Status**: ✅ Fixed

**Files Modified**:
- `multiplayer-spa.html` (line ~920-932)

**Related Docs**:
- `js/audio-manager.js` (full API implementation)
