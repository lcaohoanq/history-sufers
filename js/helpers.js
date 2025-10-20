// Helper functions for creating 3D objects
// Shared across the application
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