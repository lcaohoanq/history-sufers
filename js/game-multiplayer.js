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
  UnityHands
} from './object.js';
import { createBox, createGroup, sinusoid, updateSoundButtonUI } from '../scripts/utils.js';
import { Character } from '../scripts/characters.js';

/**
 *
 * HISTORY SURFERS - BUFF SYSTEM EDITION
 * ----
 * Enhanced game with trust/justice/unity mechanics
 *
 */

var Colors = {
  black: 0x000000,
  brown: 0x59332e,
  yellow: 0xffff00,
  olive: 0x556b2f,
  sand: 0xc2b280
};

var deg2Rad = Math.PI / 180;
var networkManager = null;

window.addEventListener('load', function () {
  AudioManager.init();

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

  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get('mode');
  if (mode === 'multiplayer' && typeof window.networkManager !== 'undefined') {
    networkManager = window.networkManager;
  }

  new World();
});
/**
 * THE WORLD WITH BUFF SYSTEM
 */
function World() {
  var self = this;

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
  var gameSpeed = 100; // Initial speed
  var deadlySpawnChance = 0.3; // Initial 30%
  var buffSpawnChance = 0.4; // Initial 40%
  var multiLaneDeadlyChance = 0.5; // Chance for multiple deadly objects

  // ===== OBJECT POOL =====
  var objectPool = {
    gates: [],
    remnants: [],
    buffs: {}
  };

  var poolConfig = {
    maxGates: 10,
    maxRemnants: 10,
    maxBuffsPerType: 5
  };

  init();

  function init() {
    element = document.getElementById('world');

    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true
    });
    renderer.setSize(element.clientWidth, element.clientHeight);
    renderer.shadowMap.enabled = true;
    element.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    var fogDistance = 40000;
    scene.fog = new THREE.Fog(0xbadbe4, 1, fogDistance);

    camera = new THREE.PerspectiveCamera(60, element.clientWidth / element.clientHeight, 1, 120000);
    camera.position.set(0, 1500, -2000);
    camera.lookAt(new THREE.Vector3(0, 600, -5000));
    window.camera = camera;

    window.addEventListener('resize', handleWindowResize, false);

    light = new THREE.HemisphereLight(0xffffff, 0xffffff, 1);
    scene.add(light);

    character = new Character();
    scene.add(character.element);

    var ground = createBox(3000, 20, 120000, Colors.sand, 0, -400, -60000);
    scene.add(ground);

    objects = [];

    // Tạo vài hàng đầu
    for (var i = 10; i < 40; i++) {
      createRowOfObjects(i * -3000);
    }

    gameOver = false;
    paused = true;

    if (networkManager && networkManager.isInMultiplayer()) {
      setupMultiplayer();
      paused = true;
    }

    var left = 37,
      up = 38,
      right = 39,
      p = 80;
    keysAllowed = {};

    document.addEventListener('keydown', function (e) {
      if (!gameOver) {
        var key = e.keyCode;
        if (keysAllowed[key] === false) return;
        keysAllowed[key] = false;

        if (paused && !collisionsDetected() && key > 18) {
          paused = false;
          character.onUnpause();

          // Hide the entire game panel
          if (typeof window.hideGamePanel === 'function') {
            window.hideGamePanel();
          } else {
            // Fallback if function doesn't exist
            var panel = document.getElementById('gamePanel');
            if (panel) panel.style.display = 'none';
          }

          AudioManager.play();
        } else {
          if (key == p) {
            paused = true;
            character.onPause();

            // Show game panel when paused
            if (typeof window.showGamePanel === 'function') {
              window.showGamePanel();
            } else {
              var panel = document.getElementById('gamePanel');
              if (panel) panel.style.display = 'block';
            }

            document.getElementById('variable-content').style.visibility = 'visible';
            document.getElementById('variable-content').innerHTML =
              'Game is paused. Press any key to resume.';
            AudioManager.pause();
          }
          if (key == up && !paused) character.onUpKeyPressed();
          if (key == left && !paused) character.onLeftKeyPressed();
          if (key == right && !paused) character.onRightKeyPressed();
        }
      }
    });

    document.addEventListener('keyup', function (e) {
      keysAllowed[e.keyCode] = true;
    });

    document.addEventListener('focus', function (e) {
      keysAllowed = {};
    });

    score = 0;
    difficulty = 0;
    document.getElementById('score').innerHTML = score;

    loop();
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
      'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.8); color: white; padding: 20px 40px; border-radius: 10px; font-size: 18px; z-index: 1000; animation: fadeInOut 2s;';

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

    // Show game panel
    if (typeof window.showGamePanel === 'function') {
      window.showGamePanel();
    } else {
      var panel = document.getElementById('gamePanel');
      if (panel) panel.style.display = 'block';
    }

    if (isMultiplayer && networkManager) {
      networkManager.sendPlayerFinished(score);
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
   * Setup multiplayer (unchanged)
   */
  function setupMultiplayer() {
    isMultiplayer = true;
    networkManager.on('opponentUpdate', function (data) {
      updateOpponent(data.playerId, data.data);
    });
    networkManager.on('playerJoined', function (data) {
      console.log('Player joined:', data);
    });
    networkManager.on('playerLeft', function (data) {
      removeOpponent(data.playerId);
    });
    networkManager.on('raceStart', function (data) {
      console.log('Race started!');
      paused = false;
      character.onUnpause();
      AudioManager.play();
      data.players.forEach(function (player) {
        if (player.id !== networkManager.playerId) {
          addOpponent(player);
        }
      });
    });
    networkManager.on('raceEnded', function (data) {
      AudioManager.stop();
      displayRaceResults(data.rankings);
    });
    networkManager.on('raceCountdown', function (data) {
      displayCountdown(data.countdown);
    });
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
      opponent.element.position.set(data.position.x, data.position.y, data.position.z);
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
        'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 120px; font-weight: bold; color: white; text-shadow: 3px 3px 6px rgba(0,0,0,0.5); z-index: 1000;';
      document.body.appendChild(countdownElement);
    }
    countdownElement.innerHTML = count;
  }

  function displayRaceResults(rankings) {
    var resultsHtml = '<h2>Race Results</h2><table>';
    rankings.forEach(function (rank) {
      resultsHtml +=
        '<tr><td>' +
        rank.rank +
        '</td><td>' +
        rank.playerName +
        '</td><td>' +
        rank.score +
        '</td></tr>';
    });
    resultsHtml += '</table>';
    document.getElementById('variable-content').innerHTML = resultsHtml;
    document.getElementById('variable-content').style.visibility = 'visible';
  }

  /**
   * MAIN ANIMATION LOOP
   */
  function loop() {
    if (!paused) {

      // Tăng tốc theo mốc điểm
      if (score > 25000) {
        gameSpeed = 150;
        minRowsBetweenDeadly = 3;
        deadlySpawnChance = 0.6;
      }
      if (score > 50000) {
        gameSpeed = 200;
        minRowsBetweenDeadly = 2;
        deadlySpawnChance = 0.75;
        multiLaneDeadlyChance = 0.7;
      }
      if (score > 100000) {
        gameSpeed = 250;
        minRowsBetweenDeadly = 1;
        deadlySpawnChance = 0.85;
        multiLaneDeadlyChance = 0.9;
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

      // Send multiplayer updates
      if (isMultiplayer && networkManager) {
        var currentTime = Date.now();
        if (currentTime - lastUpdateTime > updateInterval) {
          networkManager.sendPlayerUpdate({
            position: {
              x: character.element.position.x,
              y: character.element.position.y,
              z: character.element.position.z
            },
            lane: character.currentLane,
            isJumping: character.isJumping,
            score: score
          });
          lastUpdateTime = currentTime;
        }
      }

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

              score += 1000;
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

    // ===== DEADLY PATTERN =====
    var shouldSpawnDeadly = rowsSinceDeadly >= minRowsBetweenDeadly && Math.random() < deadlySpawnChance;

    if (shouldSpawnDeadly) {
      var patternType = Math.random();

      if (patternType < 0.4) {
        spawnSingleGate(position);
      }
      else if (patternType < 0.7) {
        for (let i = 0; i < 3; i++) {
          spawnSingleGate(position - i * 1500);
        }
      }
      else if (patternType < 0.9) {
        spawnSingleGate(position);
        spawnHammerCoinPattern(position - 1000);
      }
      else {
        spawnTwoLaneBlock(position);
      }

      lastDeadlySpawn = rowCounter;
      return;
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
      var gate = new ColonialGate(lanes[i] * 800, -300, zPos, 30);
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
      var gate = new ColonialGate(lanes[i] * 800, -300, zPos, 30);
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

  function collisionsDetected() {
    return checkCollisions().length > 0 || checkDeadlyCollisions();
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
}
