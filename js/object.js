import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createCylinder, createTextLabel } from '../scripts/utils.js';
import { Colors } from '../scripts/colors.js';

const treeLoader = new GLTFLoader();
let treeModelPromise = null;
const scratchBox = new THREE.Box3();
const scratchVec = new THREE.Vector3();

function loadTreeModel() {
  if (!treeModelPromise) {
    const assetUrl = new URL('../assets/Simple Tree.glb', import.meta.url).href;
    treeModelPromise = treeLoader.loadAsync(assetUrl).then((gltf) => {
      const scene = gltf.scene || gltf.scenes?.[0];
      if (!scene) {
        throw new Error('Simple Tree.glb does not contain a scene node');
      }
      return scene;
    });
  }
  return treeModelPromise;
}

function normaliseTreeInstance(source) {
  const instance = source.clone(true);

  instance.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      if (child.material) {
        child.material = child.material.clone();
      }
    }
  });

  scratchBox.setFromObject(instance);
  const size = scratchBox.getSize(scratchVec);
  const desiredHeight = 690;
  const currentHeight = size.y || 1;
  const scaleFactor = desiredHeight / currentHeight;
  instance.scale.multiplyScalar(scaleFactor);

  instance.updateMatrixWorld(true);
  scratchBox.setFromObject(instance);
  const minY = scratchBox.min.y;
  instance.position.y -= minY;

  return instance;
}

function createFallbackTreeMesh() {
  const group = new THREE.Group();
  const top = createCylinder(1, 180, 180, 4, Colors.green, 0, 600, 0);
  const mid = createCylinder(1, 240, 240, 4, Colors.green, 0, 480, 0);
  const bottom = createCylinder(1, 300, 300, 4, Colors.green, 0, 300, 0);
  const trunk = createCylinder(60, 60, 150, 32, Colors.brownDark, 0, 75, 0);
  group.add(top);
  group.add(mid);
  group.add(bottom);
  group.add(trunk);
  group.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return group;
}

/**
 * A collidable tree in the game positioned at X, Y, Z in the scene and with
 * scale S.
 */
export function Tree(x, y, z, s) {
  var self = this;
  this.mesh = new THREE.Object3D();

  const fallbackTree = createFallbackTreeMesh();
  this.mesh.add(fallbackTree);
  this.loadedMesh = fallbackTree;

  loadTreeModel()
    .then((source) => {
      const treeInstance = normaliseTreeInstance(source);
      this.mesh.add(treeInstance);
      if (fallbackTree.parent === this.mesh) {
        this.mesh.remove(fallbackTree);
      }
      this.loadedMesh = treeInstance;
    })
    .catch((error) => {
      console.warn('Using fallback tree mesh due to loading error:', error);
    });

  // Gốc đặt theo tham số
  this.mesh.position.set(x, y, z);
  this.mesh.scale.set(s, s, s);

  // Lưu scale ngoài để dùng collision
  this.scale = s;

  // Fix lại luôn thông số collision theo kích thước mới (không cần *0.6 nữa)
  // Tổng chiều cao = 690 (thay vì 1150)
  // Bán kính tán cây = 300 (thay vì 500)
  this.collides = function (minX, maxX, minY, maxY, minZ, maxZ) {
    var treeMinX = self.mesh.position.x - this.scale * 300; // half width
    var treeMaxX = self.mesh.position.x + this.scale * 300;
    var treeMinY = self.mesh.position.y;
    var treeMaxY = self.mesh.position.y + this.scale * 690; // tổng cao mới
    var treeMinZ = self.mesh.position.z - this.scale * 300;
    var treeMaxZ = self.mesh.position.z + this.scale * 300;
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

export function HammerAndSickle(x, y, z, s) {
  var self = this;
  this.mesh = new THREE.Object3D();

  // ===== BUFF SYSTEM =====
  this.buffs = {
    trust: 0, // Không ảnh hưởng
    justice: 0, // Không ảnh hưởng
    unity: 0 // Không ảnh hưởng
  };
  this.buffValue = 10; // Điểm số chung (nếu cần)

  // ===== GOLD MATERIAL (flat 2D color) =====
  const goldMaterial = new THREE.MeshBasicMaterial({ color: 0xffd700 });

  // ===== BÚA (phía TRƯỚC liềm) =====
  const handleGeom = new THREE.CylinderGeometry(3.5, 3.5, 130, 12);
  const handle = new THREE.Mesh(handleGeom, goldMaterial);
  handle.rotation.z = Math.PI * 0.3;
  handle.position.set(-8, -10, 5);

  const headGeom = new THREE.BoxGeometry(45, 18, 20);
  const head = new THREE.Mesh(headGeom, goldMaterial);
  head.rotation.z = Math.PI * 0.3;
  head.position.set(28, 22, 5);

  const neckGeom = new THREE.BoxGeometry(10, 20, 10);
  const neck = new THREE.Mesh(neckGeom, goldMaterial);
  neck.rotation.z = Math.PI * 0.3;
  neck.position.set(10, 5, 5);

  // ===== LIỀM (phía SAU búa) =====
  const sickleGeom = new THREE.TorusGeometry(90, 8, 24, 200, Math.PI * 1.55);
  const sickle = new THREE.Mesh(sickleGeom, goldMaterial);
  sickle.rotation.set(Math.PI / 2, 0, -Math.PI * 0.25);
  sickle.position.set(-10, 5, 0);

  const innerGeom = new THREE.TorusGeometry(75, 5, 16, 180, Math.PI * 1.5);
  const inner = new THREE.Mesh(innerGeom, goldMaterial);
  inner.rotation.set(Math.PI / 2, 0, -Math.PI * 0.25);
  inner.position.set(-10, 5, 0);

  const bladeGeom = new THREE.ConeGeometry(9, 30, 12);
  const blade = new THREE.Mesh(bladeGeom, goldMaterial);
  blade.position.set(-78, 38, 0);
  blade.rotation.set(0, 0, -Math.PI * 0.6);

  this.mesh.add(sickle, inner, blade, handle, neck, head);
  this.mesh.rotation.z = Math.PI * 0.5;
  this.mesh.position.set(x, y, z);
  this.mesh.scale.set(s, s, s);
  this.scale = s;
  this.type = 'hammerandsickle';
  this.isCollected = false;
  this.particles = [];

  this.collides = function (minX, maxX, minY, maxY, minZ, maxZ) {
    var scaleFactor = Math.sqrt(this.scale) * 1.2;
    var obstMinX = self.mesh.position.x - scaleFactor * 100;
    var obstMaxX = self.mesh.position.x + scaleFactor * 100;
    var obstMinY = self.mesh.position.y;
    var obstMaxY = self.mesh.position.y + scaleFactor * 200;
    var obstMinZ = self.mesh.position.z - scaleFactor * 100;
    var obstMaxZ = self.mesh.position.z + scaleFactor * 100;
    return (
      obstMinX <= maxX &&
      obstMaxX >= minX &&
      obstMinY <= maxY &&
      obstMaxY >= minY &&
      obstMinZ <= maxZ &&
      obstMaxZ >= minZ
    );
  };

  this.update = function () {
    this.mesh.rotation.y += 0.008;
    if (this.isCollected) {
      this.mesh.visible = false;
    }
  };

  this.collect = function () {
    this.isCollected = true;
    this.spawnParticles();
  };

  this.spawnParticles = function () {
    for (let i = 0; i < 18; i++) {
      let geom = new THREE.SphereGeometry(4, 8, 8);
      let mat = new THREE.MeshBasicMaterial({
        color: 0xffd700,
        transparent: true,
        opacity: 1
      });
      let spark = new THREE.Mesh(geom, mat);
      spark.position.set(
        (Math.random() - 0.5) * 60,
        Math.random() * 60,
        (Math.random() - 0.5) * 40
      );
      this.mesh.add(spark);
      this.particles.push(spark);
    }
  };
}

export function BribeEnvelope(x, y, z, s) {
  var self = this;
  this.mesh = new THREE.Object3D();

  // ===== BUFF SYSTEM =====
  this.buffs = {
    trust: -15, // Giảm niềm tin
    justice: -20, // Giảm công bằng
    unity: 0 // Không ảnh hưởng
  };
  this.buffValue = -2000; // Tổng điểm âm

  var paperMat = new THREE.MeshBasicMaterial({ color: 0xe5d3b3 });

  var moneyMat = new THREE.MeshBasicMaterial({ color: 0x2e8b57 });

  var envelope = new THREE.Mesh(new THREE.BoxGeometry(120, 80, 6, 1, 1, 1), paperMat);
  envelope.position.set(0, 0, 0);

  var flapShape = new THREE.Shape();
  flapShape.moveTo(-60, 0);
  flapShape.lineTo(60, 0);
  flapShape.lineTo(0, 50);
  flapShape.lineTo(-60, 0);

  var flapGeom = new THREE.ShapeGeometry(flapShape);
  var flap = new THREE.Mesh(flapGeom, paperMat);
  flap.position.set(0, 20, 3.5);
  flap.rotation.x = -Math.PI * 0.5;

  var money = new THREE.Mesh(new THREE.BoxGeometry(100, 65, 3), moneyMat);
  money.position.set(0, 5, -3.2);
  money.rotation.z = Math.PI * 0.02;

  var creaseGeom = new THREE.PlaneGeometry(120, 0.8);
  var crease = new THREE.Mesh(creaseGeom, new THREE.MeshBasicMaterial({ color: 0xd0c1a2 }));
  crease.position.set(0, 0, 3.2);

  // removed point light - flat colors

  this.mesh.add(envelope, money, flap, crease);
  this.mesh.position.set(x, y, z);
  this.mesh.scale.set(s, s, s);
  this.type = 'bribeEnvelope';
  this.scale = s;
  this.isCollected = false;

  this.update = function () {
    this.mesh.rotation.y += 0.008;
    if (this.isCollected) {
      this.mesh.visible = false;
      return;
    }
  };

  this.collides = function (minX, maxX, minY, maxY, minZ, maxZ) {
    var scaleFactor = Math.sqrt(this.scale) * 1.2;
    var obstMinX = self.mesh.position.x - scaleFactor * 100;
    var obstMaxX = self.mesh.position.x + scaleFactor * 100;
    var obstMinY = self.mesh.position.y;
    var obstMaxY = self.mesh.position.y + scaleFactor * 200;
    var obstMinZ = self.mesh.position.z - scaleFactor * 100;
    var obstMaxZ = self.mesh.position.z + scaleFactor * 100;
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

export function BallotBox(x, y, z, s) {
  var self = this;
  this.mesh = new THREE.Object3D();

  // ===== BUFF SYSTEM =====
  this.buffs = {
    trust: 25, // Tăng niềm tin
    justice: 0, // Không ảnh hưởng
    unity: 0 // Không ảnh hưởng
  };
  this.buffValue = 500; // Điểm dương

  var boxMaterial = new THREE.MeshBasicMaterial({ color: 0x278d3e });

  var slotMaterial = new THREE.MeshBasicMaterial({ color: 0x222222 });

  var ballotMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });

  var boxGeometry = new THREE.BoxGeometry(200, 150, 200);
  var box = new THREE.Mesh(boxGeometry, boxMaterial);
  box.position.set(0, 75, 0);
  this.mesh.add(box);

  var slotGeometry = new THREE.BoxGeometry(120, 2, 10);
  var slot = new THREE.Mesh(slotGeometry, slotMaterial);
  slot.position.set(0, 150, 0);
  this.mesh.add(slot);

  var ballotGeometry = new THREE.PlaneGeometry(80, 120);
  var ballot = new THREE.Mesh(ballotGeometry, ballotMaterial);
  ballot.position.set(0, 160, 0);
  ballot.rotation.x = -Math.PI * 0.45;
  this.mesh.add(ballot);

  this.mesh.position.set(x, y, z);
  this.mesh.scale.set(s, s, s);
  this.scale = s;
  this.type = 'ballotbox';
  this.isCollected = false;

  this.update = function () {
    this.mesh.rotation.y += 0.008;
    ballot.position.y = 160 + Math.sin(Date.now() * 0.003) * 2;
    ballot.rotation.z = Math.sin(Date.now() * 0.002) * 0.05;

    if (this.isCollected) {
      this.mesh.visible = false;
      return;
    }
  };

  this.collides = function (minX, maxX, minY, maxY, minZ, maxZ) {
    var scaleFactor = Math.sqrt(this.scale) * 1.2;
    var obstMinX = self.mesh.position.x - scaleFactor * 100;
    var obstMaxX = self.mesh.position.x + scaleFactor * 100;
    var obstMinY = self.mesh.position.y;
    var obstMaxY = self.mesh.position.y + scaleFactor * 200;
    var obstMinZ = self.mesh.position.z - scaleFactor * 100;
    var obstMaxZ = self.mesh.position.z + scaleFactor * 100;
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

export function RuleOfLawState(x, y, z, s) {
  var self = this;
  this.mesh = new THREE.Object3D();

  // ===== BUFF SYSTEM =====
  this.buffs = {
    trust: 30, // Tăng niềm tin mạnh
    justice: 35, // Tăng công bằng mạnh
    unity: 20 // Tăng đoàn kết
  };
  this.buffValue = 750; // Điểm dương cao nhất

  var metalMat = new THREE.MeshBasicMaterial({ color: 0x888888 });
  var goldMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
  var woodMat = new THREE.MeshBasicMaterial({ color: 0x8b5a2b });
  var bookMat = new THREE.MeshBasicMaterial({ color: 0xf3e5ab });

  var base = new THREE.Mesh(new THREE.BoxGeometry(220, 20, 120), woodMat);
  base.position.set(0, 10, 0);
  this.mesh.add(base);

  var plinth = new THREE.Mesh(new THREE.BoxGeometry(120, 16, 60), metalMat);
  plinth.position.set(0, 38, 0);
  this.mesh.add(plinth);

  var post = new THREE.Mesh(new THREE.CylinderGeometry(6, 8, 180, 20), metalMat);
  post.position.set(0, 128, 0);
  this.mesh.add(post);

  var arm = new THREE.Mesh(new THREE.BoxGeometry(160, 8, 8), metalMat);
  arm.position.set(0, 200, 0);
  this.mesh.add(arm);

  var pivot = new THREE.Mesh(new THREE.SphereGeometry(8, 12, 12), goldMat);
  pivot.position.set(0, 200, 0);
  this.mesh.add(pivot);

  function makePan() {
    var group = new THREE.Object3D();
    var plate = new THREE.Mesh(new THREE.CylinderGeometry(28, 28, 4, 32), metalMat);
    var hanger = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 40, 8), metalMat);
    plate.rotation.x = Math.PI;
    hanger.position.set(0, 20, 0);
    group.add(plate, hanger);
    return group;
  }

  var leftGroup = makePan();
  var rightGroup = makePan();
  leftGroup.position.set(-70, 160, 0);
  rightGroup.position.set(70, 160, 0);
  this.mesh.add(leftGroup, rightGroup);

  function chainBetween(x1, y1, z1, x2, y2, z2) {
    var len = Math.hypot(x2 - x1, y2 - y1, z2 - z1);
    var cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, len, 8), metalMat);
    cyl.position.set((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
    cyl.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(x2 - x1, y2 - y1, z2 - z1).normalize()
    );
    return cyl;
  }
  this.mesh.add(chainBetween(-70, 200, 0, -70, 180, 0));
  this.mesh.add(chainBetween(70, 200, 0, 70, 180, 0));

  function createThinStar(points, outer, inner, material, depth) {
    var shape = new THREE.Shape();
    for (var i = 0; i < 2 * points; i++) {
      var r = i % 2 === 0 ? outer : inner;
      var a = (i * Math.PI) / points - Math.PI / 2;
      var x = Math.cos(a) * r;
      var y = Math.sin(a) * r;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    var geom = new THREE.ExtrudeGeometry(shape, { depth: depth, bevelEnabled: false });
    return new THREE.Mesh(geom, material);
  }

  var star = createThinStar(5, 40, 16, goldMat, 2);
  star.position.set(0, 260, -45);
  star.rotation.x = -Math.PI / 10;
  this.mesh.add(star);

  var bookGroup = new THREE.Object3D();
  var book = new THREE.Mesh(new THREE.BoxGeometry(60, 6, 40), bookMat);
  var stripe = new THREE.Mesh(
    new THREE.BoxGeometry(56, 2, 6),
    new THREE.MeshStandardMaterial({ color: 0x8b0000 })
  );
  book.position.set(0, 0, 0);
  stripe.position.set(0, 2, 12);
  bookGroup.position.set(0, 34, 0);
  bookGroup.add(book, stripe);
  this.mesh.add(bookGroup);

  var cap = new THREE.Mesh(new THREE.TorusGeometry(14, 2, 8, 24), goldMat);
  cap.position.set(0, 290, 0);
  cap.rotation.x = Math.PI / 2;
  this.mesh.add(cap);

  this.mesh.position.set(x, y, z);
  this.mesh.scale.set(s, s, s);
  this.scale = s;
  this.type = 'ruleOfLawState';

  this._rotateEnabled = true;
  this._rotationSpeed = 0.005;
  this._tilt = 0;
  this._tiltDir = 1;

  this.update = function () {
    if (this._rotateEnabled) this.mesh.rotation.y += this._rotationSpeed;
    this._tilt += 0.0008 * this._tiltDir;
    if (Math.abs(this._tilt) > 0.02) this._tiltDir *= -1;
    arm.rotation.z = this._tilt;
    pivot.rotation.z = this._tilt * 0.5;
    leftGroup.rotation.z = -this._tilt * 1.2;
    rightGroup.rotation.z = this._tilt * 1.2;
    star.rotation.z += 0.002;
    star.position.y = 260 + Math.sin(Date.now() * 0.001) * 1.0;

    if (this.isCollected) {
      this.mesh.visible = false;
      return;
    }
  };

  // removed point light - using flat MeshBasicMaterial

  this.collides = function (minX, maxX, minY, maxY, minZ, maxZ) {
    var scaleFactor = Math.sqrt(this.scale) * 1.2;
    var obstMinX = self.mesh.position.x - scaleFactor * 110;
    var obstMaxX = self.mesh.position.x + scaleFactor * 110;
    var obstMinY = self.mesh.position.y;
    var obstMaxY = self.mesh.position.y + scaleFactor * 300;
    var obstMinZ = self.mesh.position.z - scaleFactor * 60;
    var obstMaxZ = self.mesh.position.z + scaleFactor * 60;

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

export function ReformGears(x, y, z, s) {
  var self = this;
  this.mesh = new THREE.Object3D();

  // ===== BUFF SYSTEM =====
  this.buffs = {
    trust: 0, // Không ảnh hưởng
    justice: 30, // Tăng công bằng
    unity: 0 // Không ảnh hưởng
  };
  this.buffValue = 50; // Điểm dương

  var metalMat = new THREE.MeshBasicMaterial({ color: 0x707070 });
  var goldMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });

  var gearsGroup = new THREE.Group();
  gearsGroup.position.set(0, 120, 0);
  gearsGroup.rotation.x = Math.PI / 2;
  this.mesh.add(gearsGroup);

  function createGear(radius, thickness, teeth, colorMat) {
    var g = new THREE.Group();
    var disc = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, thickness, 64), colorMat);
    g.add(disc);

    for (var i = 0; i < teeth; i++) {
      var angle = (i / teeth) * Math.PI * 2;
      var tooth = new THREE.Mesh(
        new THREE.BoxGeometry(radius * 0.25, thickness * 1.2, radius * 0.1),
        colorMat
      );
      tooth.position.set(
        Math.cos(angle) * (radius - radius * 0.01),
        0,
        Math.sin(angle) * (radius - radius * 0.01)
      );
      tooth.rotation.y = angle;
      g.add(tooth);
    }
    return g;
  }

  var gearA = createGear(48, 10, 18, metalMat);
  var gearB = createGear(28, 10, 12, metalMat);
  var gearC = createGear(68, 10, 22, metalMat);

  gearA.position.set(-70, 0, 0);
  gearB.position.set(0, 0, -50);
  gearC.position.set(90, 0, 10);

  var pivotA = new THREE.Object3D();
  pivotA.add(gearA);
  pivotA.position.copy(gearA.position);
  var pivotB = new THREE.Object3D();
  pivotB.add(gearB);
  pivotB.position.copy(gearB.position);
  var pivotC = new THREE.Object3D();
  pivotC.add(gearC);
  pivotC.position.copy(gearC.position);

  gearA.position.set(0, 0, 0);
  gearB.position.set(0, 0, 0);
  gearC.position.set(0, 0, 0);

  gearsGroup.add(pivotA, pivotB, pivotC);

  var hubA = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 12, 12), goldMat);
  hubA.position.copy(pivotA.position);
  gearsGroup.add(hubA);
  var hubB = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 12, 12), goldMat);
  hubB.position.copy(pivotB.position);
  gearsGroup.add(hubB);
  var hubC = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 12, 12), goldMat);
  hubC.position.copy(pivotC.position);
  gearsGroup.add(hubC);

  this.mesh.position.set(x, y, z);
  this.mesh.scale.set(s, s, s);
  this.scale = s;
  this.type = 'reformgears';
  this._gearSpeed = 0.015;
  this._time = 0;

  this.update = function (delta) {
    this._time += delta !== undefined ? delta : 0.016;
    var speedB = this._gearSpeed;
    pivotB.rotation.y += speedB;
    pivotA.rotation.y -= speedB * (28 / 48);
    pivotC.rotation.y -= speedB * (28 / 68);
    this.mesh.rotation.y += 0.004;

    if (this.isCollected) {
      this.mesh.visible = false;
      return;
    }
  };

  this.collides = function (minX, maxX, minY, maxY, minZ, maxZ) {
    var scaleFactor = Math.sqrt(this.scale) * 1.2;
    var obstMinX = self.mesh.position.x - scaleFactor * 200;
    var obstMaxX = self.mesh.position.x + scaleFactor * 200;
    var obstMinY = self.mesh.position.y;
    var obstMaxY = self.mesh.position.y + scaleFactor * 260;
    var obstMinZ = self.mesh.position.z - scaleFactor * 150;
    var obstMaxZ = self.mesh.position.z + scaleFactor * 150;

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

export function UnityHands(x, y, z, s) {
  var self = this;
  this.mesh = new THREE.Object3D();

  // ===== BUFF SYSTEM =====
  this.buffs = {
    trust: 20, // Tăng niềm tin
    justice: 0, // Không ảnh hưởng
    unity: 35 // Tăng đoàn kết mạnh
  };
  this.buffValue = 100; // Điểm dương

  var skinMat = new THREE.MeshBasicMaterial({ color: 0xf2d2b6 });
  var bookMat = new THREE.MeshBasicMaterial({ color: 0x3e2723 });
  var gearMat = new THREE.MeshBasicMaterial({ color: 0x888888 });
  var hoeMat = new THREE.MeshBasicMaterial({ color: 0x665544 });

  function createHand() {
    var hand = new THREE.Object3D();
    var palm = new THREE.Mesh(new THREE.BoxGeometry(40, 15, 50), skinMat);
    palm.position.set(0, 0, 0);
    hand.add(palm);

    for (let i = -1.5; i <= 1.5; i++) {
      var finger = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 30), skinMat);
      finger.position.set(i * 12, 0, 35);
      hand.add(finger);
    }
    return hand;
  }

  function createBook() {
    return new THREE.Mesh(new THREE.BoxGeometry(30, 10, 40), bookMat);
  }

  function createGear() {
    return new THREE.Mesh(new THREE.CylinderGeometry(20, 20, 8, 16), gearMat);
  }

  function createHoe() {
    var hoe = new THREE.Object3D();
    var handle = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 80, 8), hoeMat);
    var head = new THREE.Mesh(new THREE.BoxGeometry(30, 4, 10), hoeMat);
    head.position.set(0, 40, 10);
    hoe.add(handle, head);
    return hoe;
  }

  var handWorker = createHand();
  var handFarmer = createHand();
  var handScholar = createHand();

  handWorker.position.set(-50, 0, 0);
  handWorker.rotation.set(0, Math.PI * 0.2, 0);

  handFarmer.position.set(50, 0, 0);
  handFarmer.rotation.set(0, -Math.PI * 0.2, 0);

  handScholar.position.set(0, 0, -50);
  handScholar.rotation.set(-Math.PI * 0.2, 0, 0);

  var gear = createGear();
  gear.position.set(0, 5, 20);
  handWorker.add(gear);

  var hoe = createHoe();
  hoe.position.set(0, 5, 25);
  hoe.rotation.set(0, Math.PI * 0.2, 0);
  handFarmer.add(hoe);

  var book = createBook();
  book.position.set(0, 5, 25);
  handScholar.add(book);

  this.mesh.add(handWorker, handFarmer, handScholar);

  this.mesh.position.set(x, y + 100, z);
  this.mesh.scale.set(s * 1.5, s * 1.5, s * 1.5);
  this.type = 'unityhands';

  this.mesh.rotation.x = Math.PI / 4;
  this.mesh.rotation.y = Math.PI;

  this.scale = s; // Thêm dòng này để scale hoạt động đúng
  this.mesh.position.set(x, y, z); // Bỏ cộng +100 nếu muốn player chạm được
  this.isCollected = false; // Giống BribeEnvelope

  this.update = function () {
    this.mesh.rotation.y += 0.004;

    if (this.isCollected) {
      this.mesh.visible = false;
      return;
    }
  };

  // removed point light

  this.collides = function (minX, maxX, minY, maxY, minZ, maxZ) {
    var scaleFactor = Math.sqrt(this.scale) * 2.5;
    var obstMinX = self.mesh.position.x - scaleFactor * 100;
    var obstMaxX = self.mesh.position.x + scaleFactor * 100;
    var obstMinY = self.mesh.position.y;
    var obstMaxY = self.mesh.position.y + scaleFactor * 200;
    var obstMinZ = self.mesh.position.z - scaleFactor * 100;
    var obstMaxZ = self.mesh.position.z + scaleFactor * 100;
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

export function CorruptedThrone(x, y, z, s) {
  this.mesh = new THREE.Object3D();

  // ===== BUFF SYSTEM =====
  this.buffs = {
    trust: -30, // Giảm niềm tin mạnh
    justice: -25, // Giảm công bằng
    unity: 0 // Không ảnh hưởng
  };
  this.buffValue = -5000; // Điểm âm cao
  this.isCollected = false;

  const woodMat = new THREE.MeshBasicMaterial({ color: 0x4b3621 });
  const webMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 });
  const vineMat = new THREE.MeshBasicMaterial({ color: 0x556b2f });

  const SCALE = 1.5;

  const seat = new THREE.Mesh(new THREE.BoxGeometry(80 * SCALE, 20 * SCALE, 80 * SCALE), woodMat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(80 * SCALE, 120 * SCALE, 15 * SCALE), woodMat);

  const armL = new THREE.Mesh(new THREE.BoxGeometry(15 * SCALE, 40 * SCALE, 60 * SCALE), woodMat);
  const armR = armL.clone();
  armL.position.set(-50 * SCALE, 40 * SCALE, 0);
  armR.position.set(50 * SCALE, 40 * SCALE, 0);

  const leg1 = new THREE.Mesh(new THREE.BoxGeometry(15 * SCALE, 50 * SCALE, 15 * SCALE), woodMat);
  const leg2 = leg1.clone(),
    leg3 = leg1.clone(),
    leg4 = leg1.clone();
  leg1.position.set(-30 * SCALE, 10 * SCALE, 30 * SCALE);
  leg2.position.set(30 * SCALE, 10 * SCALE, 30 * SCALE);
  leg3.position.set(-30 * SCALE, 10 * SCALE, -30 * SCALE);
  leg4.position.set(30 * SCALE, 10 * SCALE, -30 * SCALE);

  back.position.set(0, 70 * SCALE, -35 * SCALE);
  seat.position.set(0, 25 * SCALE, 0);

  this.mesh.add(seat, back, armL, armR, leg1, leg2, leg3, leg4);

  // removed point light

  function createWeb(size, pos, rot) {
    let web = new THREE.Mesh(new THREE.PlaneGeometry(size * SCALE, size * SCALE), webMat);
    web.position.set(pos.x * SCALE, pos.y * SCALE, pos.z * SCALE);
    web.rotation.set(rot.x, rot.y, rot.z);
    return web;
  }
  this.mesh.add(
    createWeb(70, { x: -40, y: 60, z: 0 }, { x: 0, y: Math.PI / 2, z: 0 }),
    createWeb(60, { x: 0, y: 40, z: 45 }, { x: Math.PI / 2, y: 0, z: 0 })
  );

  function createVine(pos, rot) {
    const vine = new THREE.Mesh(
      new THREE.CylinderGeometry(2 * SCALE, 2 * SCALE, 100 * SCALE, 8),
      vineMat
    );
    vine.position.set(pos.x * SCALE, pos.y * SCALE, pos.z * SCALE);
    vine.rotation.set(rot.x, rot.y, rot.z);
    return vine;
  }
  this.mesh.add(
    createVine({ x: 20, y: 60, z: -20 }, { x: Math.PI * 0.4, y: 0, z: 0 }),
    createVine({ x: -25, y: 50, z: 10 }, { x: -Math.PI * 0.3, y: 0, z: Math.PI * 0.2 })
  );

  this.mesh.position.set(x, y, z);
  this.mesh.scale.set(s, s, s);
  this.type = 'corruptedThrone';
  this.scale = s;

  this.update = function () {
    this.mesh.rotation.y += 0.003;

    if (this.isCollected) {
      this.mesh.visible = false;
      return;
    }
  };

  this.collides = function (minX, maxX, minY, maxY, minZ, maxZ) {
    const scaleFactor = Math.sqrt(s) * 1.2;
    const size = 80 * SCALE * scaleFactor;
    const px = this.mesh.position.x;
    const py = this.mesh.position.y;
    const pz = this.mesh.position.z;
    return (
      px - size <= maxX &&
      px + size >= minX &&
      py <= maxY &&
      py + size * 2 >= minY &&
      pz - size <= maxZ &&
      pz + size >= minZ
    );
  };
}

export function PuppetManipulation(x, y, z, s) {
  this.mesh = new THREE.Object3D();

  // ===== BUFF SYSTEM =====
  this.buffs = {
    trust: -25, // Giảm niềm tin
    justice: 0, // Không ảnh hưởng
    unity: -20 // Giảm đoàn kết
  };
  this.buffValue = -4500; // Điểm âm
  this.isCollected = false;

  const woodMat = new THREE.MeshBasicMaterial({ color: 0x8b5a2b });
  const stringMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.7
  });

  const body = new THREE.Mesh(new THREE.CylinderGeometry(12, 12, 80, 16), woodMat);
  body.position.set(0, 80, 0);

  const head = new THREE.Mesh(new THREE.SphereGeometry(16, 24, 24), woodMat);
  head.position.set(0, 120, 0);

  const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 60, 12), woodMat);
  leftArm.position.set(-20, 100, 0);
  leftArm.rotation.z = Math.PI / 4;

  const rightArm = leftArm.clone();
  rightArm.position.set(20, 100, 0);
  rightArm.rotation.z = -Math.PI / 4;

  const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 70, 12), woodMat);
  leftLeg.position.set(-10, 35, 0);

  const rightLeg = leftLeg.clone();
  rightLeg.position.set(10, 35, 0);

  this.mesh.add(body, head, leftArm, rightArm, leftLeg, rightLeg);

  function createString(from, to) {
    const len = from.distanceTo(to);
    const geo = new THREE.CylinderGeometry(0.5, 0.5, len, 8);
    const mesh = new THREE.Mesh(geo, stringMat);
    mesh.position.copy(from).lerp(to, 0.5);

    const dir = new THREE.Vector3().subVectors(to, from).normalize();
    const axis = new THREE.Vector3(0, 1, 0).cross(dir);
    const angle = Math.acos(dir.y);
    if (axis.length() > 0) axis.normalize();
    mesh.quaternion.setFromAxisAngle(axis, angle);
    return mesh;
  }

  const topPoint = new THREE.Vector3(0, 200, 0);
  this.mesh.add(
    createString(head.position.clone(), topPoint),
    createString(leftArm.position.clone(), topPoint.clone().add(new THREE.Vector3(-20, 0, 0))),
    createString(rightArm.position.clone(), topPoint.clone().add(new THREE.Vector3(20, 0, 0)))
  );

  const handBar = new THREE.Mesh(new THREE.BoxGeometry(80, 15, 30), woodMat);
  handBar.position.set(0, 215, 0);
  handBar.rotation.x = -Math.PI * 0.1;
  this.mesh.add(handBar);

  this.mesh.position.set(x, y, z);
  this.mesh.scale.set(s, s, s);
  this.type = 'puppetManipulation';

  this._rotationSpeed = 0.004;
  this.update = function () {
    this.mesh.rotation.y += this._rotationSpeed;
    head.rotation.y = Math.sin(Date.now() * 0.002) * 0.2;
    leftArm.rotation.z = Math.sin(Date.now() * 0.0015) * 0.3 + Math.PI / 4;
    rightArm.rotation.z = -Math.sin(Date.now() * 0.0015) * 0.3 - Math.PI / 4;

    if (this.isCollected) {
      this.mesh.visible = false;
      return;
    }
  };

  this.collides = function (minX, maxX, minY, maxY, minZ, maxZ) {
    let scaleFactor = Math.sqrt(s) * 1.2;
    let size = 150 * scaleFactor;
    let px = this.mesh.position.x;
    let py = this.mesh.position.y;
    let pz = this.mesh.position.z;
    return (
      px - size <= maxX &&
      px + size >= minX &&
      py <= maxY &&
      py + size >= minY &&
      pz - size <= maxZ &&
      pz + size >= minZ
    );
  };
}

export function MisbalancedScale(x, y, z, s) {
  this.mesh = new THREE.Object3D();

  // ===== BUFF SYSTEM =====
  this.buffs = {
    trust: 0, // Không ảnh hưởng
    justice: 0, // Không ảnh hưởng
    unity: -30 // Giảm đoàn kết mạnh (bất công xã hội)
  };
  this.buffValue = -3000; // Điểm âm
  this.isCollected = false;

  var metalMat = new THREE.MeshBasicMaterial({ color: 0x555555 });
  var darkMetalMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
  var goldMat = new THREE.MeshBasicMaterial({ color: 0xd4af37 });
  var dullWoodMat = new THREE.MeshBasicMaterial({ color: 0x4b3a2a });

  var base = new THREE.Mesh(new THREE.BoxGeometry(220, 20, 120), dullWoodMat);
  base.position.set(0, 10, 0);
  this.mesh.add(base);

  var plinth = new THREE.Mesh(new THREE.BoxGeometry(140, 18, 70), darkMetalMat);
  plinth.position.set(0, 38, 0);
  this.mesh.add(plinth);

  var pillar = new THREE.Mesh(new THREE.CylinderGeometry(7, 9, 180, 20), metalMat);
  pillar.position.set(0, 128, 0);
  this.mesh.add(pillar);

  var beam = new THREE.Mesh(new THREE.BoxGeometry(220, 10, 10), metalMat);
  beam.position.set(0, 200, 0);
  this.mesh.add(beam);

  var pivot = new THREE.Mesh(new THREE.SphereGeometry(10, 16, 16), goldMat);
  pivot.position.set(0, 200, 0);
  this.mesh.add(pivot);

  function makePan() {
    var grp = new THREE.Object3D();
    var plate = new THREE.Mesh(new THREE.CylinderGeometry(32, 32, 4, 32), metalMat);
    plate.rotation.x = Math.PI;
    grp.add(plate);

    var hanger = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 45, 12), metalMat);
    hanger.position.set(0, 25, 0);
    grp.add(hanger);
    return grp;
  }

  var leftPan = makePan();
  var rightPan = makePan();
  leftPan.position.set(-80, 160, 0);
  rightPan.position.set(80, 160, 0);
  this.mesh.add(leftPan, rightPan);

  var person = new THREE.Mesh(
    new THREE.CylinderGeometry(5, 5, 40, 12),
    new THREE.MeshBasicMaterial({ color: 0xdddddd })
  );
  person.position.set(0, 22, 0);
  leftPan.add(person);

  for (let i = 0; i < 3; i++) {
    let gold = new THREE.Mesh(new THREE.BoxGeometry(30, 15, 20), goldMat);
    gold.position.set(i * 25 - 25, 10, 0);
    rightPan.add(gold);
  }

  this.mesh.position.set(x, y, z);
  this.mesh.scale.set(s, s, s);
  this.type = 'misbalancedScale';

  this.collider = new THREE.Box3().setFromObject(this.mesh);

  this._tilt = -0.12;
  this._rotateEnabled = true;
  this._rotationSpeed = 0.004;

  // no point light - flat materials

  this.update = function () {
    if (this._rotateEnabled) this.mesh.rotation.y += this._rotationSpeed;

    beam.rotation.z = this._tilt;
    pivot.rotation.z = this._tilt * 0.5;
    leftPan.rotation.z = -this._tilt * 1.2;
    rightPan.rotation.z = this._tilt * 1.2;

    this.collider.setFromObject(this.mesh);

    if (this.isCollected) {
      this.mesh.visible = false;
      return;
    }
  };

  this.collides = function (minX, maxX, minY, maxY, minZ, maxZ) {
    const px = this.mesh.position.x;
    const py = this.mesh.position.y;
    const pz = this.mesh.position.z;
    const scaleFactor = Math.sqrt(s) * 1.2;
    const size = 200 * scaleFactor;

    return (
      px - size <= maxX &&
      px + size >= minX &&
      py - size <= maxY &&
      py + size >= minY &&
      pz - size <= maxZ &&
      pz + size >= minZ
    );
  };
}

export function ColonialGate(x, y, z, s, scene) {
  var self = this;
  this.mesh = new THREE.Group();
  this.scene = scene;

  // ===== BUFF SYSTEM =====
  this.buffs = {
    trust: 0,
    justice: 0,
    unity: 0
  };
  this.buffValue = 0;

  // Tường chính (rộng hơn để che lane)
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(600, 800, 100), // Tăng width lên 600 (tương đương tree)
    new THREE.MeshStandardMaterial({ color: 0xd5d7d8 })
  );
  this.mesh.add(body);

  // Cổng vòm
  const arch = new THREE.Mesh(
    new THREE.TorusGeometry(300, 40, 16, 40, Math.PI), // Scale up tương xứng
    new THREE.MeshStandardMaterial({ color: 0x666666 })
  );
  arch.rotation.x = Math.PI / 2;
  arch.position.y = 400;
  this.mesh.add(arch);

  // Emblem
  const emblem = new THREE.Mesh(
    new THREE.CircleGeometry(60, 24),
    new THREE.MeshStandardMaterial({ color: 0xd5d7d8 })
  );
  emblem.position.set(0, 350, 55);
  this.mesh.add(emblem);

  this.mesh.position.set(x, y, z);
  this.mesh.scale.set(s, s, s);
  this.scale = s;
  this.type = 'colonialGate';
  this.mesh.userData = { deadly: true };

  this.collides = function (minX, maxX, minY, maxY, minZ, maxZ) {
    const width = 600 * this.scale;   // ±300
    const height = 800 * this.scale;  // 0 -> 800
    const depth = 100 * this.scale;   // ±50

    const obstMinX = self.mesh.position.x - width / 2;
    const obstMaxX = self.mesh.position.x + width / 2;
    const obstMinY = self.mesh.position.y;
    const obstMaxY = self.mesh.position.y + height;
    const obstMinZ = self.mesh.position.z - depth / 2;
    const obstMaxZ = self.mesh.position.z + depth / 2;

    return (
      obstMinX <= maxX &&
      obstMaxX >= minX &&
      obstMinY <= maxY &&
      obstMaxY >= minY &&
      obstMinZ <= maxZ &&
      obstMaxZ >= minZ
    );
  };
  this.enableHitbox = false;  // tắt mặc định

  this.showHitbox = function () {
    if (!this.hitboxHelper) {
      // Tính bounding box gốc
      let bbox = new THREE.Box3().setFromObject(this.mesh);

      // ✅ Expand ra 1 chút (tăng 0.2 đơn vị mỗi chiều — có thể chỉnh)
      let expandSize = 0.2;
      bbox.expandByScalar(expandSize);

      // Tạo BoxHelper từ box đã mở rộng
      let box = new THREE.Box3Helper(bbox, 0xff0000);
      box.material.depthTest = false;
      box.material.depthWrite = false;
      box.renderOrder = 9999;
      scene.add(box);

      this.hitboxHelper = box;
    }
    this.hitboxHelper.visible = true;
  };

  this.updateHitbox = function () {
    if (this.hitboxHelper) {
      // Cập nhật vị trí theo mesh nhưng **giữ kích thước mở rộng**
      let bbox = new THREE.Box3().setFromObject(this.mesh);
      bbox.expandByScalar(0.2);
      this.hitboxHelper.box.copy(bbox);
    }
  };

}

export function HighBarrier(x, y, z, s, scene) {
  var self = this;
  this.mesh = new THREE.Group();
  this.scene = scene;

  // ===== BUFF SYSTEM =====
  this.buffs = {
    trust: 0,
    justice: 0,
    unity: 0
  };
  this.buffValue = 0;

  // Trụ bên trái
  const leftPole = new THREE.Mesh(
    new THREE.CylinderGeometry(30, 30, 1000, 16), // Scale up đáng kể
    new THREE.MeshStandardMaterial({ color: 0x444444 })
  );
  leftPole.position.set(-250, 0, 0);
  this.mesh.add(leftPole);

  // Trụ bên phải
  const rightPole = new THREE.Mesh(
    new THREE.CylinderGeometry(30, 30, 1000, 16),
    new THREE.MeshStandardMaterial({ color: 0x444444 })
  );
  rightPole.position.set(250, 0, 0);
  this.mesh.add(rightPole);

  // Thanh ngang trên cao (phần deadly) - cao hơn để nhảy qua được, thấp hơn để slide qua được
  const BAR_Y = 700; // tăng thêm 100 đơn vị so với trước (600 -> 700)
  const topBar = new THREE.Mesh(
    new THREE.BoxGeometry(550, 550, 80), // Rộng gần bằng tree
    new THREE.MeshStandardMaterial({ color: 0xff0000 })
  );
  topBar.position.set(0, BAR_Y, 0); // Cao hơn để character nhảy không chạm
  this.mesh.add(topBar);

  // Dải cảnh báo đỏ trắng
  const stripeWidth = 140;
  for (let i = 0; i < 4; i++) {
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(stripeWidth, 50, 85),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xff0000,
        emissiveIntensity: 0.3
      })
    );
    stripe.position.set(-210 + i * stripeWidth, BAR_Y, 0);
    this.mesh.add(stripe);
  }

  // Warning sign
  const warningSign = new THREE.Mesh(
    new THREE.CircleGeometry(50, 24),
    new THREE.MeshStandardMaterial({
      color: 0xffff00,
      emissive: 0xffaa00,
      emissiveIntensity: 0.5
    })
  );
  warningSign.position.set(0, BAR_Y, 50);
  this.mesh.add(warningSign);

  this.mesh.position.set(x, y, z);
  this.mesh.scale.set(s, s, s);
  this.scale = s;
  this.type = 'highBarrier';
  this.mesh.userData = { deadly: true };

  // ===== COLLISION DETECTION =====
  this.collides = function (minX, maxX, minY, maxY, minZ, maxZ) {
    const barWidth = 550 * this.scale;   // ±275
    const barHeight = 500 * this.scale;
    const barDepth = 80 * this.scale;    // ±40
    const barY = self.mesh.position.y + (BAR_Y * this.scale); // Vị trí Y tuyệt đối

    const obstMinX = self.mesh.position.x - barWidth / 2;
    const obstMaxX = self.mesh.position.x + barWidth / 2;
    const obstMinY = barY - barHeight / 2;
    const obstMaxY = barY + barHeight / 2;
    const obstMinZ = self.mesh.position.z - barDepth / 2;
    const obstMaxZ = self.mesh.position.z + barDepth / 2;

    return (
      obstMinX <= maxX &&
      obstMaxX >= minX &&
      obstMinY <= maxY &&
      obstMaxY >= minY &&
      obstMinZ <= maxZ &&
      obstMaxZ >= minZ
    );
  };

  this.enableHitbox = false;  // tắt mặc định

  this.showHitbox = function () {
    if (!this.hitboxHelper) {
      // Tính bounding box gốc
      let bbox = new THREE.Box3().setFromObject(this.mesh);

      let expandSize = 0.2;
      bbox.expandByScalar(expandSize);

      // Tạo BoxHelper từ box đã mở rộng
      let box = new THREE.Box3Helper(bbox, 0xff0000);
      box.material.depthTest = false;
      box.material.depthWrite = false;
      box.renderOrder = 9999;
      scene.add(box);

      this.hitboxHelper = box;
    }
    this.hitboxHelper.visible = true;
  };

  this.updateHitbox = function () {
    if (this.hitboxHelper) {
      // Cập nhật vị trí theo mesh nhưng **giữ kích thước mở rộng**
      let bbox = new THREE.Box3().setFromObject(this.mesh);
      bbox.expandByScalar(0.2);
      this.hitboxHelper.box.copy(bbox);
    }
  };
}

export function CapitalistExpress(x, y, z, s, scene) {
  this.mesh = new THREE.Group();
  this.type = "capitalistExpress";
  this.speed = 200; // nhanh hơn, cảm giác như tàu lao tới
  this.scene = scene;

  this.mesh.userData = { deadly: true };

  // ⚙ KÍCH THƯỚC CƠ BẢN (scale lớn)
  const BASE = 50; // hệ số gốc để train ≈ chiều rộng 500 của cây
  const HEIGHT_SCALE = 3; // tăng chiều cao lên 3 lần

  // Đầu tàu
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(BASE * 6, BASE * 3.5 * HEIGHT_SCALE, BASE * 8),  // ~360 x 630 x 480
    new THREE.MeshStandardMaterial({ color: 0x333333 })
  );
  head.position.y = BASE * 3.5 * (HEIGHT_SCALE - 1) / 2; // nâng đầu tàu lên cho đúng tâm
  this.mesh.add(head);

  // Mũi tàu (nhô phía trước)
  const nose = new THREE.Mesh(
    new THREE.ConeGeometry(BASE * 2.2, BASE * 3.5 * HEIGHT_SCALE, 6),
    new THREE.MeshStandardMaterial({ color: 0x444444 })
  );
  nose.rotation.x = Math.PI / 2;
  nose.position.z = BASE * 4.5;
  nose.position.y = BASE * 3.5 * (HEIGHT_SCALE - 1) / 2;
  this.mesh.add(nose);

  // Dấu $ lớn phía trước
  const dollar = createTextLabel('$', 200, 200, {
    color: '#038D38FF',
    bg: 'rgba(0,0,0,0)',
    font: 'Arial',
    fontSize: 180,
    pxPerUnit: 1
  });
  dollar.position.set(0, BASE * 3 * HEIGHT_SCALE, BASE * 2.5);
  this.mesh.add(dollar);

  // Đèn cảnh báo (giữ nguyên nhưng theo scale mới)
  const lightLeft = new THREE.Mesh(
    new THREE.SphereGeometry(BASE * 0.4, 16, 16),
    new THREE.MeshStandardMaterial({ emissive: 0xff0000 })
  );
  lightLeft.position.set(-BASE * 2.5, BASE * 1.2 * HEIGHT_SCALE, BASE * 3.5);
  this.mesh.add(lightLeft);

  const lightRight = lightLeft.clone();
  lightRight.position.x = BASE * 2.5;
  this.mesh.add(lightRight);

  // Vị trí + scale
  this.mesh.position.set(x, y, z);
  this.mesh.scale.set(s, s, s);
  this.scale = s;

  // Di chuyển
  this.update = function () {
    this.mesh.position.z += this.speed;
    if (this.mesh.position.z > 2000) {
      scene.remove(this.mesh);
    }
  };

  // Va chạm - chỉnh hitbox tương đương Tree
  this.collides = function (playerMinX, playerMaxX, playerMinY, playerMaxY, playerMinZ, playerMaxZ) {
    const w = BASE * 6 * this.scale;   // ~360 * s
    const h = BASE * 3.5 * HEIGHT_SCALE * this.scale; // ~630 * s
    const d = BASE * 8 * this.scale;   // ~480 * s

    const minX = this.mesh.position.x - w / 2;
    const maxX = this.mesh.position.x + w / 2;
    const minY = this.mesh.position.y;
    const maxY = this.mesh.position.y + h;
    const minZ = this.mesh.position.z - d / 2;
    const maxZ = this.mesh.position.z + d / 2;

    return (
      minX <= playerMaxX &&
      maxX >= playerMinX &&
      minY <= playerMaxY &&
      maxY >= playerMinY &&
      minZ <= playerMaxZ &&
      maxZ >= playerMinZ
    );
  };
  this.enableHitbox = false;  // tắt mặc định

  this.showHitbox = function () {
    if (!this.hitboxHelper) {
      // Tính bounding box gốc
      let bbox = new THREE.Box3().setFromObject(this.mesh);

      // ✅ Expand ra 1 chút (tăng 0.2 đơn vị mỗi chiều — có thể chỉnh)
      let expandSize = 0.2;
      bbox.expandByScalar(expandSize);

      // Tạo BoxHelper từ box đã mở rộng
      let box = new THREE.Box3Helper(bbox, 0xff0000);
      box.material.depthTest = false;
      box.material.depthWrite = false;
      box.renderOrder = 9999;
      scene.add(box);

      this.hitboxHelper = box;
    }
    this.hitboxHelper.visible = true;
  };

  this.updateHitbox = function () {
    if (this.hitboxHelper) {
      // Cập nhật vị trí theo mesh nhưng **giữ kích thước mở rộng**
      let bbox = new THREE.Box3().setFromObject(this.mesh);
      bbox.expandByScalar(0.2);
      this.hitboxHelper.box.copy(bbox);
    }
  };
}

export function VillageHut(x, y, z, s) {
  const scaleFactor = 10 * s;
  this.mesh = new THREE.Group();
  this.type = "villageHut";
  this.mesh.userData = { sideElement: true };

  // Thân nhà (vách gỗ)
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(40, 30, 40),
    new THREE.MeshStandardMaterial({ color: 0x8b5a2b })
  );
  this.mesh.add(wall);

  // Mái nhà (rơm)
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(32, 18, 4),
    new THREE.MeshStandardMaterial({ color: 0xd2b48c })
  );
  roof.position.y = 25;
  roof.rotation.y = Math.PI / 4;
  this.mesh.add(roof);

  this.mesh.position.set(x, y, z);
  this.mesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
  this.mesh.rotation.y = Math.PI / 2;
}

export function BambooTree(x, y, z, s) {
  // Tree: width ~500, height ~1150 (scale s)
  // Bamboo: cluster width ~160, height ~600, so scale up to match tree
  const scaleFactor = (500 / 160) * s;
  this.mesh = new THREE.Group();
  this.type = "bambooTree";
  this.mesh.userData = { sideElement: true };

  // 5 cây tre nhỏ khác nhau để tạo cụm
  for (let i = 0; i < 5; i++) {
    const height = 300 + Math.random() * 200;
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(5, 5, height, 6),
      new THREE.MeshStandardMaterial({ color: 0x2e8b57 })
    );
    trunk.position.set(Math.random() * 80 - 40, height / 2, Math.random() * 80 - 40);
    this.mesh.add(trunk);

    // Lá tre trên ngọn
    const leaf = new THREE.Mesh(
      new THREE.ConeGeometry(10, 60, 6),
      new THREE.MeshStandardMaterial({ color: 0x3cb371 })
    );
    leaf.position.set(trunk.position.x, height + 20, trunk.position.z);
    this.mesh.add(leaf);
  }

  this.mesh.position.set(x, y, z);
  this.mesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
}

export function WaterBuffalo(x, y, z, s) {
  const scaleFactor = 5 * s;
  this.mesh = new THREE.Group();
  this.type = "waterBuffalo";
  this.mesh.userData = { deadly: false };

  // 🐃 Thân trâu (hơi bo tròn)
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(40, 20, 20),
    new THREE.MeshStandardMaterial({ color: 0x4b4b4b })
  );
  body.position.set(0, 10, 0);
  this.mesh.add(body);

  // 🐃 Đầu trâu
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(18, 14, 16),
    new THREE.MeshStandardMaterial({ color: 0x4b4b4b })
  );
  head.position.set(25, 10, 0);
  this.mesh.add(head);

  // 🐃 Sừng (ConeGeometry + xoay ngang)
  const hornMaterial = new THREE.MeshStandardMaterial({ color: 0x2e2e2e });
  const hornLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 1, 12, 8), hornMaterial);
  hornLeft.position.set(25, 14, -6);
  hornLeft.rotation.z = Math.PI / 2;
  hornLeft.rotation.y = Math.PI / 3;
  this.mesh.add(hornLeft);

  const hornRight = hornLeft.clone();
  hornRight.position.z = 6;
  hornRight.rotation.y = -Math.PI / 3;
  this.mesh.add(hornRight);

  // 🐃 Chân (4 chân)
  function createLeg(px, pz) {
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(2, 2, 15, 8),
      new THREE.MeshStandardMaterial({ color: 0x3f3f3f })
    );
    leg.position.set(px, 2, pz);
    return leg;
  }
  this.mesh.add(createLeg(12, 7));
  this.mesh.add(createLeg(-12, 7));
  this.mesh.add(createLeg(12, -7));
  this.mesh.add(createLeg(-12, -7));

  // 🐃 Đuôi
  const tail = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 12, 8),
    new THREE.MeshStandardMaterial({ color: 0x3f3f3f })
  );
  tail.position.set(-20, 12, 0);
  tail.rotation.z = Math.PI / 8;
  this.mesh.add(tail);

  // Gán vị trí & scale
  this.mesh.position.set(x, y, z);
  this.mesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
  this.scale = s;
}

export function RiceStorage(x, y, z, s) {
  const scaleFactor = 10 * s;
  this.mesh = new THREE.Group();
  this.type = "riceStorage";

  // Nhà kho (tường chính)
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(80, 40, 50),
    new THREE.MeshStandardMaterial({ color: 0xc9a06b }) // màu vách đất/nứa
  );
  base.position.y = 20;
  this.mesh.add(base);

  // Mái nhà hình chữ A
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(60, 25, 4),
    new THREE.MeshStandardMaterial({ color: 0x8a4a39 }) // đỏ ngói
  );
  roof.position.y = 50;
  roof.rotation.y = Math.PI / 4;
  this.mesh.add(roof);

  // Cửa gỗ
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(20, 25, 2),
    new THREE.MeshStandardMaterial({ color: 0x6b4f33 })
  );
  door.position.set(0, 12, 26);
  this.mesh.add(door);

  // Biển "KHO LÚA"
  const label = createTextLabel("KHO LÚA", 64, 20, {
    color: "#ffffff", bg: "rgba(0,0,0,0.5)",
    font: "Arial", fontSize: 8, pxPerUnit: 1
  });
  label.position.set(0, 35, 27);
  this.mesh.add(label);

  this.mesh.position.set(x, y, z);
  this.mesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
  this.scale = s;
  this.mesh.rotation.y = Math.PI / 2;
}

export function WindPump(x, y, z, s) {
  // Tree: width ~500, height ~1150 (scale s)
  // WindPump: width ~20, so scale up to match tree width
  const scaleFactor = 4 * s;
  this.mesh = new THREE.Group();
  this.type = "windPump";

  // 🏗️ Trụ đứng (bằng tre hoặc sắt)
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(3, 3, 80, 12),
    new THREE.MeshStandardMaterial({ color: 0x8b6f47 }) // nâu tre
  );
  pole.position.y = 40;
  this.mesh.add(pole);

  // 🔄 Trục quạt phía trên
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(6, 6, 6),
    new THREE.MeshStandardMaterial({ color: 0x555555 })
  );
  head.position.y = 80;
  this.mesh.add(head);

  // 🌬️ Cánh quạt (Windmill blades)
  const blades = new THREE.Group();
  const bladeMaterial = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });

  for (let i = 0; i < 6; i++) {
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(2, 20, 6),
      bladeMaterial
    );
    blade.position.y = 80;
    blade.position.z = 8;
    blade.rotation.x = Math.PI / 2;
    blade.rotation.y = (i * Math.PI * 2) / 6;
    blades.add(blade);
  }
  this.mesh.add(blades);

  // ⚙️ Quay quạt (nếu muốn animate)
  this.rotateSpeed = 0.03;
  this.update = function () {
    blades.rotation.y += this.rotateSpeed;
  };

  // Đặt vị trí & scale chung
  this.mesh.position.set(x, y, z);
  this.mesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
  this.scale = s;

  // ✅ Collision đơn giản (hình trụ đứng) – nếu bạn cần xử lý sau
  this.collides = function (minX, maxX, minY, maxY, minZ, maxZ) {
    const radius = 10 * scaleFactor;
    const height = 80 * scaleFactor;

    const pumpMinX = this.mesh.position.x - radius;
    const pumpMaxX = this.mesh.position.x + radius;
    const pumpMinY = this.mesh.position.y;
    const pumpMaxY = this.mesh.position.y + height;
    const pumpMinZ = this.mesh.position.z - radius;
    const pumpMaxZ = this.mesh.position.z + radius;

    return (
      pumpMinX <= maxX &&
      pumpMaxX >= minX &&
      pumpMinY <= maxY &&
      pumpMaxY >= minY &&
      pumpMinZ <= maxZ &&
      pumpMaxZ >= minZ
    );
  };
}

export function OldFactory(x, y, z, s) {
  // Tree: width ~500, height ~1150 (scale s)
  // Factory: SCALE UP 2x để nổi bật
  const scaleFactor = (500 / 120) * s * 2;
  this.mesh = new THREE.Group();
  this.type = "oldFactory";

  // 🧱 Khối nhà chính (tường gạch)
  const mainBuilding = new THREE.Mesh(
    new THREE.BoxGeometry(100, 60, 80),
    new THREE.MeshStandardMaterial({ color: 0x9b7653 })
  );
  mainBuilding.position.set(0, 30, 0);
  this.mesh.add(mainBuilding);

  // 🪟 Cửa sổ
  const windowMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
  for (let i = -1; i <= 1; i++) {
    const window = new THREE.Mesh(new THREE.PlaneGeometry(20, 15), windowMaterial);
    window.position.set(i * 30, 40, 41);
    this.mesh.add(window);
  }

  // 🏭 Ống khói
  const chimney = new THREE.Mesh(
    new THREE.CylinderGeometry(8, 10, 80, 16),
    new THREE.MeshStandardMaterial({ color: 0x4a4a4a })
  );
  chimney.position.set(50, 80, -20);
  this.mesh.add(chimney);

  // Khói
  const smoke = new THREE.Mesh(
    new THREE.SphereGeometry(6, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0x555555, transparent: true, opacity: 0.6 })
  );
  smoke.position.set(50, 120, -20);
  this.mesh.add(smoke);

  // 🌫 Animation khói bay
  this.update = function () {
    smoke.position.y += 0.2;
    smoke.material.opacity -= 0.002;
    if (smoke.material.opacity <= 0) {
      smoke.position.y = 120;
      smoke.material.opacity = 0.6;
    }
  };

  this.mesh.position.set(x, y, z);
  this.mesh.scale.set(scaleFactor, scaleFactor, scaleFactor);

  // Quay ngang sang phải (trục Y, 90 độ)
  this.mesh.rotation.y = -Math.PI / 2;
}

export function OldApartmentBlock(x, y, z, s) {
  const scaleFactor = 5 * s;
  this.mesh = new THREE.Group();
  this.type = "oldApartmentBlock";

  // Khối chính của chung cư
  const building = new THREE.Mesh(
    new THREE.BoxGeometry(250, 120, 80),
    new THREE.MeshStandardMaterial({ color: 0xc9c9c9 })
  );
  building.position.y = 60;
  this.mesh.add(building);

  // Mái fibro xi măng
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(260, 5, 85),
    new THREE.MeshStandardMaterial({ color: 0x8a8a8a })
  );
  roof.position.y = 122;
  this.mesh.add(roof);

  // Ban công lặp theo tầng
  const balconyMaterial = new THREE.MeshStandardMaterial({ color: 0x777777 });
  for (let floor = 0; floor < 5; floor++) {
    for (let i = -2; i <= 2; i++) {
      const balcony = new THREE.Mesh(
        new THREE.BoxGeometry(35, 4, 15),
        balconyMaterial
      );
      balcony.position.set(i * 45, 20 + floor * 20, 43);
      this.mesh.add(balcony);
    }
  }

  // Cửa sổ
  const windowMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a });
  for (let floor = 0; floor < 5; floor++) {
    for (let i = -2; i <= 2; i++) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(25, 15), windowMat);
      win.position.set(i * 45, 22 + floor * 20, 41);
      this.mesh.add(win);
    }
  }

  this.mesh.position.set(x, y, z);
  this.mesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
  // Quay ngang sang phải (trục Y, 90 độ)
  this.mesh.rotation.y = -Math.PI / 2;
}

export function FiveGTower(x, y, z, s) {
  // SCALE UP 100x để thấy rõ (từ 1-2 units lên ~500)
  const scaleFactor = s * 100;
  this.mesh = new THREE.Group();
  this.type = "fiveGTower";

  // Trụ chính
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.5, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.6, roughness: 0.3 })
  );
  pole.position.y = 6;
  this.mesh.add(pole);

  // Đế trụ
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.5, 2, 1, 16),
    new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  base.position.y = 0.5;
  this.mesh.add(base);

  // Ăng-ten 5G
  const antennaGeom = new THREE.BoxGeometry(0.6, 1.5, 0.3);
  const antennaMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
  for (let i = 0; i < 3; i++) {
    const antenna = new THREE.Mesh(antennaGeom, antennaMat);
    const angle = (i / 3) * Math.PI * 2;
    antenna.position.set(Math.cos(angle) * 1, 10, Math.sin(angle) * 1);
    antenna.rotation.y = angle;
    this.mesh.add(antenna);
  }

  this.mesh.position.set(x, y, z);
  this.mesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
}

export function MetroStation(x, y, z, s) {
  // SCALE UP 40x để match tree size
  const scaleFactor = s * 40;
  this.mesh = new THREE.Group();
  this.type = "metroStation";

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(20, 1, 6),
    new THREE.MeshStandardMaterial({ color: 0xaaaaaa })
  );
  base.position.y = 0.5;
  this.mesh.add(base);

  const roof = new THREE.Mesh(
    new THREE.CylinderGeometry(10, 10, 2, 32, 1, true, 0, Math.PI),
    new THREE.MeshStandardMaterial({ color: 0xeeeeee, side: THREE.DoubleSide })
  );
  roof.position.y = 2.5;
  roof.rotation.z = Math.PI / 2;
  this.mesh.add(roof);

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x99ccff,
    transparent: true,
    opacity: 0.4
  });
  const frontWall = new THREE.Mesh(new THREE.BoxGeometry(20, 2, 0.2), glassMat);
  frontWall.position.set(0, 2, 3);
  this.mesh.add(frontWall);

  const pillarGeom = new THREE.CylinderGeometry(0.2, 0.2, 2.5, 12);
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0xcccccc });
  for (let i = -8; i <= 8; i += 4) {
    const pillar = new THREE.Mesh(pillarGeom, pillarMat);
    pillar.position.set(i, 1.75, -2.5);
    this.mesh.add(pillar);
  }

  if (typeof createTextLabel === "function") {
    const label = createTextLabel('METRO', 32, 10, {
      color: '#ff4444',
      bg: 'rgba(0,0,0,0)',
      font: 'Arial',
      fontSize: 10,
      pxPerUnit: 2
    });
    label.position.set(0, 3, 10);
    this.mesh.add(label);
  }

  this.mesh.position.set(x, y, z);
  this.mesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
  // Quay ngang sang phải (trục Y, 90 độ)
  this.mesh.rotation.y = -Math.PI / 2;
}

export function Skyscraper(x, y, z, s, floors = 12, width = 8, depth = 6, floorHeight = 2) {
  // SCALE UP 80x để match tree
  const scaleFactor = s * 80;
  this.mesh = new THREE.Group();
  this.type = "skyscraper";

  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x556677,
    metalness: 0.4,
    roughness: 0.5
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x99ccff,
    transparent: true,
    opacity: 0.5
  });

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(width, floors * floorHeight, depth),
    wallMat
  );
  body.position.y = (floors * floorHeight) / 2;
  this.mesh.add(body);

  for (let i = 1; i < floors; i++) {
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.9, 0.1, depth * 0.9),
      glassMat
    );
    glass.position.set(0, i * floorHeight, 0);
    this.mesh.add(glass);
  }

  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(width * 1.05, 0.5, depth * 1.05),
    new THREE.MeshStandardMaterial({ color: 0x333333 })
  );
  roof.position.y = floors * floorHeight + 0.25;
  this.mesh.add(roof);

  const antenna = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.2, 2, 8),
    new THREE.MeshStandardMaterial({ color: 0xffffff })
  );
  antenna.position.y = floors * floorHeight + 1.5;
  this.mesh.add(antenna);

  this.mesh.position.set(x, y, z);
  this.mesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
}

export function HighTechFactory(x, y, z, s) {
  // Scale tương tự Tree (~500 width) nhưng mang phong cách hiện đại
  const scaleFactor = (500 / 120) * s * 2;
  this.mesh = new THREE.Group();
  this.type = "highTechFactory";

  // 🏢 Khối nhà chính – kính + kim loại (màu xám trắng)
  const mainBuilding = new THREE.Mesh(
    new THREE.BoxGeometry(110, 70, 90),
    new THREE.MeshStandardMaterial({
      color: 0xe0e0e0, // xám trắng
      metalness: 0.2,
      roughness: 0.3
    })
  );
  mainBuilding.position.set(0, 35, 0);
  this.mesh.add(mainBuilding);

  // 🔳 Cửa kính dài (mặt trước)
  const glassMaterial = new THREE.MeshStandardMaterial({
    color: 0x88ccef,
    metalness: 0.2,
    roughness: 0.1,
    transparent: true,
    opacity: 0.6
  });
  for (let i = -1; i <= 1; i++) {
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(25, 20), glassMaterial);
    glass.position.set(i * 35, 35, 46);
    this.mesh.add(glass);
  }

  // 🔋 Tấm năng lượng mặt trời (phía bên hông phải)
  const solarPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 40),
    new THREE.MeshStandardMaterial({
      color: 0x1f2937, // xanh đen
      metalness: 0.5,
      roughness: 0.2
    })
  );
  solarPanel.rotation.x = -Math.PI / 4;
  solarPanel.position.set(70, 55, 0);
  this.mesh.add(solarPanel);

  // 📡 Anten vệ tinh – cảm giác "công nghệ cao"
  const antennaBase = new THREE.Mesh(
    new THREE.CylinderGeometry(2, 2, 15, 8),
    new THREE.MeshStandardMaterial({ color: 0xaaaaaa })
  );
  antennaBase.position.set(-40, 80, -20);
  this.mesh.add(antennaBase);

  const antennaDish = new THREE.Mesh(
    new THREE.SphereGeometry(10, 16, 16, 0, Math.PI),
    new THREE.MeshStandardMaterial({ color: 0xcfd3d6, metalness: 0.1 })
  );
  antennaDish.position.set(-40, 90, -25);
  antennaDish.rotation.x = Math.PI / 4;
  this.mesh.add(antennaDish);

  // 💡 Đèn tín hiệu đỏ nhấp nháy
  const warningLight = new THREE.Mesh(
    new THREE.SphereGeometry(3, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000 })
  );
  warningLight.position.set(0, 85, 0);
  this.mesh.add(warningLight);

  // Animation cho đèn công nghệ (nhấp nháy)
  this.update = function () {
    warningLight.material.emissiveIntensity = Math.abs(Math.sin(Date.now() * 0.005)) * 1.5;
  };

  this.mesh.position.set(x, y, z);
  this.mesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
  this.mesh.rotation.y = -Math.PI / 2;
}

