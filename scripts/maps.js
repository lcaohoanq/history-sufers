import * as THREE from 'three';
import {
  ColonialRemnant,
  CorruptedThrone,
  MisbalancedScale,
  PuppetManipulation,
  Tree
} from '../js/object.js';
import { Character } from './characters.js';
import { CAMERA_SETTINGS, DUONG_CHAY, GAME_CONSTANTS } from './constants.js';
import { KEYCODE } from './keycode.js';

let cameraModes = ['NORMAL', 'NGANG', 'LIVE', 'HARD_CORE'];
let currentCameraIndex = 0;

export function WorldMap() {
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
    obstaclePresenceProb, // Changed from treePresenceProb
    maxObstacleSize, // Changed from maxTreeSize
    fogDistance,
    gameOver;

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
    fogDistance = 40000;
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

    const background = new THREE.TextureLoader().load('../assets/road.jpg');
    scene.background = background;

    DUONG_CHAY.material.map.wrapS = THREE.RepeatWrapping;
    DUONG_CHAY.material.map.wrapT = THREE.RepeatWrapping;
    DUONG_CHAY.material.map.repeat.set(GAME_CONSTANTS.SO_LUONG_LANE, 200); // adjust to your liking

    objects = [];
    obstaclePresenceProb = 0.2;
    maxObstacleSize = 0.7;
    for (var i = 10; i < 40; i++) {
      createRowOfObstacles(i * -3000, obstaclePresenceProb, 0.5, maxObstacleSize);
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
    // difficulty = 0;
    if (objects[objects.length - 1].mesh.position.z % 3000 == 0) {
      difficulty += 1;
      var levelLength = 30;
      if (difficulty % levelLength == 0) {
        var level = difficulty / levelLength;
        switch (level) {
          case 1:
            obstaclePresenceProb = 0.35;
            maxObstacleSize = 0.8;
            break;
          case 2:
            obstaclePresenceProb = 0.35;
            maxObstacleSize = 1.2;
            break;
          case 3:
            obstaclePresenceProb = 0.5;
            maxObstacleSize = 1.2;
            break;
          case 4:
            obstaclePresenceProb = 0.5;
            maxObstacleSize = 1.5;
            break;
          case 5:
            obstaclePresenceProb = 0.5;
            maxObstacleSize = 1.5;
            break;
          case 6:
            obstaclePresenceProb = 0.55;
            maxObstacleSize = 1.5;
            break;
          default:
            obstaclePresenceProb = 0.55;
            maxObstacleSize = 1.8;
        }
      }
      if (difficulty >= 5 * levelLength && difficulty < 6 * levelLength) {
        fogDistance -= 25000 / levelLength;
      } else if (difficulty >= 8 * levelLength && difficulty < 9 * levelLength) {
        fogDistance -= 5000 / levelLength;
      }
      createRowOfObstacles(-120000, obstaclePresenceProb, 0.5, maxObstacleSize);
      // scene.fog.far = fogDistance;
    }
    document.getElementById('score').innerHTML = score;

    // Begin the rendering loop.
    loop();
  }

  /**
   * The main animation loop.
   */
  function loop() {
    // Update the game.
    if (!paused) {
      // Add more trees and increase the difficulty.
      if (objects[objects.length - 1].mesh.position.z % 3000 == 0) {
        difficulty += 1;
        var levelLength = 30;
        if (difficulty % levelLength == 0) {
          var level = difficulty / levelLength;
          switch (level) {
            case 1:
              obstaclePresenceProb = 0.35;
              maxObstacleSize = 0.5;
              break;
            case 2:
              obstaclePresenceProb = 0.35;
              maxObstacleSize = 0.85;
              break;
            case 3:
              obstaclePresenceProb = 0.5;
              maxObstacleSize = 0.85;
              break;
            case 4:
              obstaclePresenceProb = 0.5;
              maxObstacleSize = 1.1;
              break;
            case 5:
              obstaclePresenceProb = 0.5;
              maxObstacleSize = 1.1;
              break;
            case 6:
              obstaclePresenceProb = 0.55;
              maxObstacleSize = 1.1;
              break;
            default:
              obstaclePresenceProb = 0.55;
              maxObstacleSize = 1.25;
          }
        }
        if (difficulty >= 5 * levelLength && difficulty < 6 * levelLength) {
          fogDistance -= 25000 / levelLength;
        } else if (difficulty >= 8 * levelLength && difficulty < 9 * levelLength) {
          fogDistance -= 5000 / levelLength;
        }
        createRowOfObstacles(-120000, obstaclePresenceProb, 0.5, maxObstacleSize);
        // scene.fog.far = fogDistance;
      }

      // Move the trees closer to the character.
      objects.forEach(function (object) {
        object.mesh.position.z += 100;
      });

      // Remove trees that are outside of the world.
      objects = objects.filter(function (object) {
        return object.mesh.position.z < 0;
      });

      // Make the character move according to the controls.
      character.update();

      // Check for collisions between the character and objects.
      if (collisionsDetected()) {
        gameOver = true;
        paused = true;

        // Stop music on game over
        AudioManager.stop();

        document.addEventListener('keydown', function (e) {
          if (e.keyCode == 40) document.location.reload(true);
        });
        var variableContent = document.getElementById('variable-content');
        variableContent.style.visibility = 'visible';
        variableContent.innerHTML = 'Game over! Press the down arrow to try again.';
        var table = document.getElementById('ranks');
        var rankNames = [
          'Typical Engineer',
          'Couch Potato',
          'Weekend Jogger',
          'Daily Runner',
          'Local Prospect',
          'Regional Star',
          'National Champ',
          'Second Mo Farah'
        ];
        var rankIndex = Math.floor(score / 15000);

        // If applicable, display the next achievable rank.
        if (score < 124000) {
          var nextRankRow = table.insertRow(0);
          nextRankRow.insertCell(0).innerHTML =
            rankIndex <= 5
              ? ''.concat((rankIndex + 1) * 15, 'k-', (rankIndex + 2) * 15, 'k')
              : rankIndex == 6
                ? '105k-124k'
                : '124k+';
          nextRankRow.insertCell(1).innerHTML = '*Score within this range to earn the next rank*';
        }

        // Display the achieved rank.
        var achievedRankRow = table.insertRow(0);
        achievedRankRow.insertCell(0).innerHTML =
          rankIndex <= 6
            ? ''.concat(rankIndex * 15, 'k-', (rankIndex + 1) * 15, 'k').bold()
            : score < 124000
              ? '105k-124k'.bold()
              : '124k+'.bold();
        achievedRankRow.insertCell(1).innerHTML =
          rankIndex <= 6
            ? "Congrats! You're a ".concat(rankNames[rankIndex], '!').bold()
            : score < 124000
              ? "Congrats! You're a ".concat(rankNames[7], '!').bold()
              : "Congrats! You exceeded the creator's high score of 123790 and beat the game!".bold();

        // Display all ranks lower than the achieved rank.
        if (score >= 120000) {
          rankIndex = 7;
        }
        for (var i = 0; i < rankIndex; i++) {
          var row = table.insertRow(i);
          row.insertCell(0).innerHTML = ''.concat(i * 15, 'k-', (i + 1) * 15, 'k');
          row.insertCell(1).innerHTML = rankNames[i];
        }
        if (score > 124000) {
          var row = table.insertRow(7);
          row.insertCell(0).innerHTML = '105k-124k';
          row.insertCell(1).innerHTML = rankNames[7];
        }
      }

      // Update the scores.
      score += 10;
      document.getElementById('score').innerHTML = score;
    }

    // Render the page and repeat.
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

  // Replace with:
  /**
   * Creates a row of obstacles (various historical objects) at the specified position
   *
   * @param {number} position - The z-position of the row
   * @param {number} probability - Probability of spawning obstacle in each lane
   * @param {number} minScale - Minimum scale of obstacles
   * @param {number} maxScale - Maximum scale of obstacles
   */
  function createRowOfObstacles(position, probability, minScale, maxScale) {
    // Available obstacle types from object.js
    const obstacleTypes = [ColonialRemnant, CorruptedThrone, PuppetManipulation, MisbalancedScale];

    for (var lane = GAME_CONSTANTS.START_LANE; lane < GAME_CONSTANTS.END_LANE; lane++) {
      var randomNumber = Math.random();
      if (lane == -1 || lane == 0 || lane == 1) {
        if (randomNumber < probability) {
          var scale = minScale + (maxScale - minScale) * Math.random();

          // Randomly select an obstacle type
          var ObstacleType = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];

          // Create the obstacle
          var obstacle = new ObstacleType(lane * 800, -400, position, scale);
          objects.push(obstacle);
          scene.add(obstacle.mesh);
        }
      } else {
        var scale = minScale + (maxScale - minScale) * Math.random();
        console.log(`Tree scale: ${scale}`);
        var tree = new Tree(lane * 800, -400, position, scale);
        objects.push(tree);
        scene.add(tree.mesh);
      }
    }
  }

  /**
   * Returns true if and only if the character is currently colliding with
   * an object on the map.
   */
  function collisionsDetected() {
    var charMinX = character.element.position.x - 115;
    var charMaxX = character.element.position.x + 115;
    var charMinY = character.element.position.y - 310;
    var charMaxY = character.element.position.y + 320;
    var charMinZ = character.element.position.z - 40;
    var charMaxZ = character.element.position.z + 40;
    for (var i = 0; i < objects.length; i++) {
      if (objects[i].collides(charMinX, charMaxX, charMinY, charMaxY, charMinZ, charMaxZ)) {
        return true;
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
    vector.add(camera.position); // convert direction -> lookAt point
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
}
