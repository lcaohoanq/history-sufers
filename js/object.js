import * as THREE from 'three';
import { createCylinder, createTextLabel, addGlowEffect } from '../scripts/utils.js';
import { Colors } from '../scripts/colors.js';

/**
 * A collidable tree in the game positioned at X, Y, Z in the scene and with
 * scale S.
 */
export function Tree(x, y, z, s) {
  // Explicit binding.
  var self = this;

  // The object portrayed in the scene.
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

  /**
   * A method that detects whether this tree is colliding with the character,
   * which is modelled as a box bounded by the given coordinate space.
   */
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
      this.mesh.position.y += 0.6;
      this.mesh.rotation.y += 0.06;
    }
  };

  this.collect = function () {
    this.isCollected = true;
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

  // ===== ADD PURPLE GLOW (DEBUFF) =====
  addGlowEffect(this.mesh, 0x8b00ff, 1.5, 450); // Purple glow

  // Add purple aura
  const auraGeom = new THREE.SphereGeometry(80, 16, 16);
  const auraMat = new THREE.MeshBasicMaterial({
    color: 0x8b00ff,
    transparent: true,
    opacity: 0.12,
    side: THREE.BackSide
  });
  const glowSphere = new THREE.Mesh(auraGeom, auraMat);
  this.mesh.add(glowSphere);
  this.mesh.userData.glowSphere = glowSphere;

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
      this.mesh.position.y += 0.5;
      this.mesh.rotation.y += 0.05;
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

  // ===== ADD GLOW EFFECT =====
  addGlowEffect(this.mesh, 0x90ff90, 1.5, 450); // Green-white glow

  // Add subtle glow sphere
  const particleGeom = new THREE.SphereGeometry(120, 16, 16);
  const particleMat = new THREE.MeshBasicMaterial({
    color: 0x90ff90,
    transparent: true,
    opacity: 0.1,
    side: THREE.BackSide
  });
  const glowSphere = new THREE.Mesh(particleGeom, particleMat);
  this.mesh.add(glowSphere);
  this.mesh.userData.glowSphere = glowSphere;

  this.mesh.position.set(x, y, z);
  this.mesh.scale.set(s, s, s);
  this.scale = s;
  this.type = 'ballotbox';
  this.isCollected = false;

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
      this.mesh.position.y += 0.6;
      this.mesh.rotation.y += 0.05;
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

  // ===== ADD STRONG GLOW EFFECT =====
  addGlowEffect(this.mesh, 0xffd700, 2.5, 600); // Strong golden glow

  // Add golden aura
  const auraGeom = new THREE.SphereGeometry(150, 16, 16);
  const auraMat = new THREE.MeshBasicMaterial({
    color: 0xffd700,
    transparent: true,
    opacity: 0.15,
    side: THREE.BackSide
  });
  const glowSphere = new THREE.Mesh(auraGeom, auraMat);
  this.mesh.add(glowSphere);
  this.mesh.userData.glowSphere = glowSphere;

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
  };

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

  // ===== ADD GLOW EFFECT =====
  addGlowEffect(this.mesh, 0x90ff90, 1.5, 450); // Green-white glow

  // Add subtle glow sphere
  const particleGeom = new THREE.SphereGeometry(120, 16, 16);
  const particleMat = new THREE.MeshBasicMaterial({
    color: 0x90ff90,
    transparent: true,
    opacity: 0.1,
    side: THREE.BackSide
  });
  const glowSphere = new THREE.Mesh(particleGeom, particleMat);
  this.mesh.add(glowSphere);
  this.mesh.userData.glowSphere = glowSphere;

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

  // ===== ADD STRONG PURPLE GLOW (DEBUFF) =====
  addGlowEffect(this.mesh, 0x8b00ff, 2.0, 500); // Strong purple glow

  // Add dark aura
  const auraGeom = new THREE.SphereGeometry(130, 16, 16);
  const auraMat = new THREE.MeshBasicMaterial({
    color: 0x8b00ff,
    transparent: true,
    opacity: 0.18,
    side: THREE.BackSide
  });
  const glowSphere = new THREE.Mesh(auraGeom, auraMat);
  this.mesh.add(glowSphere);
  this.mesh.userData.glowSphere = glowSphere;


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

export function ColonialRemnant(x, y, z, s) {
  this.mesh = new THREE.Object3D();

  // ===== BUFF SYSTEM =====
  this.buffs = {
    trust: 0, // Không ảnh hưởng trực tiếp
    justice: 0, // Không ảnh hưởng trực tiếp
    unity: 0 // Không ảnh hưởng (hoặc có thể set âm nếu muốn)
  };
  this.buffValue = 0; // Vật phẩm trang trí/lịch sử

  const ironMat = new THREE.MeshBasicMaterial({ color: 0x555555 });
  const rustMat = new THREE.MeshBasicMaterial({ color: 0x7a5a3a });
  const flagMat = new THREE.MeshBasicMaterial({ color: 0x8b0000, side: THREE.DoubleSide });

  const SCALE = 2.5;

  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(10 * SCALE, 14 * SCALE, 80 * SCALE, 16),
    rustMat
  );
  post.position.set(0, 40 * SCALE, 0);
  this.mesh.add(post);

  function createChainSegment() {
    let ring = new THREE.Mesh(new THREE.TorusGeometry(8 * SCALE, 2 * SCALE, 12, 24), ironMat);
    ring.rotation.x = Math.PI / 2;
    return ring;
  }
  const chainGroup = new THREE.Group();
  for (let i = 0; i < 8; i++) {
    let c = createChainSegment();
    c.position.set(0, 80 * SCALE - i * (12 * SCALE), 0);
    chainGroup.add(c);
  }
  this.mesh.add(chainGroup);

  const flag = new THREE.Mesh(new THREE.PlaneGeometry(60 * SCALE, 40 * SCALE), flagMat);
  flag.position.set(35 * SCALE, 80 * SCALE, 0);
  flag.rotation.y = Math.PI / 2;
  this.mesh.add(flag);

  const rope = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2 * SCALE, 1.2 * SCALE, 60 * SCALE, 8),
    ironMat
  );
  rope.rotation.z = Math.PI / 2;
  rope.position.set(12 * SCALE, 80 * SCALE, 0);
  this.mesh.add(rope);

  this.mesh.position.set(x, y, z);
  this.mesh.scale.set(s, s, s);
  this.type = 'colonialRemnant';

  this.update = function () {
    flag.rotation.z = Math.sin(Date.now() * 0.002) * 0.1;
    chainGroup.children.forEach((link, i) => {
      link.rotation.y = Math.sin(Date.now() * 0.003 + i) * 0.1;
    });
  };

  this.collides = function (minX, maxX, minY, maxY, minZ, maxZ) {
    const scaleFactor = Math.sqrt(s) * 1.2;
    const size = 40 * SCALE * scaleFactor;
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

  addGlowEffect(this.mesh, 0x8b00ff, 1.8, 480); // Purple glow

  // Add ominous aura
  const auraGeom = new THREE.SphereGeometry(110, 16, 16);
  const auraMat = new THREE.MeshBasicMaterial({
    color: 0x8b00ff,
    transparent: true,
    opacity: 0.15,
    side: THREE.BackSide
  });
  const glowSphere = new THREE.Mesh(auraGeom, auraMat);
  this.mesh.add(glowSphere);
  this.mesh.userData.glowSphere = glowSphere;

  this.mesh.position.set(x, y, z);
  this.mesh.scale.set(s, s, s);
  this.type = 'puppetManipulation';

  this._rotationSpeed = 0.004;
  this.update = function () {
    this.mesh.rotation.y += this._rotationSpeed;
    head.rotation.y = Math.sin(Date.now() * 0.002) * 0.2;
    leftArm.rotation.z = Math.sin(Date.now() * 0.0015) * 0.3 + Math.PI / 4;
    rightArm.rotation.z = -Math.sin(Date.now() * 0.0015) * 0.3 - Math.PI / 4;
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
  var self = this;
  this.mesh = new THREE.Object3D();

  // ===== BUFF SYSTEM =====
  this.buffs = {
    trust: 0, // Không ảnh hưởng
    justice: 0, // Không ảnh hưởng
    unity: -30 // Giảm đoàn kết mạnh (bất công xã hội)
  };
  this.buffValue = -3000; // Điểm âm

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

  // ===== ADD PURPLE GLOW (DEBUFF) =====
  addGlowEffect(this.mesh, 0x8b00ff, 1.7, 470); // Purple glow

  // Add dark aura
  const auraGeom = new THREE.SphereGeometry(140, 16, 16);
  const auraMat = new THREE.MeshBasicMaterial({
    color: 0x8b00ff,
    transparent: true,
    opacity: 0.14,
    side: THREE.BackSide
  });
  const glowSphere = new THREE.Mesh(auraGeom, auraMat);
  this.mesh.add(glowSphere);
  this.mesh.userData.glowSphere = glowSphere;

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

export function ColonialGate(x, y, z, s) {
  var self = this;
  this.mesh = new THREE.Group();

  // ===== BUFF SYSTEM =====
  this.buffs = {
    trust: 0, // Không ảnh hưởng (chướng ngại vật)
    justice: 0, // Không ảnh hưởng
    unity: 0 // Không ảnh hưởng
  };
  this.buffValue = 0; // Vật cản deadly

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(12, 10, 4),
    new THREE.MeshStandardMaterial({ color: 0xd5d7d8 })
  );
  this.mesh.add(body);

  const arch = new THREE.Mesh(
    new THREE.TorusGeometry(6, 0.8, 16, 40, Math.PI),
    new THREE.MeshStandardMaterial({ color: 0x666666 })
  );
  arch.rotation.x = Math.PI / 2;
  arch.position.y = 5;
  this.mesh.add(arch);

  const emblem = new THREE.Mesh(
    new THREE.CircleGeometry(1.2, 24),
    new THREE.MeshStandardMaterial({ color: 0xd5d7d8 })
  );
  emblem.position.set(0, 4.5, 2.3);
  this.mesh.add(emblem);

  this.mesh.position.set(x, y, z);
  this.mesh.scale.set(s, s, s);
  this.scale = s;
  this.type = 'colonialGate';
  this.mesh.userData = { deadly: true };

  this.collides = function (minX, maxX, minY, maxY, minZ, maxZ) {
    const width = 10 * this.scale;
    const height = 12 * this.scale;
    const depth = 5 * this.scale;

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
}

export function CapitalistExpress(x, y, z, s) {
  this.mesh = new THREE.Group();
  this.type = "capitalistExpress";
  this.speed = 200; // nhanh hơn, cảm giác như tàu lao tới

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
    color: '#ffffff',
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
}
