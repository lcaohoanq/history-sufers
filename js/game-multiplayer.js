import { WorldMap } from '../scripts/maps.js';
import { MultiplayerStrategy } from '../scripts/network-strategy.js';
import { updateSoundButtonUI } from '../scripts/utils.js';

/**
 * HISTORY SURFERS - MULTIPLAYER MODE
 */

var networkManager = null;

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

  // Check if network manager is available
  if (typeof window.networkManager === 'undefined') {
    console.error('Network manager not found. Loading single player mode instead.');
    showNotification('Network unavailable. Please refresh the page.', 'error');
    return;
  }

  networkManager = window.networkManager;

  // Setup multiplayer event handlers FIRST
  setupMultiplayerEventHandlers();

  // Check if already in multiplayer session
  if (networkManager.isInMultiplayer()) {
    console.log('Already in multiplayer session, starting game...');
    startMultiplayerGame();
  } else {
    console.log('Not in session yet, waiting for room join...');
    // Game will start when 'raceStart' event fires
  }

  // Cleanup on page unload
  window.addEventListener('beforeunload', function () {
    if (window.currentWorld && typeof window.currentWorld.cleanup === 'function') {
      window.currentWorld.cleanup();
    }
    if (networkManager) {
      networkManager.leaveRoom();
    }
  });
});

/**
 * Setup multiplayer event handlers
 */
function setupMultiplayerEventHandlers() {
  // Listen for room joined event
  networkManager.on('roomJoined', function (data) {
    console.log('✅ Joined room:', data.roomId);
    showNotification('Joined room: ' + data.roomId, 'success');
  });

  // Listen for room created event
  networkManager.on('roomCreated', function (data) {
    console.log('✅ Created room:', data.roomId);
    showNotification('Room created: ' + data.roomId, 'success');
  });

  // Listen for player joined
  networkManager.on('playerJoined', function (data) {
    console.log('👤 Player joined:', data.playerName);
    showNotification(data.playerName + ' joined the room', 'info');
  });

  // Listen for player left
  networkManager.on('playerLeft', function (data) {
    console.log('👋 Player left:', data.playerId);
    showNotification('A player left the room', 'warning');
  });

  // Listen for countdown
  networkManager.on('raceCountdown', function (data) {
    console.log('⏱️ Countdown:', data.countdown);
    displayCountdown(data.countdown);
  });

  // 🔥 QUAN TRỌNG: Listen for race start
  networkManager.on('raceStart', function (data) {
    console.log('🏁 Race starting with players:', data.players);

    // Hide game panel
    if (typeof window.hideGamePanel === 'function') {
      window.hideGamePanel();
    } else {
      var panel = document.getElementById('gamePanel');
      if (panel) panel.style.display = 'none';
    }

    // Hide countdown
    var countdownElement = document.getElementById('countdown');
    if (countdownElement) {
      countdownElement.remove();
    }

    // Start the game
    startMultiplayerGame();
  });

  // Listen for race ended
  networkManager.on('raceEnded', function (data) {
    console.log('🏁 Race ended:', data.rankings);
  });

  // Listen for errors
  networkManager.on('error', function (data) {
    console.error('❌ Network error:', data.message);
    showNotification('Error: ' + data.message, 'error');
  });

  // Listen for disconnection
  networkManager.on('disconnected', function () {
    console.log('🔌 Disconnected from server');
    showNotification('Disconnected from server', 'error');
    setTimeout(function () {
      window.location.href = '/'; // Redirect to home
    }, 2000);
  });
}

/**
 * Display countdown
 */
function displayCountdown(count) {
  var countdownElement = document.getElementById('countdown');
  if (!countdownElement) {
    countdownElement = document.createElement('div');
    countdownElement.id = 'countdown';
    countdownElement.style.cssText =
      'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); ' +
      'font-size: 120px; font-weight: bold; color: white; ' +
      'text-shadow: 3px 3px 6px rgba(0,0,0,0.5); z-index: 1000;';
    document.body.appendChild(countdownElement);
  }

  if (count === 0) {
    countdownElement.innerHTML = 'GO!';
  } else {
    countdownElement.innerHTML = count;
  }
}

/**
 * Start the multiplayer game with network strategy
 */
function startMultiplayerGame() {
  console.log('🎮 Starting multiplayer game...');

  // Prevent multiple game instances
  if (window.currentWorld) {
    console.warn('Game already running, skipping...');
    return;
  }

  // Create multiplayer strategy
  const networkStrategy = new MultiplayerStrategy(networkManager);

  // Create world with multiplayer strategy
  const world = new WorldMap(networkStrategy);

  // Store reference globally
  window.currentWorld = world;

  console.log('✅ Multiplayer game started successfully');
}

/**
 * Show notification to user
 */
function showNotification(message, type = 'info') {
  // Try using the toast system if available
  if (typeof window.showToast === 'function') {
    window.showToast({
      title: type.toUpperCase(),
      message: message,
      type: type,
      duration: 3000
    });
    return;
  }

  // Fallback notification
  var notification = document.createElement('div');
  notification.style.cssText =
    'position: fixed; top: 20px; left: 50%; transform: translateX(-50%); ' +
    'background: rgba(0,0,0,0.8); color: white; padding: 15px 30px; ' +
    'border-radius: 8px; font-size: 16px; z-index: 10000; ' +
    'animation: fadeInOut 3s ease-in-out;';
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(function () {
    notification.remove();
  }, 3000);

  // Add animation if not exists
  if (!document.getElementById('notification-animation')) {
    var style = document.createElement('style');
    style.id = 'notification-animation';
    style.innerHTML =
      '@keyframes fadeInOut { ' +
      '0% { opacity: 0; transform: translateX(-50%) translateY(-10px); } ' +
      '10% { opacity: 1; transform: translateX(-50%) translateY(0); } ' +
      '90% { opacity: 1; transform: translateX(-50%) translateY(0); } ' +
      '100% { opacity: 0; transform: translateX(-50%) translateY(-10px); } ' +
      '}';
    document.head.appendChild(style);
  }
}
