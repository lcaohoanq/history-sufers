import * as THREE from 'three';

export function updateSoundButtonUI() {
  var soundToggleBtn = document.getElementById('sound-toggle');
  if (!soundToggleBtn) return;
  var isMuted = AudioManager.getMuteState();
  soundToggleBtn.innerHTML = isMuted ? '🔇' : '🔊';
  if (isMuted) {
    soundToggleBtn.classList.add('muted');
  } else {
    soundToggleBtn.classList.remove('muted');
  }
}

/**
 *
 * IMPORTANT OBJECTS
 *
 * The character and environmental objects in the game.
 *
 */
export function sinusoid(frequency, minimum, maximum, phase, time) {
  var amplitude = 0.5 * (maximum - minimum);
  var angularFrequency = 2 * Math.PI * frequency;
  var phaseRadians = (phase * Math.PI) / 180;
  var offset = amplitude * Math.sin(angularFrequency * time + phaseRadians);
  var average = (minimum + maximum) / 2;
  return average + offset;
}

/**
 * Utility function for generating current values of sinusoidally
 * varying variables.
 *
 * @param {number} FREQUENCY The number of oscillations per second.
 * @param {number} MINIMUM The minimum value of the sinusoid.
 * @param {number} MAXIMUM The maximum value of the sinusoid.
 * @param {number} PHASE The phase offset in degrees.
 * @param {number} TIME The time, in seconds, in the sinusoid's scope.
 * @return {number} The value of the sinusoid.
 *
 */
export function sinusoid(frequency, minimum, maximum, phase, time) {
  var amplitude = 0.5 * (maximum - minimum);
  var angularFrequency = 2 * Math.PI * frequency;
  var phaseRadians = (phase * Math.PI) / 180;
  var offset = amplitude * Math.sin(angularFrequency * time + phaseRadians);
  var average = (minimum + maximum) / 2;
  return average + offset;
}

/**
 * Creates an empty group of objects at a specified location.
 *
 * @param {number} X The x-coordinate of the group.
 * @param {number} Y The y-coordinate of the group.
 * @param {number} Z The z-coordinate of the group.
 * @return {Three.Group} An empty group at the specified coordinates.
 *
 */
export function createGroup(x, y, z) {
  var group = new THREE.Group();
  group.position.set(x, y, z);
  return group;
}

/**
 * Creates and returns a simple box with the specified properties.
 *
 * @param {number} DX The width of the box.
 * @param {number} DY The height of the box.
 * @param {number} DZ The depth of the box.
 * @param {color} COLOR The color of the box.
 * @param {number} X The x-coordinate of the center of the box.
 * @param {number} Y The y-coordinate of the center of the box.
 * @param {number} Z The z-coordinate of the center of the box.
 * @param {boolean} NOTFLATSHADING True iff the flatShading is false.
 * @return {THREE.Mesh} A box with the specified properties.
 *
 */
export function createBox(dx, dy, dz, color, x, y, z, notFlatShading) {
  var geom = new THREE.BoxGeometry(dx, dy, dz);
  var mat = new THREE.MeshPhongMaterial({
    color: color,
    flatShading: notFlatShading != true
  });
  var box = new THREE.Mesh(geom, mat);
  box.castShadow = true;
  box.receiveShadow = true;
  box.position.set(x, y, z);
  return box;
}

export function createBoxTexture(dx, dy, dz, color, x, y, z, notFlatShading, texturePath) {
  const geom = new THREE.BoxGeometry(dx, dy, dz);

  let mat;

  if (texturePath) {
    const loader = new THREE.TextureLoader();
    const texture = loader.load(texturePath);

    // Repeat the texture across the surface
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(dx / 500, dz / 500); // tweak this ratio for scale

    mat = new THREE.MeshPhongMaterial({
      map: texture
    });
  } else {
    mat = new THREE.MeshPhongMaterial({
      color: color,
      flatShading: notFlatShading != true
    });
  }

  const box = new THREE.Mesh(geom, mat);
  box.castShadow = true;
  box.receiveShadow = true;
  box.position.set(x, y, z);
  return box;
}

/**
 * Create a plane mesh with a canvas texture containing text.
 * Useful for labels on clothing without loading font assets.
 *
 * @param {string} text The text to draw.
 * @param {number} planeWidth Width of the plane in world units.
 * @param {number} planeHeight Height of the plane in world units.
 * @param {object} options Optional: { color, bg, fontSize, font, pxPerUnit }
 * @return {THREE.Mesh} Plane mesh with the text texture.
 */
export function createTextLabel(text, planeWidth, planeHeight, options) {
  options = options || {};
  var color = options.color || '#ffffff';
  var bg = options.bg || 'rgba(0,0,0,0)';
  var font = options.font || 'sans-serif';
  var pxPerUnit = options.pxPerUnit || 10; // pixels per world unit
  var canvasWidth = Math.max(64, Math.round(planeWidth * pxPerUnit));
  var canvasHeight = Math.max(32, Math.round(planeHeight * pxPerUnit));

  var canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  var ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Text styling
  var fontSize = options.fontSize || Math.floor(canvasHeight * 0.6);
  ctx.font = fontSize + 'px ' + font;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Draw text
  ctx.fillText(text, canvasWidth / 2, canvasHeight / 2);

  var texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  var mat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    side: THREE.DoubleSide
  });
  var geom = new THREE.PlaneGeometry(planeWidth, planeHeight);
  var mesh = new THREE.Mesh(geom, mat);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

/**
 * Creates and returns a (possibly asymmetrical) cyinder with the
 * specified properties.
 *
 * @param {number} RADIUSTOP The radius of the cylinder at the top.
 * @param {number} RADIUSBOTTOM The radius of the cylinder at the bottom.
 * @param {number} HEIGHT The height of the cylinder.
 * @param {number} RADIALSEGMENTS The number of segmented faces around
 *                                the circumference of the cylinder.
 * @param {color} COLOR The color of the cylinder.
 * @param {number} X The x-coordinate of the center of the cylinder.
 * @param {number} Y The y-coordinate of the center of the cylinder.
 * @param {number} Z The z-coordinate of the center of the cylinder.
 * @return {THREE.Mesh} A box with the specified properties.
 */
export function createCylinder(radiusTop, radiusBottom, height, radialSegments, color, x, y, z) {
  var geom = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments);
  var mat = new THREE.MeshPhongMaterial({
    color: color,
    flatShading: true
  });
  var cylinder = new THREE.Mesh(geom, mat);
  cylinder.castShadow = true;
  cylinder.receiveShadow = true;
  cylinder.position.set(x, y, z);
  return cylinder;
}
