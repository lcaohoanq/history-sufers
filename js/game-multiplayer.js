/**
 *
 * BOXY RUN - MULTIPLAYER EDITION
 * ----
 * Enhanced Temple-Run-esque game with multiplayer racing support
 *
 */

/**
 * Constants used in this game.
 */
var Colors = {
  cherry: 0xe35d6a,
  blue: 0x1560bd,
  white: 0xd8d0d1,
  black: 0x000000,
  brown: 0x59332e,
  peach: 0xffdab9,
  yellow: 0xffff00,
  olive: 0x556b2f,
  grey: 0x696969,
  sand: 0xc2b280,
  brownDark: 0x23190f,
  green: 0x669900,
};

var deg2Rad = Math.PI / 180;

// Global network manager reference
var networkManager = null;

// Make a new world when the page is loaded.
window.addEventListener("load", function () {
  // Check if in multiplayer mode
  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get("mode");

  if (mode === "multiplayer" && typeof window.networkManager !== "undefined") {
    networkManager = window.networkManager;
  }

  new World();
});

/**
 *
 * THE WORLD
 *
 * The world in which Boxy Run takes place with multiplayer support.
 *
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
    treePresenceProb,
    maxTreeSize,
    fogDistance,
    gameOver,
    collectedHammerAndSickles;

  // Multiplayer variables
  var isMultiplayer = false;
  var opponents = new Map();
  var lastUpdateTime = 0;
  var updateInterval = 50; // Send updates every 50ms

  init();

  function init() {
    element = document.getElementById("world");

    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
    });
    renderer.setSize(element.clientWidth, element.clientHeight);
    renderer.shadowMap.enabled = true;
    element.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    fogDistance = 40000;
    scene.fog = new THREE.Fog(0xbadbe4, 1, fogDistance);

    camera = new THREE.PerspectiveCamera(
      60,
      element.clientWidth / element.clientHeight,
      1,
      120000
    );
    camera.position.set(0, 1500, -2000);
    camera.lookAt(new THREE.Vector3(0, 600, -5000));
    window.camera = camera;

    window.addEventListener("resize", handleWindowResize, false);

    light = new THREE.HemisphereLight(0xffffff, 0xffffff, 1);
    scene.add(light);

    // Initialize main character
    character = new Character();
    scene.add(character.element);

    var ground = createBox(3000, 20, 120000, Colors.sand, 0, -400, -60000);
    scene.add(ground);

    objects = [];
    treePresenceProb = 0.2;
    maxTreeSize = 0.5;
    
    // Initialize obstacle weights
    window.obstacleWeights = {
      tree: 1,          // Regular tree (common in early levels)
      rock: 0.05,       // Rock (very rare in early levels)
      mushroom: 0.05,   // Mushroom (very rare in early levels)
      hammerandsickle: 0.5 // Hammer and Sickle collectible
    };
    
    for (var i = 10; i < 40; i++) {
      createRowOfTrees(i * -3000, treePresenceProb, 0.5, maxTreeSize);
    }

    gameOver = false;
    paused = true;
    collectedHammerAndSickles = 0;

    // Set up multiplayer if network manager exists
    if (networkManager && networkManager.isInMultiplayer()) {
      setupMultiplayer();
      paused = true; // In multiplayer, wait for race start
    }
    
    // Create a UI element to display collected HammerAndSickles
    var hammerSickleCounter = document.createElement('div');
    hammerSickleCounter.id = 'hammer-sickle-counter';
    hammerSickleCounter.style.cssText = 'position: absolute; top: 80px; right: 20px; font-size: 24px; color: #FFD700; text-shadow: 2px 2px 4px #000;';
    hammerSickleCounter.innerHTML = '☭ 0';
    document.body.appendChild(hammerSickleCounter);

    var left = 37;
    var up = 38;
    var right = 39;
    var p = 80;

    keysAllowed = {};
    document.addEventListener("keydown", function (e) {
      if (!gameOver) {
        var key = e.keyCode;
        if (keysAllowed[key] === false) return;
        keysAllowed[key] = false;

        if (paused && !collisionsDetected() && key > 18) {
          paused = false;
          character.onUnpause();
          document.getElementById("variable-content").style.visibility =
            "hidden";
          if (document.getElementById("controls")) {
            document.getElementById("controls").style.display = "none";
          }
        } else {
          if (key == p) {
            paused = true;
            character.onPause();
            document.getElementById("variable-content").style.visibility =
              "visible";
            document.getElementById("variable-content").innerHTML =
              "Game is paused. Press any key to resume.";
          }
          if (key == up && !paused) {
            character.onUpKeyPressed();
          }
          if (key == left && !paused) {
            character.onLeftKeyPressed();
          }
          if (key == right && !paused) {
            character.onRightKeyPressed();
          }
        }
      }
    });

    document.addEventListener("keyup", function (e) {
      keysAllowed[e.keyCode] = true;
    });

    document.addEventListener("focus", function (e) {
      keysAllowed = {};
    });

    score = 0;
    collectedHammerAndSickles = 0;
    difficulty = 0;
    document.getElementById("score").innerHTML = score;

    loop();
  }

  /**
   * Set up multiplayer networking
   */
  function setupMultiplayer() {
    isMultiplayer = true;

    // Handle opponent updates
    networkManager.on("opponentUpdate", function (data) {
      updateOpponent(data.playerId, data.data);
    });

    // Handle player joined
    networkManager.on("playerJoined", function (data) {
      console.log("Player joined:", data);
    });

    // Handle player left
    networkManager.on("playerLeft", function (data) {
      removeOpponent(data.playerId);
    });

    // Handle race start
    networkManager.on("raceStart", function (data) {
      console.log("Race started!");
      paused = false;
      character.onUnpause();

      // Initialize opponents
      data.players.forEach(function (player) {
        if (player.id !== networkManager.playerId) {
          addOpponent(player);
        }
      });
    });

    // Handle race end
    networkManager.on("raceEnded", function (data) {
      displayRaceResults(data.rankings);
    });

    // Handle countdown
    networkManager.on("raceCountdown", function (data) {
      displayCountdown(data.countdown);
    });
  }

  /**
   * Add an opponent character
   */
  function addOpponent(playerData) {
    if (opponents.has(playerData.id)) return;

    var opponent = new Character(playerData.colors);
    opponent.playerName = playerData.name;
    scene.add(opponent.element);

    opponents.set(playerData.id, opponent);
    console.log("Added opponent:", playerData.name);
  }

  /**
   * Update opponent position and state
   */
  function updateOpponent(playerId, data) {
    var opponent = opponents.get(playerId);
    if (!opponent) return;

    // Update position
    if (data.position) {
      opponent.element.position.set(
        data.position.x,
        data.position.y,
        data.position.z
      );
    }

    // Update lane
    if (data.lane !== undefined) {
      opponent.currentLane = data.lane;
    }

    // Update jumping state
    if (data.isJumping !== undefined) {
      opponent.isJumping = data.isJumping;
    }
  }

  /**
   * Remove an opponent character
   */
  function removeOpponent(playerId) {
    var opponent = opponents.get(playerId);
    if (opponent) {
      scene.remove(opponent.element);
      opponents.delete(playerId);
      console.log("Removed opponent:", playerId);
    }
  }

  /**
   * Display countdown before race
   */
  function displayCountdown(count) {
    var countdownElement = document.getElementById("countdown");
    if (!countdownElement) {
      countdownElement = document.createElement("div");
      countdownElement.id = "countdown";
      countdownElement.style.cssText =
        "position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 120px; font-weight: bold; color: white; text-shadow: 3px 3px 6px rgba(0,0,0,0.5); z-index: 1000;";
      document.body.appendChild(countdownElement);
    }

    countdownElement.innerHTML = count;

    var countdown = count;
    var interval = setInterval(function () {
      countdown--;
      if (countdown > 0) {
        countdownElement.innerHTML = countdown;
      } else {
        countdownElement.innerHTML = "GO!";
        setTimeout(function () {
          countdownElement.remove();
        }, 1000);
        clearInterval(interval);
      }
    }, 1000);
  }

  /**
   * Display race results
   */
  function displayRaceResults(rankings) {
    var resultsHtml = "<h2>Race Results</h2><table>";
    rankings.forEach(function (rank) {
      resultsHtml +=
        "<tr><td>" +
        rank.rank +
        "</td><td>" +
        rank.playerName +
        "</td><td>" +
        rank.score +
        "</td></tr>";
    });
    resultsHtml += "</table>";

    document.getElementById("variable-content").innerHTML = resultsHtml;
    document.getElementById("variable-content").style.visibility = "visible";
  }

  /**
   * The main animation loop.
   */
  function loop() {
    if (!paused) {
      // Add more trees and increase difficulty
      if (objects.length > 0 && objects[objects.length - 1].mesh.position.z % 3000 == 0) {
        difficulty += 1;
        var levelLength = 30;
        
        // Update obstacle type weights with all types
        window.obstacleWeights = {
          hammerandsickle: 0.3,  // 30% chance for HammerAndSickle
          mushroom: 0.25,        // 25% chance for mushrooms
        };
        
        if (difficulty % levelLength == 0) {
          var level = difficulty / levelLength;
          switch (level) {
            case 1:
              treePresenceProb = 0.35;
              maxTreeSize = 0.5;
              break;
            case 2:
              treePresenceProb = 0.35;
              maxTreeSize = 0.85;
              break;
            case 3:
              treePresenceProb = 0.5;
              maxTreeSize = 0.85;
              break;
            case 4:
              treePresenceProb = 0.5;
              maxTreeSize = 1.1;
              break;
            case 5:
              treePresenceProb = 0.5;
              maxTreeSize = 1.1;
              break;
            case 6:
              treePresenceProb = 0.55;
              maxTreeSize = 1.1;
              break;
            default:
              treePresenceProb = 0.55;
              maxTreeSize = 1.25;
          }
        }
        
        if (difficulty >= 5 * levelLength && difficulty < 6 * levelLength) {
          fogDistance -= 25000 / levelLength;
        } else if (
          difficulty >= 8 * levelLength &&
          difficulty < 9 * levelLength
        ) {
          fogDistance -= 5000 / levelLength;
        }
        createRowOfTrees(-120000, treePresenceProb, 0.5, maxTreeSize);
        scene.fog.far = fogDistance;
      }

      // Move trees and update collectible objects
      objects.forEach(function (object) {
        if (object && object.mesh) {
          object.mesh.position.z += 100;
          if (object.type === 'hammerandsickle' && typeof object.update === 'function') {
            object.update();
          }
        }
      });

      // Remove off-screen trees
      objects = objects.filter(function (object) {
        return object.mesh.position.z < 0;
      });

      // Update character
      character.update();

      // Send multiplayer updates
      if (isMultiplayer && networkManager) {
        var currentTime = Date.now();
        if (currentTime - lastUpdateTime > updateInterval) {
          networkManager.sendPlayerUpdate({
            position: {
              x: character.element.position.x,
              y: character.element.position.y,
              z: character.element.position.z,
            },
            lane: character.currentLane,
            isJumping: character.isJumping,
            score: score,
          });
          lastUpdateTime = currentTime;
        }
      }

      // Check deadly collisions (trees, mushrooms, rocks)
      if (!gameOver && checkDeadlyCollisions()) {
        gameOver = true;
        paused = true;
        console.log("Game over: Collision with deadly obstacle");

        // Notify server in multiplayer
        if (isMultiplayer && networkManager) {
          networkManager.sendPlayerFinished(score);
        }

        document.addEventListener("keydown", function (e) {
          if (e.keyCode == 40) {
            document.location.reload(true);
          }
        });

        var variableContent = document.getElementById("variable-content");
        variableContent.style.visibility = "visible";
        variableContent.innerHTML =
          "Game over! Press the down arrow to try again.";

        // Display score and rank
        var table = document.getElementById("ranks");
        var rankNames = [
          "Typical Engineer",
          "Couch Potato",
          "Weekend Jogger",
          "Daily Runner",
          "Local Prospect",
          "Regional Star",
          "National Champ",
          "Second Mo Farah",
        ];
        var rankIndex = Math.floor(score / 15000);

        if (score < 124000) {
          var nextRankRow = table.insertRow(0);
          nextRankRow.insertCell(0).innerHTML =
            rankIndex <= 5
              ? "".concat((rankIndex + 1) * 15, "k-", (rankIndex + 2) * 15, "k")
              : rankIndex == 6
              ? "105k-124k"
              : "124k+";
          nextRankRow.insertCell(1).innerHTML =
            "*Score within this range to earn the next rank*";
        }

        var achievedRankRow = table.insertRow(0);
        achievedRankRow.insertCell(0).innerHTML =
          rankIndex <= 6
            ? "".concat(rankIndex * 15, "k-", (rankIndex + 1) * 15, "k").bold()
            : score < 124000
            ? "105k-124k".bold()
            : "124k+".bold();
        achievedRankRow.insertCell(1).innerHTML =
          rankIndex <= 6
            ? "Congrats! You're a ".concat(rankNames[rankIndex], "!").bold()
            : score < 124000
            ? "Congrats! You're a ".concat(rankNames[7], "!").bold()
            : "Congrats! You exceeded the creator's high score of 123790 and beat the game!".bold();
      }
      
      // Check collectible collisions (HammerAndSickle)
      if (!gameOver) {
        var collidedObjects = checkCollisions();
        if (collidedObjects.length > 0) {
          // For each collided object, collect it and increase the counter
          collidedObjects.forEach(function(objectIndex) {
            var object = objects[objectIndex];
            if (object && object.type === 'hammerandsickle' && !object.isCollected) {
              // Mark as collected
              object.isCollected = true;
              
              // Increase counter
              collectedHammerAndSickles++;
              
              console.log("Collected HammerAndSickle: " + collectedHammerAndSickles);
              
              // Update the UI
              var counterElement = document.getElementById('hammer-sickle-counter');
              if (counterElement) {
                counterElement.innerHTML = '☭ ' + collectedHammerAndSickles;
              }
              
              // Play collection sound/animation
              if (typeof object.collect === 'function') {
                object.collect();
              }
              
              // Add points
              score += 1000;
            }
          });
        }
      }

      score += 10;
      document.getElementById("score").innerHTML = score;
      
      // Make sure the counter exists
      if (!document.getElementById("hammer-sickle-counter")) {
        var counterElement = document.createElement("div");
        counterElement.id = "hammer-sickle-counter";
        counterElement.style.position = "absolute";
        counterElement.style.top = "60px";
        counterElement.style.right = "20px";
        counterElement.style.color = "#fff";
        counterElement.style.fontSize = "24px";
        counterElement.innerHTML = "☭ 0";
        document.body.appendChild(counterElement);
      }
    }

    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }

  function handleWindowResize() {
    renderer.setSize(element.clientWidth, element.clientHeight);
    camera.aspect = element.clientWidth / element.clientHeight;
    camera.updateProjectionMatrix();
  }

  function createRowOfTrees(position, probability, minScale, maxScale) {
    for (var lane = -1; lane < 2; lane++) {
      var randomNumber = Math.random();
      if (randomNumber < probability) {
        var scale = minScale + (maxScale - minScale) * Math.random();
        
        // Get obstacle weights (or use default if not set)
        var weights = window.obstacleWeights || {
          tree: 1,
          rock: 0.05,
          mushroom: 0.05
        };
        
        // Choose a weighted random obstacle type
        var obstacleType = weightedRandomObstacle(weights);
        var obstacle;
        
        // Create the selected obstacle type
        switch(obstacleType) {
          case 'tree':
            obstacle = new Tree(lane * 800, -400, position, scale);
            break;
          case 'rock':
            obstacle = new Rock(lane * 800, -400, position, scale * 0.7);
            break;
          case 'mushroom':
            obstacle = new Mushroom(lane * 800, -400, position, scale * 1.3);
            break;
          case 'hammerandsickle':
            obstacle = new HammerAndSickle(lane * 800, -100, position, scale * 1.2);
            break;
          default:
            obstacle = new Tree(lane * 800, -400, position, scale);
        }
        
        
        objects.push(obstacle);
        scene.add(obstacle.mesh);
      }
    }
  }
  
  // Helper function for weighted random selection
  function weightedRandomObstacle(weights) {
    // Calculate the sum of all weights
    var totalWeight = 0;
    for (var type in weights) {
      totalWeight += weights[type];
    }
    
    // Get a random value between 0 and the total weight
    var random = Math.random() * totalWeight;
    var weightSum = 0;
    
    // Find which obstacle was selected based on weights
    for (var type in weights) {
      weightSum += weights[type];
      if (random <= weightSum) {
        return type;
      }
    }
    
    // Default to tree if something goes wrong
    return 'tree';
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
        if (
          objects[i].collides(
            charMinX,
            charMaxX,
            charMinY,
            charMaxY,
            charMinZ,
            charMaxZ
          ) && 
          (objects[i].type === 'hammerandsickle' ? !objects[i].isCollected : true)
        ) {
          collidedObjects.push(i);
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
        if (
          objects[i].collides(
            charMinX,
            charMaxX,
            charMinY,
            charMaxY,
            charMinZ,
            charMaxZ
          ) && 
          objects[i].type !== 'hammerandsickle'
        ) {
          return true;
        }
      }
    }
    return false;
  }
  
  function collisionsDetected() {
    return checkCollisions().length > 0;
  }
}

/**
 *
 * IMPORTANT OBJECTS
 *
 */

function Character(customColors) {
  var self = this;

  // Allow custom colors for multiplayer opponents
  if (customColors) {
    this.skinColor = Colors.brown;
    this.hairColor = Colors.black;
    this.shirtColor = customColors.shirt || Colors.yellow;
    this.shortsColor = customColors.shorts || Colors.olive;
  } else {
    this.skinColor = Colors.brown;
    this.hairColor = Colors.black;
    this.shirtColor = Colors.yellow;
    this.shortsColor = Colors.olive;
  }

  this.jumpDuration = 0.6;
  this.jumpHeight = 2000;

  init();

  function init() {
    self.face = createBox(100, 100, 60, self.skinColor, 0, 0, 0);
    self.hair = createBox(105, 20, 65, self.hairColor, 0, 50, 0);
    self.head = createGroup(0, 260, -25);
    self.head.add(self.face);
    self.head.add(self.hair);

    self.torso = createBox(150, 190, 40, self.shirtColor, 0, 100, 0);

    self.leftLowerArm = createLimb(20, 120, 30, self.skinColor, 0, -170, 0);
    self.leftArm = createLimb(30, 140, 40, self.skinColor, -100, 190, -10);
    self.leftArm.add(self.leftLowerArm);

    self.rightLowerArm = createLimb(20, 120, 30, self.skinColor, 0, -170, 0);
    self.rightArm = createLimb(30, 140, 40, self.skinColor, 100, 190, -10);
    self.rightArm.add(self.rightLowerArm);

    self.leftLowerLeg = createLimb(40, 200, 40, self.skinColor, 0, -200, 0);
    self.leftLeg = createLimb(50, 170, 50, self.shortsColor, -50, -10, 30);
    self.leftLeg.add(self.leftLowerLeg);

    self.rightLowerLeg = createLimb(40, 200, 40, self.skinColor, 0, -200, 0);
    self.rightLeg = createLimb(50, 170, 50, self.shortsColor, 50, -10, 30);
    self.rightLeg.add(self.rightLowerLeg);

    self.element = createGroup(0, 0, -4000);
    self.element.add(self.head);
    self.element.add(self.torso);
    self.element.add(self.leftArm);
    self.element.add(self.rightArm);
    self.element.add(self.leftLeg);
    self.element.add(self.rightLeg);

    self.isJumping = false;
    self.isSwitchingLeft = false;
    self.isSwitchingRight = false;
    self.currentLane = 0;
    self.runningStartTime = new Date() / 1000;
    self.pauseStartTime = new Date() / 1000;
    self.stepFreq = 2;
    self.queuedActions = [];
  }

  function createLimb(dx, dy, dz, color, x, y, z) {
    var limb = createGroup(x, y, z);
    var offset = -1 * (Math.max(dx, dz) / 2 + dy / 2);
    var limbBox = createBox(dx, dy, dz, color, 0, offset, 0);
    limb.add(limbBox);
    return limb;
  }

  this.update = function () {
    var currentTime = new Date() / 1000;

    if (
      !self.isJumping &&
      !self.isSwitchingLeft &&
      !self.isSwitchingRight &&
      self.queuedActions.length > 0
    ) {
      switch (self.queuedActions.shift()) {
        case "up":
          self.isJumping = true;
          self.jumpStartTime = new Date() / 1000;
          break;
        case "left":
          if (self.currentLane != -1) {
            self.isSwitchingLeft = true;
          }
          break;
        case "right":
          if (self.currentLane != 1) {
            self.isSwitchingRight = true;
          }
          break;
      }
    }

    if (self.isJumping) {
      var jumpClock = currentTime - self.jumpStartTime;
      self.element.position.y =
        self.jumpHeight *
          Math.sin((1 / self.jumpDuration) * Math.PI * jumpClock) +
        sinusoid(
          2 * self.stepFreq,
          0,
          20,
          0,
          self.jumpStartTime - self.runningStartTime
        );
      if (jumpClock > self.jumpDuration) {
        self.isJumping = false;
        self.runningStartTime += self.jumpDuration;
      }
    } else {
      var runningClock = currentTime - self.runningStartTime;
      self.element.position.y = sinusoid(
        2 * self.stepFreq,
        0,
        20,
        0,
        runningClock
      );
      self.head.rotation.x =
        sinusoid(2 * self.stepFreq, -10, -5, 0, runningClock) * deg2Rad;
      self.torso.rotation.x =
        sinusoid(2 * self.stepFreq, -10, -5, 180, runningClock) * deg2Rad;
      self.leftArm.rotation.x =
        sinusoid(self.stepFreq, -70, 50, 180, runningClock) * deg2Rad;
      self.rightArm.rotation.x =
        sinusoid(self.stepFreq, -70, 50, 0, runningClock) * deg2Rad;
      self.leftLowerArm.rotation.x =
        sinusoid(self.stepFreq, 70, 140, 180, runningClock) * deg2Rad;
      self.rightLowerArm.rotation.x =
        sinusoid(self.stepFreq, 70, 140, 0, runningClock) * deg2Rad;
      self.leftLeg.rotation.x =
        sinusoid(self.stepFreq, -20, 80, 0, runningClock) * deg2Rad;
      self.rightLeg.rotation.x =
        sinusoid(self.stepFreq, -20, 80, 180, runningClock) * deg2Rad;
      self.leftLowerLeg.rotation.x =
        sinusoid(self.stepFreq, -130, 5, 240, runningClock) * deg2Rad;
      self.rightLowerLeg.rotation.x =
        sinusoid(self.stepFreq, -130, 5, 60, runningClock) * deg2Rad;

      if (self.isSwitchingLeft) {
        self.element.position.x -= 200;
        var offset = self.currentLane * 800 - self.element.position.x;
        if (offset > 800) {
          self.currentLane -= 1;
          self.element.position.x = self.currentLane * 800;
          self.isSwitchingLeft = false;
        }
      }
      if (self.isSwitchingRight) {
        self.element.position.x += 200;
        var offset = self.element.position.x - self.currentLane * 800;
        if (offset > 800) {
          self.currentLane += 1;
          self.element.position.x = self.currentLane * 800;
          self.isSwitchingRight = false;
        }
      }
    }
  };

  this.onLeftKeyPressed = function () {
    self.queuedActions.push("left");
  };

  this.onUpKeyPressed = function () {
    self.queuedActions.push("up");
  };

  this.onRightKeyPressed = function () {
    self.queuedActions.push("right");
  };

  this.onPause = function () {
    self.pauseStartTime = new Date() / 1000;
  };

  this.onUnpause = function () {
    var currentTime = new Date() / 1000;
    var pauseDuration = currentTime - self.pauseStartTime;
    self.runningStartTime += pauseDuration;
    if (self.isJumping) {
      self.jumpStartTime += pauseDuration;
    }
  };
}

function Tree(x, y, z, s) {
  var self = this;

  this.mesh = new THREE.Object3D();
  var top = createCylinder(1, 300, 300, 4, Colors.green, 0, 1000, 0);
  var mid = createCylinder(1, 400, 400, 4, Colors.green, 0, 800, 0);
  var bottom = createCylinder(1, 500, 500, 4, Colors.green, 0, 500, 0);
  var trunk = createCylinder(100, 100, 250, 32, Colors.brownDark, 0, 125, 0);
  this.mesh.add(top);
  this.mesh.add(mid);
  this.mesh.add(bottom);
  this.mesh.add(trunk);
  this.mesh.position.set(x, y, z);
  this.mesh.scale.set(s, s, s);
  this.scale = s;
  this.type = "tree";

  this.collides = function (minX, maxX, minY, maxY, minZ, maxZ) {
    var treeMinX = self.mesh.position.x - this.scale * 250;
    var treeMaxX = self.mesh.position.x + this.scale * 250;
    var treeMinY = self.mesh.position.y;
    var treeMaxY = self.mesh.position.y + this.scale * 1150;
    var treeMinZ = self.mesh.position.z - this.scale * 250;
    var treeMaxZ = self.mesh.position.z + this.scale * 250;
    return (
      treeMinX <= maxX &&
      treeMaxX >= minX &&
      treeMinY <= maxY &&
      treeMaxY >= minY &&
      treeMinZ <= maxZ &&
      treeMaxZ >= minZ
    );
  };
}

function HammerAndSickle(x, y, z, s) {
  var self = this;

  this.mesh = new THREE.Object3D();

  // ===== MATERIAL VÀ MÀU VÀNG KIM =====
  var goldMaterial = new THREE.MeshStandardMaterial({
    color: 0xFFD700,
    metalness: 0.8,
    roughness: 0.2,
  });

  // ===== TẠO CÁI BÚA =====
  // Tay cầm
  var handleGeom = new THREE.CylinderGeometry(5, 5, 120, 16);
  var handle = new THREE.Mesh(handleGeom, goldMaterial);
  handle.position.set(0, 0, 0);
  handle.rotation.z = Math.PI * 0.2; // nghiêng nhẹ

  // Đầu búa
  var headGeom = new THREE.BoxGeometry(60, 20, 20);
  var head = new THREE.Mesh(headGeom, goldMaterial);
  head.position.set(40, 40, 0);
  head.rotation.z = Math.PI * 0.2;

  // ===== TẠO CÁI LIỀM =====
  // Hình trăng khuyết = Torus + cắt bớt
  var sickleGeom = new THREE.TorusGeometry(90, 10, 16, 100, Math.PI * 1.4);
  var sickle = new THREE.Mesh(sickleGeom, goldMaterial);
  sickle.rotation.set(Math.PI / 2, 0, Math.PI * 0.4);
  sickle.position.set(-10, 30, 0);

  // Phần lưỡi nhọn cuối liềm
  var bladeGeom = new THREE.ConeGeometry(15, 60, 16);
  var blade = new THREE.Mesh(bladeGeom, goldMaterial);
  blade.position.set(-80, 70, 0);
  blade.rotation.set(0, 0, -Math.PI / 2);

  // ===== GOM LẠI THÀNH 1 OBJECT =====
  this.mesh.add(handle);
  this.mesh.add(head);
  this.mesh.add(sickle);
  this.mesh.add(blade);

  // ===== POSITION & SCALE =====
  this.mesh.position.set(x, y, z);
  this.mesh.scale.set(s, s, s);
  this.scale = s;
  this.type = "hammerandsickle";
  this.isCollected = false;
  this.particles = [];

  // ===== COLLISION (Box Collider đơn giản) =====
  this.collides = function (minX, maxX, minY, maxY, minZ, maxZ) {
    var obstMinX = self.mesh.position.x - this.scale * 100;
    var obstMaxX = self.mesh.position.x + this.scale * 100;
    var obstMinY = self.mesh.position.y;
    var obstMaxY = self.mesh.position.y + this.scale * 200;
    var obstMinZ = self.mesh.position.z - this.scale * 100;
    var obstMaxZ = self.mesh.position.z + this.scale * 100;
    return (
      obstMinX <= maxX &&
      obstMaxX >= minX &&
      obstMinY <= maxY &&
      obstMaxY >= minY &&
      obstMinZ <= maxZ &&
      obstMaxZ >= minZ
    );
  };

  // ====== ANIMATION UPDATE ======
  this.update = function () {
    // Xoay nhẹ liên tục
    this.mesh.rotation.y += 0.01;

    // Nếu đang được nhặt -> bay lên xoay nhanh hơn
    if (this.isCollected) {
      this.mesh.position.y += 0.5;
      this.mesh.rotation.y += 0.05;
    }

    // Particle: cho mỗi spark trôi dần lên và biến mất
    if (this.particles && this.particles.length > 0) {
      for (var i = this.particles.length - 1; i >= 0; i--) {
        var p = this.particles[i];
        p.position.y += 0.3;
        p.material.opacity -= 0.01;
        if (p.material.opacity <= 0) {
          this.mesh.remove(p);
          this.particles.splice(i, 1);
        }
      }
    }
  };

  // ====== KHI NHẶT VẬT PHẨM ======
  this.collect = function () {
    this.isCollected = true;
    this.spawnParticles();
  };

  // ====== PARTICLE EFFECT (ánh sáng lấp lánh) ======
  this.spawnParticles = function () {
    for (var i = 0; i < 15; i++) {
      var geom = new THREE.SphereGeometry(5, 8, 8);
      var mat = new THREE.MeshBasicMaterial({
        color: 0xFFD700,
        transparent: true,
        opacity: 1
      });
      var spark = new THREE.Mesh(geom, mat);
      spark.position.set(
        (Math.random() - 0.5) * 50,
        Math.random() * 50,
        (Math.random() - 0.5) * 50
      );
      this.mesh.add(spark);
      this.particles.push(spark);
    }
  };
}

// Mushroom obstacle inspired by asset/Mushroom_*.gltf
function Mushroom(x, y, z, s) {
  var self = this;

  this.mesh = new THREE.Object3D();
  
  // Create mushroom stem
  var stem = createCylinder(80, 100, 200, 16, Colors.white, 0, 100, 0);
  
  // Create mushroom cap
  var cap = createCylinder(10, 300, 300, 32, Colors.cherry, 0, 300, 0);
  cap.rotation.x = Math.PI;
  
  // Create spots on the mushroom cap
  var spot1 = createCylinder(10, 50, 50, 16, Colors.white, 80, 300, 80);
  spot1.rotation.x = Math.PI;
  var spot2 = createCylinder(10, 40, 40, 16, Colors.white, -60, 300, 100);
  spot2.rotation.x = Math.PI;
  var spot3 = createCylinder(10, 60, 60, 16, Colors.white, 20, 300, -90);
  spot3.rotation.x = Math.PI;
  
  this.mesh.add(stem);
  this.mesh.add(cap);
  this.mesh.add(spot1);
  this.mesh.add(spot2);
  this.mesh.add(spot3);
  
  this.mesh.position.set(x, y, z);
  this.mesh.scale.set(s, s, s);
  this.scale = s;
  this.type = "mushroom";

  this.collides = function (minX, maxX, minY, maxY, minZ, maxZ) {
    var obstMinX = self.mesh.position.x - this.scale * 200;
    var obstMaxX = self.mesh.position.x + this.scale * 200;
    var obstMinY = self.mesh.position.y;
    var obstMaxY = self.mesh.position.y + this.scale * 400;
    var obstMinZ = self.mesh.position.z - this.scale * 200;
    var obstMaxZ = self.mesh.position.z + this.scale * 200;
    return (
      obstMinX <= maxX &&
      obstMaxX >= minX &&
      obstMinY <= maxY &&
      obstMaxY >= minY &&
      obstMinZ <= maxZ &&
      obstMaxZ >= minZ
    );
  };
}

/**
 *
 * UTILITY FUNCTIONS
 *
 */

function sinusoid(frequency, minimum, maximum, phase, time) {
  var amplitude = 0.5 * (maximum - minimum);
  var angularFrequency = 2 * Math.PI * frequency;
  var phaseRadians = (phase * Math.PI) / 180;
  var offset = amplitude * Math.sin(angularFrequency * time + phaseRadians);
  var average = (minimum + maximum) / 2;
  return average + offset;
}

function createGroup(x, y, z) {
  var group = new THREE.Group();
  group.position.set(x, y, z);
  return group;
}

function createBox(dx, dy, dz, color, x, y, z, notFlatShading) {
  var geom = new THREE.BoxGeometry(dx, dy, dz);
  var mat = new THREE.MeshPhongMaterial({
    color: color,
    flatShading: notFlatShading != true,
  });
  var box = new THREE.Mesh(geom, mat);
  box.castShadow = true;
  box.receiveShadow = true;
  box.position.set(x, y, z);
  return box;
}

function createCylinder(
  radiusTop,
  radiusBottom,
  height,
  radialSegments,
  color,
  x,
  y,
  z
) {
  var geom = new THREE.CylinderGeometry(
    radiusTop,
    radiusBottom,
    height,
    radialSegments
  );
  var mat = new THREE.MeshPhongMaterial({
    color: color,
    flatShading: true,
  });
  var cylinder = new THREE.Mesh(geom, mat);
  cylinder.castShadow = true;
  cylinder.receiveShadow = true;
  cylinder.position.set(x, y, z);
  return cylinder;
}
