import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const deg2Rad = Math.PI / 180;

// Available character models
const CHARACTER_MODELS = {
  BUSINESS_MAN: 'assets/models/business_man.glb',
  WORKER: 'assets/models/worker.glb',
  FARMER: 'assets/models/farmer.glb'
};

/**
 * The player's character in the game using GLB models.
 */
export function Character() {
  var self = this;

  // Character model properties
  this.modelPath = CHARACTER_MODELS.BUSINESS_MAN; // Default model
  this.model = null;
  this.mixer = null;
  this.animations = {};
  this.currentAnimation = null;
  this.isModelLoaded = false;

  // Available models list
  this.availableModels = Object.values(CHARACTER_MODELS);
  this.currentModelIndex = 0;

  // Character defaults
  this.jumpDuration = 0.5;
  this.jumpHeight = 1000;
  this.isSliding = false;
  this.slideDuration = 0.6; // Tăng lên để animation roll chạy đủ
  this.slideStartTime = 0;

  // Initialize the character
  this.element = new THREE.Group();
  this.element.position.set(0, 0, -4000);

  // Clock for accurate animation timing
  this.clock = new THREE.Clock();

  // Hitbox visualization
  this.hitboxHelper = null;
  this.showHitbox = true; // Toggle this to show/hide hitbox

  // Load the model
  init();

  /**
   * Initialize and load the GLB model
   */
  function init() {
    loadModel(self.modelPath);

    // Initialize the player's changing parameters
    self.isJumping = false;
    self.isSwitchingLeft = false;
    self.isSwitchingRight = false;
    self.stepToggle = false;
    self.currentLane = 0;
    self.runningStartTime = new Date() / 1000;
    self.pauseStartTime = new Date() / 1000;
    self.stepFreq = 2;
    self.queuedActions = [];
  }

  /**
   * Load a GLB model
   */
  function loadModel(modelPath) {
    const loader = new GLTFLoader();

    loader.load(
      modelPath,
      function (gltf) {
        // Remove old model if exists
        if (self.model) {
          self.element.remove(self.model);
          if (self.mixer) {
            self.mixer.stopAllAction();
          }
        }

        self.model = gltf.scene;

        // Scale and position the model
        self.model.scale.set(350, 350, 700); // Adjust scale to match game size
        self.model.position.set(0, -300, 0); // Position at ground level

        // Rotate model to face forward (negative Z direction)
        self.model.rotation.y = Math.PI; // 180 degrees to face forward

        self.element.add(self.model);

        // Setup animations
        self.mixer = new THREE.AnimationMixer(self.model);
        self.animations = {};

        gltf.animations.forEach(function (clip) {
          var name = clip.name.toLowerCase();

          if (name === 'characterarmature|run') {
            self.animations.run = self.mixer.clipAction(clip);
          } else if (name === 'characterarmature|idle' || name === 'characterarmature|idle_neutral') {
            if (!self.animations.idle) {
              self.animations.idle = self.mixer.clipAction(clip);
            }
          } else if (name === 'characterarmature|roll') {
            self.animations.roll = self.mixer.clipAction(clip);
            self.animations.roll.setLoop(THREE.LoopOnce);
            self.animations.roll.clampWhenFinished = true;
            self.animations.roll.setEffectiveTimeScale(1.5);
          }
        });

        // Start with idle animation
        if (self.animations.idle) {
          self.animations.idle.play();
          self.currentAnimation = 'idle';
        }

        self.isModelLoaded = true;
        console.log('Model loaded:', modelPath);
        console.log('Available animations:', Object.keys(self.animations));
      },
      function (xhr) {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
      },
      function (error) {
        console.error('Error loading model:', error);
      }
    );
  }

  /**
   * Switch to next character model
   */
  this.nextSkin = function () {
    self.currentModelIndex = (self.currentModelIndex + 1) % self.availableModels.length;
    self.modelPath = self.availableModels[self.currentModelIndex];
    loadModel(self.modelPath);
  };

  /**
   * Switch to previous character model
   */
  this.previousSkin = function () {
    self.currentModelIndex = (self.currentModelIndex - 1 + self.availableModels.length) % self.availableModels.length;
    self.modelPath = self.availableModels[self.currentModelIndex];
    loadModel(self.modelPath);
  };

  /**
   * Play animation
   */
  function playAnimation(animationName) {
    if (!self.animations[animationName] || self.currentAnimation === animationName) {
      return;
    }

    // Fade out current animation
    if (self.currentAnimation && self.animations[self.currentAnimation]) {
      self.animations[self.currentAnimation].fadeOut(0.2);
    }

    // Fade in new animation
    self.animations[animationName].reset().fadeIn(0.2).play();
    self.currentAnimation = animationName;
  }

  /**
   * Get character's hitbox based on current state
   */
  this.getHitbox = function () {
    var baseWidth = 115;
    var baseHeightMin = 310;
    var baseHeightMax = 320;
    var baseDepth = 40;

    // Adjust hitbox when sliding/rolling
    if (self.isSliding) {
      baseWidth = 85;
      baseHeightMin = 110;
      baseHeightMax = 120;
    } else if (self.isJumping) {
      baseWidth = 100;
    }

    return {
      minX: self.element.position.x - baseWidth,
      maxX: self.element.position.x + baseWidth,
      minY: self.element.position.y - baseHeightMin,
      maxY: self.element.position.y + baseHeightMax,
      minZ: self.element.position.z - baseDepth,
      maxZ: self.element.position.z + baseDepth
    };
  };

  /**
   * Create or update hitbox visualization
   */
  this.updateHitboxVisualization = function () {
    if (!self.showHitbox) {
      if (self.hitboxHelper) {
        self.element.remove(self.hitboxHelper);
        self.hitboxHelper = null;
      }
      return;
    }

    var hitbox = self.getHitbox();
    var width = hitbox.maxX - hitbox.minX;
    var height = hitbox.maxY - hitbox.minY;
    var depth = hitbox.maxZ - hitbox.minZ;

    // Remove old hitbox helper
    if (self.hitboxHelper) {
      self.element.remove(self.hitboxHelper);
    }

    // Create new hitbox geometry
    var geometry = new THREE.BoxGeometry(width, height, depth);
    var material = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      wireframe: true,
      transparent: true,
      opacity: 0.6
    });

    self.hitboxHelper = new THREE.Mesh(geometry, material);

    // Position the hitbox at character center - completely independent of model geometry
    self.hitboxHelper.position.set(
      0, // X centered on character
      0, // Y centered on character (hitbox follows character Y movement)
      0  // Z centered on character
    );

    self.element.add(self.hitboxHelper);
  };

  /**
   * Toggle hitbox visibility
   */
  this.toggleHitbox = function () {
    self.showHitbox = !self.showHitbox;
    self.updateHitboxVisualization();
  };

  /**
   * Update method called every frame
   */
  this.update = function () {
    // Update animation mixer with actual delta time
    if (self.mixer && self.isModelLoaded) {
      var delta = self.clock.getDelta();
      self.mixer.update(delta);
    }

    var currentTime = new Date() / 1000;

    // Update hitbox visualization
    self.updateHitboxVisualization();

    // Apply actions to the character
    if (
      !self.isJumping &&
      !self.isSliding &&
      !self.isSwitchingLeft &&
      !self.isSwitchingRight &&
      self.queuedActions.length > 0
    ) {
      switch (self.queuedActions.shift()) {
        case 'up':
          self.isJumping = true;
          self.jumpStartTime = new Date() / 1000;
          break;
        case 'down':
          self.isSliding = true;
          self.slideStartTime = currentTime;

          // Play roll animation
          if (self.animations.roll) {
            self.animations.roll.reset();
            playAnimation('roll');
          }
          break;
        case 'left':
          if (self.currentLane != -1) {
            self.isSwitchingLeft = true;
          }
          break;
        case 'right':
          if (self.currentLane != 1) {
            self.isSwitchingRight = true;
          }
          break;
      }
    }

    // Handle jumping
    if (self.isJumping) {
      var jumpClock = currentTime - self.jumpStartTime;
      self.element.position.y = self.jumpHeight * Math.sin((1 / self.jumpDuration) * Math.PI * jumpClock);

      if (jumpClock > self.jumpDuration) {
        self.isJumping = false;
        self.runningStartTime += self.jumpDuration;
        self.element.position.y = 0;
      }
    }
    // Handle sliding/rolling
    else if (self.isSliding) {
      let slideClock = currentTime - self.slideStartTime;
      let t = Math.min(slideClock / self.slideDuration, 1);

      // Lower character during slide
      self.element.position.y = THREE.MathUtils.lerp(0, -150, t);

      // The roll animation handles the visual rolling effect
      // Model rotation is handled by the animation itself

      // Reset after slide duration
      if (slideClock > self.slideDuration) {
        self.isSliding = false;
        self.element.position.y = 0;

        // Return to run animation
        if (self.animations.run) {
          playAnimation('run');
        }
      }
    }
    // Normal running
    else {
      // Play run animation if not already playing
      if (self.currentAnimation !== 'run' && self.animations.run) {
        playAnimation('run');
      }

      // Subtle bobbing while running
      var runningClock = currentTime - self.runningStartTime;
      self.element.position.y = Math.sin(runningClock * 2 * self.stepFreq * Math.PI) * 10;

      // Handle lane switching
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

  /**
   * Key press handlers
   */
  this.onLeftKeyPressed = function () {
    self.queuedActions.push('left');
  };

  this.onUpKeyPressed = function () {
    self.queuedActions.push('up');
  };

  this.onRightKeyPressed = function () {
    self.queuedActions.push('right');
  };

  this.onDownKeyPressed = function () {
    self.queuedActions.push('down');
  };

  /**
   * Pause/unpause handlers
   */
  this.onPause = function () {
    self.pauseStartTime = new Date() / 1000;

    // Switch to idle animation when paused
    if (self.animations.idle && self.isModelLoaded) {
      playAnimation('idle');
    }
  };

  this.onUnpause = function () {
    var currentTime = new Date() / 1000;
    var pauseDuration = currentTime - self.pauseStartTime;
    self.runningStartTime += pauseDuration;

    if (self.isJumping) {
      self.jumpStartTime += pauseDuration;
    }

    // Switch to run animation when unpaused
    if (self.animations.run && self.isModelLoaded) {
      playAnimation('run');
    }
  };
}
