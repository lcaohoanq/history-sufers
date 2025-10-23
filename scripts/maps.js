import * as THREE from 'three';
import {
  BallotBox,
  BribeEnvelope,
  ColonialGate,
  ColonialRemnant,
  CorruptedThrone,
  HammerAndSickle,
  MisbalancedScale,
  PuppetManipulation,
  ReformGears,
  RuleOfLawState,
  Tree,
  UnityHands
} from '../js/object.js';
import { Character } from './characters.js';
import { CAMERA_SETTINGS, DUONG_CHAY, GAME_CONSTANTS } from './constants.js';
import { KEYCODE } from './keycode.js';
import { SinglePlayerStrategy, MultiplayerStrategy } from './network-strategy.js';

let cameraModes = ['NORMAL', 'NGANG', 'LIVE', 'HARD_CORE'];
let currentCameraIndex = 0;

export function WorldMap(networkStrategy = null) {
  // Explicit binding of this even in changing contexts.
  var self = this;

  // Scoped variables in this world.
  var element,
    scene,
    camera,
    character,
    renderer,
    light,
    objects,
    paused,
    keysAllowed,
    score,
    difficulty,
    gameOver;

  // ===== BUFF STATS =====
  var playerStats = {
    trust: 50,
    justice: 50,
    unity: 50
  };

  // Multiplayer variables
  var isMultiplayer = false;
  var opponents = new Map();
  var lastUpdateTime = 0;
  var updateInterval = 50;

  // ===== SPAWN CONTROL =====
  var rowCounter = 0;
  var lastDeadlySpawn = 0;
  var lastBuffSpawn = 0;
  var minRowsBetweenDeadly = 5;
  var minRowsBetweenBuff = 3;
  var lastSafeLane = 0;

  // ===== DIFFICULTY SCALING =====
  var gameSpeed = 75; // Initial speed
  var deadlySpawnChance = 0.3; // Initial 30%
  var buffSpawnChance = 0.4; // Initial 40%
  var multiLaneDeadlyChance = 0.5; // Chance for multiple deadly objects
  var minScale = 0.6; // Minimum scale for tree spawning
  var maxScale = 1.2; // Maximum scale for tree spawning

  // Use strategy pattern for network
  var network = networkStrategy || new SinglePlayerStrategy();
  var opponents = new Map();

  // Initialize the world.
  init();

  /**
   * Builds the renderer, scene, lights, camera, and the character,
   * then begins the rendering loop.
   */
  function init() {
    // Locate where the world is to be located on the screen.
    element = document.getElementById('world');

    // Initialize the renderer.
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true
    });
    renderer.setSize(element.clientWidth, element.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    element.appendChild(renderer.domElement);

    // Initialize the scene.
    scene = new THREE.Scene();
    // fogDistance = 40000;
    // scene.fog = new THREE.Fog(0xbadbe4, 1, fogDistance);

    // Initialize the camera with field of view, aspect ratio,
    // near plane, and far plane.
    camera = new THREE.PerspectiveCamera(60, element.clientWidth / element.clientHeight, 1, 120000);
    // Initial camera position
    camera.position.set(CAMERA_SETTINGS.NGANG.x, CAMERA_SETTINGS.NGANG.y, CAMERA_SETTINGS.NGANG.z);
    camera.lookAt(new THREE.Vector3(0, 600, -5000));

    // After 2s, transition back to NORMAL
    setTimeout(() => {
      setCameraPosition(CAMERA_SETTINGS.NORMAL, 1500);
    }, 2000);
    window.camera = camera;

    // Set up resizing capabilities.
    window.addEventListener('resize', handleWindowResize, false);

    // Initialize the lights.
    light = new THREE.HemisphereLight(0xffffff, 0xffffff, 1);
    scene.add(light);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    // Initialize the character and add it to the scene.
    character = new Character();
    scene.add(character.element);

    scene.add(DUONG_CHAY);

    // const background = new THREE.TextureLoader().load('../assets/road.jpg');
    // scene.background = background;

    DUONG_CHAY.material.map.wrapS = THREE.RepeatWrapping;
    DUONG_CHAY.material.map.wrapT = THREE.RepeatWrapping;
    DUONG_CHAY.material.map.repeat.set(GAME_CONSTANTS.SO_LUONG_LANE, 200); // adjust to your liking

    objects = [];
    for (var i = 10; i < 40; i++) {
      createRowOfObjects(i * -3000);
    }

    // The game is paused to begin with and the game is not over.
    gameOver = false;
    paused = true;

    keysAllowed = {};
    document.addEventListener('keydown', function (e) {
      if (!gameOver) {
        var key = e.keyCode;
        if (keysAllowed[key] === false) return;
        keysAllowed[key] = false;



        if (paused && !collisionsDetected() && key > 18) {
          paused = false;
          character.onUnpause();
          document.getElementById('variable-content').style.visibility = 'hidden';
          // document.getElementById('controls').style.display = 'none';

          const panel = document.getElementById('gamePanel');
          if (panel) {
            panel.style.display = 'none';
          }

          // Start playing background music when game starts
          AudioManager.play();
        } else {
          if (key == KEYCODE.ESC) {
            paused = true;
            character.onPause();
            document.getElementById('variable-content').style.visibility = 'visible';
            document.getElementById('variable-content').innerHTML =
              'Game is paused. Press any key to resume.';

            // Pause music when game is paused
            AudioManager.pause();
          }
          if (key == KEYCODE.UP && !paused) {
            character.onUpKeyPressed();
          }
          if (key == KEYCODE.LEFT && !paused) {
            character.onLeftKeyPressed();
          }
          if (key == KEYCODE.RIGHT && !paused) {
            character.onRightKeyPressed();
          }
          if (key === KEYCODE.V && !paused) {
            // if (camera.position.x === CAMERA_SETTINGS.NORMAL.x) {
            //   setCameraPosition(CAMERA_SETTINGS.NGANG);
            // } else {
            //   setCameraPosition(CAMERA_SETTINGS.NORMAL);
            // }
            currentCameraIndex = (currentCameraIndex + 1) % cameraModes.length;
            const mode = cameraModes[currentCameraIndex];
            setCameraPosition(CAMERA_SETTINGS[mode], 400); // faster switch
          }

          if (key === KEYCODE.P && !paused) {
            character.nextSkin();
          }
        }
      }
    });
    document.addEventListener('keyup', function (e) {
      keysAllowed[e.keyCode] = true;
    });
    document.addEventListener('focus', function (e) {
      keysAllowed = {};
    });

    // Initialize the scores and difficulty.
    score = 0;
    difficulty = 0;
    document.getElementById('score').innerHTML = score;

    network.init();

    // Setup network callbacks nếu là multiplayer
    if (network.isMultiplayer) {
      setupMultiplayerCallbacks();
    }

    // Begin the rendering loop.
    loop();
  }

  function setupMultiplayerCallbacks() {
    // Callbacks từ network strategy
    network.onPlayerJoined = function (data) {
      addOpponent(data);
    };

    network.onPlayerLeft = function (data) {
      removeOpponent(data.playerId);
    };

    network.onOpponentUpdate = function (playerId, data) {
      updateOpponent(playerId, data);
    };

    network.onRaceStart = function (data) {
      console.log('Race started!');
      paused = false;
      character.onUnpause();
      AudioManager.play();

      // Add all existing players
      data.players.forEach(function (player) {
        if (player.id !== network.networkManager.playerId) {
          addOpponent(player);
        }
      });
    };

    network.onRaceEnded = function (data) {
      AudioManager.stop();
      displayRaceResults(data.rankings);
    };

    network.onRaceCountdown = function (data) {
      displayCountdown(data.countdown);
    };
  }

  function addOpponent(playerData) {
    if (opponents.has(playerData.id)) return;

    var opponent = new Character(playerData.colors);
    opponent.playerName = playerData.name;
    scene.add(opponent.element);
    opponents.set(playerData.id, opponent);
  }

  function updateOpponent(playerId, data) {
    var opponent = opponents.get(playerId);
    if (!opponent) return;

    if (data.position) {
      opponent.element.position.set(
        data.position.x,
        data.position.y,
        data.position.z
      );
    }
    if (data.lane !== undefined) opponent.currentLane = data.lane;
    if (data.isJumping !== undefined) opponent.isJumping = data.isJumping;
  }

  function removeOpponent(playerId) {
    var opponent = opponents.get(playerId);
    if (opponent) {
      scene.remove(opponent.element);
      opponents.delete(playerId);
    }
  }

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
    countdownElement.innerHTML = count;
  }

  function displayRaceResults(rankings) {
    var resultsHtml = '<h2>Race Results</h2><table>';
    rankings.forEach(function (rank) {
      resultsHtml += '<tr><td>' + rank.rank + '</td><td>' +
        rank.playerName + '</td><td>' + rank.score + '</td></tr>';
    });
    resultsHtml += '</table>';

    document.getElementById('variable-content').innerHTML = resultsHtml;
    document.getElementById('variable-content').style.visibility = 'visible';
  }



  /**
   * Update stat bars in UI
   */
  function updateStatsUI() {
    updateStatBar('trust', playerStats.trust);
    updateStatBar('justice', playerStats.justice);
    updateStatBar('unity', playerStats.unity);
  }

  function updateStatBar(statName, value) {
    // Use window function if available, otherwise do it directly
    if (typeof window.updateStatBar === 'function') {
      window.updateStatBar(statName, value);
      return;
    }

    // Fallback implementation
    var clampedValue = Math.max(0, Math.min(100, value));
    var valueElement = document.getElementById(statName + '-value');
    var barElement = document.getElementById(statName + '-bar');
    var containerElement = document.getElementById(statName + '-container');

    if (valueElement) {
      valueElement.textContent = Math.round(clampedValue) + '/100';
    }

    if (barElement) {
      barElement.style.width = clampedValue + '%';

      barElement.classList.remove('low', 'medium');

      if (clampedValue < 25) {
        barElement.classList.add('low');
        if (containerElement) containerElement.classList.add('critical');
      } else if (clampedValue < 50) {
        barElement.classList.add('medium');
        if (containerElement) containerElement.classList.remove('critical');
      } else {
        if (containerElement) containerElement.classList.remove('critical');
      }
    }
  }

  /**
   * Apply buffs from collected object
   */
  function applyBuffs(buffs) {
    if (!buffs) return;

    playerStats.trust += buffs.trust || 0;
    playerStats.justice += buffs.justice || 0;
    playerStats.unity += buffs.unity || 0;

    // Clamp values between 0 and 100
    playerStats.trust = Math.max(0, Math.min(100, playerStats.trust));
    playerStats.justice = Math.max(0, Math.min(100, playerStats.justice));
    playerStats.unity = Math.max(0, Math.min(100, playerStats.unity));

    updateStatsUI();

    // Show buff notification
    showBuffNotification(buffs);

    // Check for game over conditions
    checkGameOverConditions();
  }

  function showBuffNotification(buffs) {
    var notification = document.createElement('div');
    notification.style.cssText =
      'position: absolute; top: 25%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.8); color: white; padding: 20px 40px; border-radius: 10px; font-size: 18px; z-index: 1000; animation: fadeInOut 1s;';

    var messages = [];
    if (buffs.trust !== 0)
      messages.push('🤝 Niềm Tin ' + (buffs.trust > 0 ? '+' : '') + buffs.trust);
    if (buffs.justice !== 0)
      messages.push('⚖️ Công Bằng ' + (buffs.justice > 0 ? '+' : '') + buffs.justice);
    if (buffs.unity !== 0)
      messages.push('🤜🤛 Đoàn Kết ' + (buffs.unity > 0 ? '+' : '') + buffs.unity);

    if (messages.length === 0) return;

    notification.innerHTML = messages.join('<br>');
    document.body.appendChild(notification);

    setTimeout(function () {
      notification.remove();
    }, 2000);

    // Add CSS animation
    if (!document.getElementById('buff-animation-style')) {
      var style = document.createElement('style');
      style.id = 'buff-animation-style';
      style.innerHTML =
        '@keyframes fadeInOut { 0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); } 20% { opacity: 1; transform: translate(-50%, -50%) scale(1); } 80% { opacity: 1; transform: translate(-50%, -50%) scale(1); } 100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); } }';
      document.head.appendChild(style);
    }
  }

  function checkGameOverConditions() {
    if (playerStats.trust <= 0) {
      triggerGameOver('Dân nổi dậy → Chính quyền sụp đổ!', 'trust');
    } else if (playerStats.justice <= 0) {
      triggerGameOver('Tham nhũng tuyệt đối → Hệ thống vô pháp!', 'justice');
    } else if (playerStats.unity <= 0) {
      triggerGameOver('Xã hội chia rẽ → Khủng hoảng xã hội!', 'unity');
    }
  }

  function triggerGameOver(message, reason) {
    gameOver = true;
    paused = true;
    AudioManager.stop();

    // Notify network
    network.onGameOver(score);

    // Show game panel
    if (typeof window.showGamePanel === 'function') {
      window.showGamePanel();
    } else {
      var panel = document.getElementById('gamePanel');
      if (panel) panel.style.display = 'block';
    }

    document.addEventListener('keydown', function (e) {
      if (e.keyCode == 40) {
        document.location.reload(true);
      }
    });

    var variableContent = document.getElementById('variable-content');
    variableContent.style.visibility = 'visible';
    variableContent.innerHTML =
      '<h2 style="color: #F44336;">GAME OVER</h2><p style="font-size: 20px;">' +
      message +
      '</p><p>Score: ' +
      score +
      '</p><p>Press down arrow to try again.</p>';
  }

  /**
   * MAIN ANIMATION LOOP
   */
  function loop() {
    if (!paused) {
      // Tăng tốc theo mốc điểm
      if (score > 25000) {
        gameSpeed = 100;
        minRowsBetweenDeadly = 6;
        deadlySpawnChance = 0.5;
      }
      if (score > 50000) {
        gameSpeed = 125;
        minRowsBetweenDeadly = 5;
        deadlySpawnChance = 0.6;
        multiLaneDeadlyChance = 0.7;
      }
      if (score > 100000) {
        gameSpeed = 150;
        minRowsBetweenDeadly = 4;
        deadlySpawnChance = 0.7;
        multiLaneDeadlyChance = 0.7;
      }

      // Spawn đường mới
      if (objects.length > 0 && objects[objects.length - 1].mesh.position.z > -80000) {
        difficulty += 1;
        createRowOfObjects(objects[objects.length - 1].mesh.position.z - 3000);
      }

      // Di chuyển object theo tốc độ gameSpeed
      var objectsToUpdate = objects.length;
      for (var i = 0; i < objectsToUpdate; i++) {
        var object = objects[i];
        if (object && object.mesh) {
          object.mesh.position.z += gameSpeed;
          if (typeof object.update === 'function') {
            object.update();
          }
        }
      }

      DUONG_CHAY.material.map.offset.y += GAME_CONSTANTS.TOC_DO_LUOT_DAT;

      // Xóa object khi ra khỏi màn
      objects = objects.filter(function (object) {
        if (object.mesh.position.z >= 0) {
          disposeObject(object);
          return false;
        }
        return true;
      });

      // Update nhân vật
      character.update();

      // Send network updates via strategy
      network.onGameLoop({
        position: {
          x: character.element.position.x,
          y: character.element.position.y,
          z: character.element.position.z
        },
        lane: character.currentLane,
        isJumping: character.isJumping,
        score: score
      });

      // Check deadly collisions
      if (!gameOver && checkDeadlyCollisions()) {
        triggerGameOver('Va chạm với chướng ngại vật!', 'collision');
      }

      // Check collectible collisions
      if (!gameOver) {
        var collidedObjects = checkCollisions();
        if (collidedObjects.length > 0) {
          collidedObjects.forEach(function (objectIndex) {
            var object = objects[objectIndex];
            if (object && object.buffs && !object.isCollected) {
              object.isCollected = true;
              applyBuffs(object.buffs);

              if (typeof object.collect === 'function') {
                object.collect();
              }

              score += object.buffValue || 0;
            }
          });
        }
      }

      score += 10;
      document.getElementById('score').innerHTML = score;
    }

    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }

  /**
   * A method called when window is resized.
   */
  function handleWindowResize() {
    renderer.setSize(element.clientWidth, element.clientHeight);
    camera.aspect = element.clientWidth / element.clientHeight;
    camera.updateProjectionMatrix();
  }
  /**
   * CREATE ROW OF OBJECTS (Subway Surfer style)
   */
  function createRowOfObjects(position) {
    rowCounter++;

    var rowsSinceDeadly = rowCounter - lastDeadlySpawn;
    var rowsSinceBuff = rowCounter - lastBuffSpawn;

    for (var lane = GAME_CONSTANTS.START_LANE; lane < GAME_CONSTANTS.END_LANE; lane++) {
      if (lane == -1 || lane == 0 || lane == 1) {
        // ===== DEADLY PATTERN =====
        var shouldSpawnDeadly =
          rowsSinceDeadly >= minRowsBetweenDeadly && Math.random() < deadlySpawnChance;

        if (shouldSpawnDeadly) {
          var patternType = Math.random();

          if (patternType < 0.4) {
            spawnSingleGate(position);
          } else if (patternType < 0.7) {
            for (let i = 0; i < 3; i++) {
              spawnSingleGate(position - i * 1500);
            }
          } else if (patternType < 0.9) {
            spawnSingleGate(position);
            spawnHammerCoinPattern(position - 1000);
          } else {
            spawnTwoLaneBlock(position);
          }

          lastDeadlySpawn = rowCounter;
          return;
        }
      } else {
        var scale = minScale + (maxScale - minScale) * Math.random();
        var tree = new Tree(lane * 800, -400, position, scale);
        objects.push(tree);
        scene.add(tree.mesh);
      }
    }

    // ===== BUFF / COIN SPAWN =====
    var shouldSpawnBuff = rowsSinceBuff >= minRowsBetweenBuff && Math.random() < buffSpawnChance;

    if (shouldSpawnBuff) {
      var buffWeights = {
        hammerandsickle: 1.0,
        ruleOfLawState: 0.6,
        unityHands: 0.6,
        reformGears: 0.6,
        ballotBox: 0.6,
        bribeEnvelope: 0.6,
        corruptedThrone: 0.6,
        puppetManipulation: 0.6,
        misbalancedScale: 0.6
      };

      var objectType = weightedRandomObstacle(buffWeights);

      if (objectType === 'hammerandsickle') {
        spawnHammerCoinPattern(position);
        lastBuffSpawn = rowCounter;
        return;
      }

      var lane = [-1, 0, 1][Math.floor(Math.random() * 3)];
      var scale = 0.8 + Math.random() * 0.4;
      var buffObject;

      switch (objectType) {
        case 'ruleOfLawState':
          buffObject = new RuleOfLawState(lane * 800, 0, position, scale);
          break;
        case 'unityHands':
          buffObject = new UnityHands(lane * 800, 0, position, scale);
          break;
        case 'reformGears':
          buffObject = new ReformGears(lane * 800, 0, position, scale);
          break;
        case 'ballotBox':
          buffObject = new BallotBox(lane * 800, 0, position, scale);
          break;
        case 'bribeEnvelope':
          buffObject = new BribeEnvelope(lane * 800, 0, position, scale);
          break;
        case 'corruptedThrone':
          buffObject = new CorruptedThrone(lane * 800, 0, position, scale);
          break;
        case 'puppetManipulation':
          buffObject = new PuppetManipulation(lane * 800, 0, position, scale);
          break;
        case 'misbalancedScale':
          buffObject = new MisbalancedScale(lane * 800, 0, position, scale);
          break;
      }

      if (buffObject) {
        buffObject.mesh.userData = { buff: true };
        objects.push(buffObject);
        scene.add(buffObject.mesh);
        lastBuffSpawn = rowCounter;
      }
    }
  }

  function spawnHammerCoinPattern(zPos) {
    var pattern = Math.random() < 0.5 ? 'line' : 'zigzag';
    var coinCount = 7; // số lượng hammer liên tiếp
    var lanes = [-1, 0, 1];
    var startLane = lanes[Math.floor(Math.random() * 3)];

    for (let i = 0; i < coinCount; i++) {
      var lane;

      if (pattern === 'line') {
        lane = startLane;
      } else {
        lane = lanes[i % 3];
      }

      var coin = new HammerAndSickle(lane * 800, 0, zPos - i * 750, 1);
      coin.mesh.userData = { buff: true };

      objects.push(coin);
      scene.add(coin.mesh);
    }
  }

  function spawnSingleGate(zPos) {
    var gateCount = Math.random() < 0.5 ? 1 : 2;
    var lanes = [-1, 0, 1];
    shuffleArray(lanes);

    for (var i = 0; i < gateCount; i++) {
      var gate = new ColonialGate(lanes[i] * 800, -300, zPos, 45);
      gate.mesh.userData = { deadly: true };
      objects.push(gate);
      scene.add(gate.mesh);
    }
  }

  function spawnTwoLaneBlock(zPos) {
    var lanes = [-1, 0, 1];
    shuffleArray(lanes);

    // lanes[0] là lane an toàn (không đặt vật cản)
    lastSafeLane = lanes[0];

    for (var i = 1; i < 3; i++) {
      var gate = new ColonialGate(lanes[i] * 800, -300, zPos, 45);
      gate.mesh.userData = { deadly: true };
      objects.push(gate);
      scene.add(gate.mesh);
    }
  }

  function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }
  }

  function weightedRandomObstacle(weights) {
    var totalWeight = 0;
    for (var type in weights) {
      totalWeight += weights[type];
    }
    var random = Math.random() * totalWeight;
    var weightSum = 0;
    for (var type in weights) {
      weightSum += weights[type];
      if (random <= weightSum) {
        return type;
      }
    }
    return 'hammerandsickle';
  }

  /**
   * Returns true if and only if the character is currently colliding with
   * an object on the map.
   */
  function collisionsDetected() {
    return checkCollisions().length > 0 || checkDeadlyCollisions();
  }

  function checkCollisions() {
    if (!character || !character.element || objects.length === 0) return [];

    var charMinX = character.element.position.x - 115;
    var charMaxX = character.element.position.x + 115;
    var charMinY = character.element.position.y - 310;
    var charMaxY = character.element.position.y + 320;
    var charMinZ = character.element.position.z - 40;
    var charMaxZ = character.element.position.z + 40;
    var collidedObjects = [];

    for (var i = 0; i < objects.length; i++) {
      if (objects[i] && typeof objects[i].collides === 'function') {
        // Only check non-deadly objects with buffs
        if (objects[i].buffs && !objects[i].mesh.userData.deadly) {
          if (
            objects[i].collides(charMinX, charMaxX, charMinY, charMaxY, charMinZ, charMaxZ) &&
            !objects[i].isCollected
          ) {
            collidedObjects.push(i);
          }
        }
      }
    }
    return collidedObjects;
  }

  function checkDeadlyCollisions() {
    if (!character || !character.element || objects.length === 0) return false;

    var charMinX = character.element.position.x - 115;
    var charMaxX = character.element.position.x + 115;
    var charMinY = character.element.position.y - 310;
    var charMaxY = character.element.position.y + 320;
    var charMinZ = character.element.position.z - 40;
    var charMaxZ = character.element.position.z + 40;

    for (var i = 0; i < objects.length; i++) {
      if (objects[i] && typeof objects[i].collides === 'function') {
        // Only check deadly objects
        if (objects[i].mesh.userData.deadly) {
          if (objects[i].collides(charMinX, charMaxX, charMinY, charMaxY, charMinZ, charMaxZ)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  function setCameraPosition(target, duration = 1000) {
    const start = {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z
    };

    const lookAtTarget = target.lookAt || { x: 0, y: 600, z: -5000 };
    const vector = new THREE.Vector3();
    camera.getWorldDirection(vector); // hướng nhìn hiện tại
    vector.add(camera.position); //
    const startLookAt = vector;

    const startTime = performance.now();

    function animateCamera(time) {
      const elapsed = time - startTime;
      const t = Math.min(elapsed / duration, 1);

      // Smoothstep easing (for smoother motion)
      const smoothT = t * t * (3 - 2 * t);

      // Interpolate position
      camera.position.x = THREE.MathUtils.lerp(start.x, target.x, smoothT);
      camera.position.y = THREE.MathUtils.lerp(start.y, target.y, smoothT);
      camera.position.z = THREE.MathUtils.lerp(start.z, target.z, smoothT);

      // Interpolate lookAt
      const lx = THREE.MathUtils.lerp(startLookAt.x, lookAtTarget.x, smoothT);
      const ly = THREE.MathUtils.lerp(startLookAt.y, lookAtTarget.y, smoothT);
      const lz = THREE.MathUtils.lerp(startLookAt.z, lookAtTarget.z, smoothT);
      camera.lookAt(new THREE.Vector3(lx, ly, lz));

      if (t < 1) requestAnimationFrame(animateCamera);
    }

    requestAnimationFrame(animateCamera);
  }

  /**
   * Properly dispose Three.js objects to prevent memory leaks
   */
  function disposeObject(object) {
    if (!object || !object.mesh) return;

    // Remove from scene
    scene.remove(object.mesh);

    // Dispose particles if they exist
    if (object.particles && object.particles.length > 0) {
      object.particles.forEach(function (particle) {
        if (particle.geometry) particle.geometry.dispose();
        if (particle.material) particle.material.dispose();
        object.mesh.remove(particle);
      });
      object.particles = [];
    }

    // Recursively dispose all children
    function disposeNode(node) {
      if (!node) return;

      // Dispose geometry
      if (node.geometry) {
        node.geometry.dispose();
      }

      // Dispose material(s)
      if (node.material) {
        if (Array.isArray(node.material)) {
          node.material.forEach(function (mat) {
            disposeMaterial(mat);
          });
        } else {
          disposeMaterial(node.material);
        }
      }

      // Dispose children recursively
      if (node.children && node.children.length > 0) {
        for (var i = node.children.length - 1; i >= 0; i--) {
          disposeNode(node.children[i]);
          node.remove(node.children[i]);
        }
      }
    }

    function disposeMaterial(material) {
      if (!material) return;

      // Dispose textures
      if (material.map) material.map.dispose();
      if (material.lightMap) material.lightMap.dispose();
      if (material.bumpMap) material.bumpMap.dispose();
      if (material.normalMap) material.normalMap.dispose();
      if (material.specularMap) material.specularMap.dispose();
      if (material.envMap) material.envMap.dispose();
      if (material.alphaMap) material.alphaMap.dispose();
      if (material.aoMap) material.aoMap.dispose();
      if (material.displacementMap) material.displacementMap.dispose();
      if (material.emissiveMap) material.emissiveMap.dispose();
      if (material.gradientMap) material.gradientMap.dispose();
      if (material.metalnessMap) material.metalnessMap.dispose();
      if (material.roughnessMap) material.roughnessMap.dispose();

      material.dispose();
    }

    // Start disposal from the root mesh
    disposeNode(object.mesh);

    // Clear references
    object.mesh = null;
  }

  // ===== PUBLIC METHODS =====
  // Đặt tất cả public methods ở cuối, trước khi kết thúc WorldMap

  /**
   * Cleanup resources when leaving the game
   */
  self.cleanup = function () {
    // Cleanup network
    network.cleanup();

    // Cleanup opponents
    opponents.forEach(function (opponent, playerId) {
      if (opponent && opponent.element) {
        scene.remove(opponent.element);
      }
    });
    opponents.clear();

    // Cleanup all game objects
    objects.forEach(function (object) {
      disposeObject(object);
    });
    objects = [];

    // Stop audio
    if (typeof AudioManager !== 'undefined') {
      AudioManager.stop();
    }

    // Remove event listeners
    window.removeEventListener('resize', handleWindowResize);

    // Dispose renderer
    if (renderer) {
      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    }

    // Clear scene
    if (scene) {
      scene.clear();
    }

    console.log('WorldMap cleaned up');
  };

  /**
   * Pause the game
   */
  self.pause = function () {
    paused = true;
    if (character) {
      character.onPause();
    }
    AudioManager.pause();
  };

  /**
   * Resume the game
   */
  self.resume = function () {
    if (!gameOver) {
      paused = false;
      if (character) {
        character.onUnpause();
      }
      AudioManager.play();
    }
  };

  /**
   * Get current game state
   */
  self.getState = function () {
    return {
      score: score,
      paused: paused,
      gameOver: gameOver,
      playerStats: playerStats,
      isMultiplayer: network.isMultiplayer,
      opponentCount: opponents.size
    };
  };

  // Return self for chaining if needed
  return self;
}
