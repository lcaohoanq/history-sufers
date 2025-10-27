import { SKINS } from './skins.js';
import { createBox, createGroup, createTextLabel, sinusoid } from './utils.js';
import * as THREE from 'three';

const deg2Rad = Math.PI / 180;

/**
 * The player's character in the game.
 */
export function Character() {
  // Explicit binding of this even in changing contexts.
  var self = this;

  // Define multiple skins
  this.skins = SKINS;

  // Current skin index
  this.currentSkinIndex = 0;

  // Apply the current skin colors
  this.applySkin = function (skinIndex) {
    if (skinIndex >= 0 && skinIndex < self.skins.length) {
      self.currentSkinIndex = skinIndex;
      var skin = self.skins[skinIndex];

      self.skinColor = skin.skinColor;
      self.hairColor = skin.hairColor;
      self.shirtColor = skin.shirtColor;
      self.shortsColor = skin.shortsColor;

      // Update colors if character is already built
      if (self.face) {
        self.face.material.color.setHex(self.skinColor);
        self.hair.material.color.setHex(self.hairColor);
        self.torso.material.color.setHex(self.shirtColor);
        self.leftArm.children[0].material.color.setHex(self.skinColor);
        self.rightArm.children[0].material.color.setHex(self.skinColor);
        self.leftLeg.children[0].material.color.setHex(self.shortsColor);
        self.rightLeg.children[0].material.color.setHex(self.shortsColor);
        self.leftLowerArm.children[0].material.color.setHex(self.skinColor);
        self.rightLowerArm.children[0].material.color.setHex(self.skinColor);
        self.leftLowerLeg.children[0].material.color.setHex(self.skinColor);
        self.rightLowerLeg.children[0].material.color.setHex(self.skinColor);
      }
    }
  };

  // Method to cycle to next skin
  this.nextSkin = function () {
    var nextIndex = (self.currentSkinIndex + 1) % self.skins.length;
    self.applySkin(nextIndex);
  };

  // Method to cycle to previous skin
  this.previousSkin = function () {
    var prevIndex = (self.currentSkinIndex - 1 + self.skins.length) % self.skins.length;
    self.applySkin(prevIndex);
  };

  // Character defaults that don't change throughout the game.
  this.applySkin(0); // Apply default skin
  this.jumpDuration = 0.5;
  this.jumpHeight = 1000;
  this.isSliding = false;
  this.slideDuration = 0.4;
  this.slideStartTime = 0;


  // Initialize the character.
  init();

  /**
   * Builds the character in depth-first order. The parts of are
   * modelled by the following object hierarchy:
   *
   * - character (this.element)
   *    - head
   *       - face
   *       - hair
   *    - torso
   *    - leftArm
   *       - leftLowerArm
   *    - rightArm
   *       - rightLowerArm
   *    - leftLeg
   *       - rightLowerLeg
   *    - rightLeg
   *       - rightLowerLeg
   *
   * Also set up the starting values for evolving parameters throughout
   * the game.
   *
   */
  function init() {
    // Build the character.
    self.face = createBox(100, 100, 60, self.skinColor, 0, 0, 0);
    self.hair = createBox(105, 20, 65, self.hairColor, 0, 50, 0);
    self.head = createGroup(0, 260, -25);
    self.head.add(self.face);
    self.head.add(self.hair);

    self.torso = createBox(150, 190, 40, self.shirtColor, 0, 100, 0);

    // Add a white 'FPT' label on the back of the shirt.
    // Torso dims: width 150, height 190, depth 40. We'll create a label
    // slightly smaller than the torso width and place it on the back (positive z).
    var labelWidth = 100; // world units
    var labelHeight = 50;
    var label = createTextLabel('FPT', labelWidth, labelHeight, {
      color: '#ffffff',
      bg: 'rgba(0,0,0,0)',
      font: 'Arial',
      fontSize: 60,
      pxPerUnit: 1
    });

    // Position the label centered horizontally, slightly below top of torso,
    // and placed on the back face (z = torso depth/2 + small offset).
    label.position.set(0, 20, self.torso.geometry.parameters.depth / 2 + 0.1);
    // Rotate so the label faces outward (on the back). For this model the
    // front faces negative z, so back is positive z; plane faces +Y by default,
    // but our plane is aligned with the torso, so no rotation needed for upright text.
    self.torso.add(label);

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

    // Initialize the player's changing parameters.
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
   * Creates and returns a limb with an axis of rotation at the top.
   *
   * @param {number} DX The width of the limb.
   * @param {number} DY The length of the limb.
   * @param {number} DZ The depth of the limb.
   * @param {color} COLOR The color of the limb.
   * @param {number} X The x-coordinate of the rotation center.
   * @param {number} Y The y-coordinate of the rotation center.
   * @param {number} Z The z-coordinate of the rotation center.
   * @return {THREE.GROUP} A group that includes a box representing
   *                       the limb, with the specified properties.
   *
   */
  function createLimb(dx, dy, dz, color, x, y, z) {
    var limb = createGroup(x, y, z);
    var offset = -1 * (Math.max(dx, dz) / 2 + dy / 2);
    var limbBox = createBox(dx, dy, dz, color, 0, offset, 0);
    limb.add(limbBox);
    return limb;
  }

  /**
 * Get character's hitbox based on current state
 */
  this.getHitbox = function () {
    // Base hitbox size
    var baseWidth = 115;
    var baseHeightMin = 310;
    var baseHeightMax = 320;
    var baseDepth = 40;

    // Adjust hitbox when sliding
    if (self.isSliding) {
      baseWidth = 85;           // Thu hẹp chiều rộng
      baseHeightMin = 110;      // Giảm chiều cao đáng kể
      baseHeightMax = 120;
    }
    else if (self.isJumping) {
      baseWidth = 100;
    }

    // For testing: show the hitbox as a visible wireframe box
    // if (!self._hitboxHelper) {
    //   const boxGeom = new THREE.BoxGeometry(
    //     baseWidth * 2,
    //     baseHeightMin + baseHeightMax,
    //     baseDepth * 2
    //   );
    //   const boxMat = new THREE.MeshBasicMaterial({
    //     color: 0xff0000,
    //     wireframe: true,
    //     transparent: true,
    //     opacity: 1,
    //     depthTest: false
    //   });
    //   self._hitboxHelper = new THREE.Mesh(boxGeom, boxMat);
    //   self._hitboxHelper.name = 'HitboxHelper';
    //   self.element.add(self._hitboxHelper);
    // }
    // // Update hitbox helper size and position
    // self._hitboxHelper.scale.set(
    //   (baseWidth * 2) / self._hitboxHelper.geometry.parameters.width,
    //   (baseHeightMin + baseHeightMax) / self._hitboxHelper.geometry.parameters.height,
    //   (baseDepth * 2) / self._hitboxHelper.geometry.parameters.depth
    // );
    // self._hitboxHelper.position.set(
    //   0,
    //   (baseHeightMax - baseHeightMin) / 2,
    //   0
    // );
    // self._hitboxHelper.visible = true;

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
   * A method called on the character when time moves forward.
   */
  this.update = function () {
    // Obtain the curren time for future calculations.
    var currentTime = new Date() / 1000;

    // Apply actions to the character if none are currently being
    // carried out.
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

    // If the character is jumping, update the height of the character.
    // Otherwise, the character continues running.
    if (self.isJumping) {
      var jumpClock = currentTime - self.jumpStartTime;
      self.element.position.y =
        self.jumpHeight * Math.sin((1 / self.jumpDuration) * Math.PI * jumpClock) +
        sinusoid(2 * self.stepFreq, 0, 20, 0, self.jumpStartTime - self.runningStartTime);
      if (jumpClock > self.jumpDuration) {
        self.isJumping = false;
        self.runningStartTime += self.jumpDuration;
      }
    }
    else if (self.isSliding) {
      let slideClock = currentTime - self.slideStartTime;
      let t = Math.min(slideClock / self.slideDuration, 1);

      // 1. Hạ người xuống thấp hơn
      self.element.position.y = THREE.MathUtils.lerp(0, -200, t);

      // 2. KHÔNG di chuyển Z - chỉ làm hiệu ứng visual bằng rotation
      // self.element.position.z giữ nguyên ở -4000

      // 3. Ngả đầu ra sau (chỉ xoay, không dịch)
      self.head.rotation.x = THREE.MathUtils.lerp(0, -30 * deg2Rad, t);

      // 4. Torso ngả ra sau (chỉ xoay, không dịch)
      self.torso.rotation.x = THREE.MathUtils.lerp(0, 90 * deg2Rad, t);
      self.torso.position.y = THREE.MathUtils.lerp(100, 50, t); // Chỉ hạ thấp

      // 5. Tay duỗi ra sau
      self.leftArm.rotation.x = THREE.MathUtils.lerp(0, -100 * deg2Rad, t);
      self.rightArm.rotation.x = THREE.MathUtils.lerp(0, -100 * deg2Rad, t);
      self.leftArm.position.y = THREE.MathUtils.lerp(190, 150, t);
      self.rightArm.position.y = THREE.MathUtils.lerp(190, 150, t);

      // 6. Lower arms duỗi thẳng
      self.leftLowerArm.rotation.x = THREE.MathUtils.lerp(0, -30 * deg2Rad, t);
      self.rightLowerArm.rotation.x = THREE.MathUtils.lerp(0, -30 * deg2Rad, t);

      // 7. Chân duỗi thẳng ra trước
      self.leftLeg.rotation.x = THREE.MathUtils.lerp(0, 100 * deg2Rad, t);
      self.rightLeg.rotation.x = THREE.MathUtils.lerp(0, 100 * deg2Rad, t);
      self.leftLeg.position.y = THREE.MathUtils.lerp(-10, -50, t);
      self.rightLeg.position.y = THREE.MathUtils.lerp(-10, -50, t);

      // 8. Lower legs duỗi thẳng
      self.leftLowerLeg.rotation.x = THREE.MathUtils.lerp(0, -20 * deg2Rad, t);
      self.rightLowerLeg.rotation.x = THREE.MathUtils.lerp(0, -20 * deg2Rad, t);

      // 9. Rung nhẹ
      let twitch = Math.sin(currentTime * 30) * 1 * deg2Rad;
      self.torso.rotation.x += twitch;

      // 10. Reset khi hết slide - HARD RESET để tránh tích lũy sai số
      if (slideClock > self.slideDuration) {
        self.isSliding = false;

        // Reset về giá trị mặc định CHÍNH XÁC
        self.element.position.y = 0;
        // KHÔNG thay đổi Z - giữ nguyên -4000

        // Reset head
        self.head.rotation.x = 0;

        // Reset torso
        self.torso.rotation.x = 0;
        self.torso.position.y = 100;

        // Reset arms
        self.leftArm.rotation.x = 0;
        self.rightArm.rotation.x = 0;
        self.leftArm.position.y = 190;
        self.rightArm.position.y = 190;

        // Reset lower arms
        self.leftLowerArm.rotation.x = 0;
        self.rightLowerArm.rotation.x = 0;

        // Reset legs
        self.leftLeg.rotation.x = 0;
        self.rightLeg.rotation.x = 0;
        self.leftLeg.position.y = -10;
        self.rightLeg.position.y = -10;

        // Reset lower legs
        self.leftLowerLeg.rotation.x = 0;
        self.rightLowerLeg.rotation.x = 0;
      }
    }
    else {
      var runningClock = currentTime - self.runningStartTime;
      self.element.position.y = sinusoid(2 * self.stepFreq, 0, 20, 0, runningClock);
      self.head.rotation.x = sinusoid(2 * self.stepFreq, -10, -5, 0, runningClock) * deg2Rad;
      self.torso.rotation.x = sinusoid(2 * self.stepFreq, -10, -5, 180, runningClock) * deg2Rad;
      self.leftArm.rotation.x = sinusoid(self.stepFreq, -70, 50, 180, runningClock) * deg2Rad;
      self.rightArm.rotation.x = sinusoid(self.stepFreq, -70, 50, 0, runningClock) * deg2Rad;
      self.leftLowerArm.rotation.x = sinusoid(self.stepFreq, 70, 140, 180, runningClock) * deg2Rad;
      self.rightLowerArm.rotation.x = sinusoid(self.stepFreq, 70, 140, 0, runningClock) * deg2Rad;
      self.leftLeg.rotation.x = sinusoid(self.stepFreq, -20, 80, 0, runningClock) * deg2Rad;
      self.rightLeg.rotation.x = sinusoid(self.stepFreq, -20, 80, 180, runningClock) * deg2Rad;
      self.leftLowerLeg.rotation.x = sinusoid(self.stepFreq, -130, 5, 240, runningClock) * deg2Rad;
      self.rightLowerLeg.rotation.x = sinusoid(self.stepFreq, -130, 5, 60, runningClock) * deg2Rad;

      // If the character is not jumping, it may be switching lanes.
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
   * Handles character activity when the left key is pressed.
   */
  this.onLeftKeyPressed = function () {
    self.queuedActions.push('left');
  };

  /**
   * Handles character activity when the up key is pressed.
   */
  this.onUpKeyPressed = function () {
    self.queuedActions.push('up');
  };

  /**
   * Handles character activity when the right key is pressed.
   */
  this.onRightKeyPressed = function () {
    self.queuedActions.push('right');
  };

  /**
   * Handles character activity when the down key is pressed.
   */
  this.onDownKeyPressed = function () {
    self.queuedActions.push('down');
  };

  /**
   * Handles character activity when the game is paused.
   */
  this.onPause = function () {
    self.pauseStartTime = new Date() / 1000;
  };

  /**
   * Handles character activity when the game is unpaused.
   */
  this.onUnpause = function () {
    var currentTime = new Date() / 1000;
    var pauseDuration = currentTime - self.pauseStartTime;
    self.runningStartTime += pauseDuration;
    if (self.isJumping) {
      self.jumpStartTime += pauseDuration;
    }
  };
}
