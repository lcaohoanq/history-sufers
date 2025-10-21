function HammerAndSickle(x, y, z, s) {
  var self = this;
  this.mesh = new THREE.Object3D();

  // ===== GOLD MATERIAL =====
  const goldMaterial = new THREE.MeshStandardMaterial({
    color: 0xFFD700,
    metalness: 0.5,
    roughness: 0.5,
  });

  // ===== BÚA (phía TRƯỚC liềm) =====
  // Cán búa
  const handleGeom = new THREE.CylinderGeometry(3.5, 3.5, 130, 12);
  const handle = new THREE.Mesh(handleGeom, goldMaterial);
  handle.rotation.z = Math.PI * 0.30;
  handle.position.set(-8, -10, 5); // Z = 5 để chắc chắn nằm TRƯỚC liềm

  // Phần đầu búa
  const headGeom = new THREE.BoxGeometry(45, 18, 20);
  const head = new THREE.Mesh(headGeom, goldMaterial);
  head.rotation.z = Math.PI * 0.30;
  head.position.set(28, 22, 5);

  // (Nếu vẫn muốn có phần neck nhỏ nối)
  const neckGeom = new THREE.BoxGeometry(10, 20, 10);
  const neck = new THREE.Mesh(neckGeom, goldMaterial);
  neck.rotation.z = Math.PI * 0.30;
  neck.position.set(10, 5, 5);

  // ===== LIỀM (phía SAU búa) =====
  const sickleGeom = new THREE.TorusGeometry(90, 8, 24, 200, Math.PI * 1.55);
  const sickle = new THREE.Mesh(sickleGeom, goldMaterial);
  sickle.rotation.set(Math.PI / 2, 0, -Math.PI * 0.25);
  sickle.position.set(-10, 5, 0); // Z=0 -> nằm sau búa

  // Viền trong liềm (inner ring)
  const innerGeom = new THREE.TorusGeometry(75, 5, 16, 180, Math.PI * 1.5);
  const inner = new THREE.Mesh(innerGeom, goldMaterial);
  inner.rotation.set(Math.PI / 2, 0, -Math.PI * 0.25);
  inner.position.set(-10, 5, 0);

  // Mũi liềm – nằm đúng cuối vòng cung
  const bladeGeom = new THREE.ConeGeometry(9, 30, 12);
  const blade = new THREE.Mesh(bladeGeom, goldMaterial);
  blade.position.set(-78, 38, 0);
  blade.rotation.set(0, 0, -Math.PI * 0.6);

  // ===== THỨ TỰ ADD – LIỀM SAU, BÚA TRƯỚC =====
  this.mesh.add(sickle);
  this.mesh.add(inner);
  this.mesh.add(blade);
  this.mesh.add(handle);
  this.mesh.add(neck);
  this.mesh.add(head);

  // ===== XOAY TOÀN BỘ CHO ĐÚNG GÓC NHÌN CHÍNH DIỆN =====
  // (đặt thẳng đứng giống trên cờ)
  // this.mesh.rotation.x = -Math.PI / 2; // đưa từ nằm -> đứng
  this.mesh.rotation.z = Math.PI * 0.5; // nghiêng nhẹ đúng phong cách huy hiệu Liên Xô

  // ===== POSITION & SCALE =====
  this.mesh.position.set(x, y, z);
  this.mesh.scale.set(s, s, s);

  // ===== THUỘC TÍNH KHÁC =====
  this.scale = s;
  this.type = "hammerandsickle";
  this.isCollected = false;
  this.particles = [];

  // ===== COLLISION =====
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

  // ===== UPDATE =====
  this.update = function () {
    this.mesh.rotation.y += 0.008;
    if (this.isCollected) {
      this.mesh.position.y += 0.6;
      this.mesh.rotation.y += 0.06;
    }
    if (this.particles && this.particles.length > 0) {
      for (let i = this.particles.length - 1; i >= 0; i--) {
        let p = this.particles[i];
        p.position.y += 0.35;
        p.material.opacity -= 0.02;
        if (p.material.opacity <= 0) {
          this.mesh.remove(p);
          this.particles.splice(i, 1);
        }
      }
    }
  };

  // ===== WHEN COLLECTED =====
  this.collect = function () {
    this.isCollected = true;
    this.spawnParticles();
  };

  this.spawnParticles = function () {
    for (let i = 0; i < 18; i++) {
      let geom = new THREE.SphereGeometry(4, 8, 8);
      let mat = new THREE.MeshBasicMaterial({
        color: 0xFFD700,
        transparent: true,
        opacity: 1,
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


function BribeEnvelope(x, y, z, s) {
  var self = this;
  this.mesh = new THREE.Object3D();

  // ===== MATERIAL KHÔNG DÙNG TEXTURE =====
  // Giấy vàng ngà + metalness thấp để nhận ánh sáng tốt
  var paperMat = new THREE.MeshStandardMaterial({
    color: 0xE5D3B3,  // màu giấy hơi cũ
    roughness: 0.75,
    metalness: 0.05
  });

  // Tiền có màu xanh + hơi metallic + độ bóng thấp
  var moneyMat = new THREE.MeshStandardMaterial({
    color: 0x2E8B57,
    roughness: 0.4,
    metalness: 0.15
  });

  // ===== HÌNH PHONG BÌ (bo cạnh nhẹ để nhìn không quá phẳng) =====
  var envelope = new THREE.Mesh(
    new THREE.BoxGeometry(120, 80, 6, 1, 1, 1),
    paperMat
  );
  envelope.position.set(0, 0, 0);

  // ===== NẮP GẬP TAM GIÁC =====
  var flapShape = new THREE.Shape();
  flapShape.moveTo(-60, 0);
  flapShape.lineTo(60, 0);
  flapShape.lineTo(0, 50); // đỉnh tam giác
  flapShape.lineTo(-60, 0);

  var flapGeom = new THREE.ShapeGeometry(flapShape);
  var flap = new THREE.Mesh(flapGeom, paperMat);
  flap.position.set(0, 20, 3.5);
  flap.rotation.x = -Math.PI * 0.5;   // gập xuống

  // ===== TIỀN LÒI RA =====
  var money = new THREE.Mesh(
    new THREE.BoxGeometry(100, 65, 3),
    moneyMat
  );
  money.position.set(0, 5, -3.2);
  money.rotation.z = Math.PI * 0.02;

  // ===== VIỀN / NẾP GẤP PHONG BÌ (nhìn thật hơn) =====
  var creaseGeom = new THREE.PlaneGeometry(120, 0.8);
  var crease = new THREE.Mesh(creaseGeom, new THREE.MeshStandardMaterial({
    color: 0xD0C1A2,
    roughness: 0.85,
    metalness: 0.01
  }));
  crease.position.set(0, 0, 3.2);

  // ===== ĐÈN NHẸ TẠO HIỆU ỨNG KIM LOẠI + BÓNG =====
  var pointLight = new THREE.PointLight(0xffffff, 0.55, 200);
  pointLight.position.set(50, 50, 50);
  this.mesh.add(pointLight);

  // Gom các phần lại
  this.mesh.add(envelope);
  this.mesh.add(money);
  this.mesh.add(flap);
  this.mesh.add(crease);

  // Position & Scale
  this.mesh.position.set(x, y, z);
  this.mesh.scale.set(s, s, s);
  this.type = "bribeEnvelope";
  this.scale = s;
  this.isCollected = false;

  // ===== ANIMATION (xoay giống búa liềm) =====
  this.update = function () {
    this.mesh.rotation.y += 0.008;
    if (this.isCollected) {
      this.mesh.position.y += 0.5;
      this.mesh.rotation.y += 0.05;
    }
  };

  // ===== COLLISION =====
  this.collides = function (minX, maxX, minY, maxY, minZ, maxZ) {
    var obstMinX = self.mesh.position.x - this.scale * 80;
    var obstMaxX = self.mesh.position.x + this.scale * 80;
    var obstMinY = self.mesh.position.y;
    var obstMaxY = self.mesh.position.y + this.scale * 50;
    var obstMinZ = self.mesh.position.z - this.scale * 20;
    var obstMaxZ = self.mesh.position.z + this.scale * 20;
    return (
      obstMinX <= maxX && obstMaxX >= minX &&
      obstMinY <= maxY && obstMaxY >= minY &&
      obstMinZ <= maxZ && obstMaxZ >= minZ
    );
  };
}


function BallotBox(x, y, z, s) {
  var self = this;
  this.mesh = new THREE.Object3D();

  // ===== MATERIAL =====
  var boxMaterial = new THREE.MeshStandardMaterial({
    color: 0x278D3E,   // màu kim loại nhạt
    metalness: 0.4,
    roughness: 0.45
  });

  var slotMaterial = new THREE.MeshStandardMaterial({
    color: 0x222222,   // khe bỏ phiếu màu đen
    roughness: 0.3,
    metalness: 0.2
  });

  var ballotMaterial = new THREE.MeshStandardMaterial({
    color: 0xFFFFFF,   // giấy trắng
    roughness: 0.85,
    metalness: 0.05,
    side: THREE.DoubleSide
  });

  // ===== THÂN HỘP PHIẾU =====
  var boxGeometry = new THREE.BoxGeometry(200, 150, 200);
  var box = new THREE.Mesh(boxGeometry, boxMaterial);
  box.position.set(0, 75, 0);
  this.mesh.add(box);

  // ===== KHE BỎ PHIẾU =====
  var slotGeometry = new THREE.BoxGeometry(120, 2, 10);
  var slot = new THREE.Mesh(slotGeometry, slotMaterial);
  slot.position.set(0, 150, 0);
  this.mesh.add(slot);

  // ===== LÁ PHIẾU =====
  var ballotGeometry = new THREE.PlaneGeometry(80, 120);
  var ballot = new THREE.Mesh(ballotGeometry, ballotMaterial);
  ballot.position.set(0, 160, 0);
  ballot.rotation.x = -Math.PI * 0.45; // nghiêng về phía người chơi
  this.mesh.add(ballot);

  // ===== VỊ TRÍ & TỶ LỆ =====
  this.mesh.position.set(x, y, z);
  this.mesh.scale.set(s, s, s);
  this.scale = s;
  this.type = "ballotbox";
  this.isCollected = false;

  // ===== ANIMATION =====
  this.update = function() {
    // Hòm phiếu xoay nhẹ quanh trục Y
    this.mesh.rotation.y += 0.008;

    // Lá phiếu rung nhẹ (tạo hiệu ứng đang rơi xuống khe)
    ballot.position.y = 160 + Math.sin(Date.now() * 0.003) * 2;
    ballot.rotation.z = Math.sin(Date.now() * 0.002) * 0.05;

    if (this.isCollected) {
      this.mesh.position.y += 0.6;
      this.mesh.rotation.y += 0.05;
    }
  };

  // ===== COLLISION =====
  this.collides = function(minX, maxX, minY, maxY, minZ, maxZ) {
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
}


function RuleOfLawState(x, y, z, s) {
  var self = this;
  this.mesh = new THREE.Object3D();

  // ===== Materials =====
  var metalMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.2, roughness: 0.3 });
  var goldMat  = new THREE.MeshStandardMaterial({ color: 0xFFD700, metalness: 0.4, roughness: 0.3 });
  var woodMat  = new THREE.MeshStandardMaterial({ color: 0x8B5A2B, metalness: 0.2, roughness: 0.2 });
  var bookMat  = new THREE.MeshPhongMaterial({ color: 0xF3E5AB, shininess: 30 });

  // ===== Base =====
  var base = new THREE.Mesh(new THREE.BoxGeometry(220, 20, 120), woodMat);
  base.position.set(0, 10, 0);
  this.mesh.add(base);

  // Plinth
  var plinth = new THREE.Mesh(new THREE.BoxGeometry(120, 16, 60), metalMat);
  plinth.position.set(0, 38, 0);
  this.mesh.add(plinth);

  // ===== Pillar =====
  var post = new THREE.Mesh(new THREE.CylinderGeometry(6, 8, 180, 20), metalMat);
  post.position.set(0, 128, 0);
  this.mesh.add(post);

  // ===== Cross Arm =====
  var arm = new THREE.Mesh(new THREE.BoxGeometry(160, 8, 8), metalMat);
  arm.position.set(0, 200, 0);
  this.mesh.add(arm);

  var pivot = new THREE.Mesh(new THREE.SphereGeometry(8, 12, 12), goldMat);
  pivot.position.set(0, 200, 0);
  this.mesh.add(pivot);

  // ===== Pans =====
  function makePan() {
    var group = new THREE.Object3D();
    var plate = new THREE.Mesh(new THREE.CylinderGeometry(28, 28, 4, 32), metalMat);
    var hanger = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 40, 8), metalMat);
    plate.rotation.x = Math.PI;
    hanger.position.set(0, 20, 0);
    group.add(plate);
    group.add(hanger);
    return group;
  }

  var leftGroup = makePan();
  var rightGroup = makePan();
  leftGroup.position.set(-70, 160, 0);
  rightGroup.position.set(70, 160, 0);
  this.mesh.add(leftGroup, rightGroup);

  // Chains
  function chainBetween(x1,y1,z1,x2,y2,z2) {
    var len = Math.hypot(x2 - x1, y2 - y1, z2 - z1);
    var cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.6,0.6,len,8), metalMat);
    cyl.position.set((x1+x2)/2, (y1+y2)/2, (z1+z2)/2);
    cyl.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),
      new THREE.Vector3(x2-x1,y2-y1,z2-z1).normalize());
    return cyl;
  }
  this.mesh.add(chainBetween(-70,200,0, -70,180,0));
  this.mesh.add(chainBetween(70,200,0, 70,180,0));

  // ⭐ Star (mỏng hơn - đẹp hơn)
  var star = createThinStar(5, 40, 16, goldMat, 2);
  star.position.set(0, 260, -45); // đẩy ra sau
  star.rotation.x = -Math.PI / 10;
  this.mesh.add(star);

  // 📖 Constitution Book + stripe nhóm lại
  var bookGroup = new THREE.Object3D();
  var book = new THREE.Mesh(new THREE.BoxGeometry(60, 6, 40), bookMat);
  var stripe = new THREE.Mesh(new THREE.BoxGeometry(56, 2, 6),
    new THREE.MeshStandardMaterial({ color: 0x8B0000 }));
  book.position.set(0, 0, 0);
  stripe.position.set(0, 2, 12);
  bookGroup.position.set(0, 34, 0);
  bookGroup.add(book, stripe);
  this.mesh.add(bookGroup);

  // ===== Decorative Top =====
  var cap = new THREE.Mesh(new THREE.TorusGeometry(14, 2, 8, 24), goldMat);
  cap.position.set(0, 290, 0);
  cap.rotation.x = Math.PI / 2;
  this.mesh.add(cap);

  // ===== General transforms =====
  this.mesh.position.set(x, y, z);
  this.mesh.scale.set(s, s, s);
  this.scale = s;
  this.type = "ruleOfLawState";

  // ===== Animation State =====
  this._rotateEnabled = true;
  this._rotationSpeed = 0.005;
  this._tilt = 0;
  this._tiltDir = 1;

  // ===== Update =====
  this.update = function() {
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

  // ===== Collision =====
  this.collides = function(minX, maxX, minY, maxY, minZ, maxZ) {
    var obstMinX = self.mesh.position.x - this.scale * 110;
    var obstMaxX = self.mesh.position.x + this.scale * 110;
    var obstMinY = self.mesh.position.y;
    var obstMaxY = self.mesh.position.y + this.scale * 300; // Height includes the star
    var obstMinZ = self.mesh.position.z - this.scale * 60;
    var obstMaxZ = self.mesh.position.z + this.scale * 60;
    
    return (
      obstMinX <= maxX &&
      obstMaxX >= minX &&
      obstMinY <= maxY &&
      obstMaxY >= minY &&
      obstMinZ <= maxZ &&
      obstMaxZ >= minZ
    );
  };

  // ===== Helper: thin star =====
  function createThinStar(points, outer, inner, material, depth) {
    var shape = new THREE.Shape();
    for (var i=0; i<2*points; i++){
      var r = (i%2===0) ? outer : inner;
      var a = (i*Math.PI)/points - Math.PI/2;
      var x = Math.cos(a)*r;
      var y = Math.sin(a)*r;
      if(i===0) shape.moveTo(x,y);
      else shape.lineTo(x,y);
    }
    var geom = new THREE.ExtrudeGeometry(shape, { depth: depth, bevelEnabled: false });
    return new THREE.Mesh(geom, material);
  }
}


function ReformGears(x, y, z, s) {
  var self = this;
  this.mesh = new THREE.Object3D();

  // ===== Materials =====
  var metalMat = new THREE.MeshStandardMaterial({ color: 0x707070, metalness: 0.2, roughness: 0.35 });
  var goldMat = new THREE.MeshStandardMaterial({ color: 0xFFD700, metalness: 0.2, roughness: 0.2 });

  // ===== Gears group =====
  var gearsGroup = new THREE.Group();
  gearsGroup.position.set(0, 120, 0);
  gearsGroup.rotation.x = Math.PI / 2;
  this.mesh.add(gearsGroup);

  // Helper to create gear (simple cylinder + box "teeth")
  function createGear(radius, thickness, teeth, colorMat) {
    var g = new THREE.Group();
    
    // Main disc
    var disc = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, thickness, 64), colorMat);
    g.add(disc);

    // Teeth around the perimeter
    for (var i = 0; i < teeth; i++) {
      var angle = (i / teeth) * Math.PI * 2;
      var tooth = new THREE.Mesh(new THREE.BoxGeometry(radius * 0.25, thickness * 1.2, radius * 0.10), colorMat);
      // Position teeth around the edge of the disc
      tooth.position.set(Math.cos(angle) * (radius - radius * 0.01), 0, Math.sin(angle) * (radius - radius * 0.01));
      // Rotate each tooth to point outward from center
      tooth.rotation.y = angle;
      g.add(tooth);
    }
    return g;
  }

  // Create 3 gears
  var gearA = createGear(48, 10, 18, metalMat);
  var gearB = createGear(28, 10, 12, metalMat);
  var gearC = createGear(68, 10, 22, metalMat);

  // Position them like a triangle (symbolic connection)
  gearA.position.set(-70, 0, 0);
  gearB.position.set(0, 0, -50);
  gearC.position.set(90, 0, 10);

  // Pivot points (dễ xoay gear mà không lệch tâm)
  var pivotA = new THREE.Object3D(); pivotA.add(gearA); pivotA.position.copy(gearA.position);
  var pivotB = new THREE.Object3D(); pivotB.add(gearB); pivotB.position.copy(gearB.position);
  var pivotC = new THREE.Object3D(); pivotC.add(gearC); pivotC.position.copy(gearC.position);

  gearA.position.set(0, 0, 0);
  gearB.position.set(0, 0, 0);
  gearC.position.set(0, 0, 0);

  gearsGroup.add(pivotA);
  gearsGroup.add(pivotB);
  gearsGroup.add(pivotC);

  // Hubs (nút trục, màu vàng)
  var hubA = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 12, 12), goldMat); hubA.position.copy(pivotA.position); gearsGroup.add(hubA);
  var hubB = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 12, 12), goldMat); hubB.position.copy(pivotB.position); gearsGroup.add(hubB);
  var hubC = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 12, 12), goldMat); hubC.position.copy(pivotC.position); gearsGroup.add(hubC);

  // ===== Set position & scale outside =====
  this.mesh.position.set(x, y, z);
  this.mesh.scale.set(s, s, s);

  this.scale = s;
  this.type = "reformgears";
  this._gearSpeed = 0.015;
  this._time = 0;

  // ===== Update gears only =====
  this.update = function(delta) {
    this._time += (delta !== undefined) ? delta : 0.016;
    var speedB = this._gearSpeed;
    // Rotate around Y axis for proper front-facing view
    pivotB.rotation.y += speedB;
    pivotA.rotation.y -= speedB * (28 / 48); // Correct gear ratio
    pivotC.rotation.y -= speedB * (28 / 68); // Correct gear ratio

    // xoay toàn bộ theo trục y
    this.mesh.rotation.y += 0.004;
  };

  // ===== Simple collision box =====
  this.collides = function(minX, maxX, minY, maxY, minZ, maxZ) {
    var obstMinX = self.mesh.position.x - this.scale * 200;
    var obstMaxX = self.mesh.position.x + this.scale * 200;
    var obstMinY = self.mesh.position.y;
    var obstMaxY = self.mesh.position.y + this.scale * 260;
    var obstMinZ = self.mesh.position.z - this.scale * 150;
    var obstMaxZ = self.mesh.position.z + this.scale * 150;

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



function UnityHands(x, y, z, s) {
  var self = this;
  this.mesh = new THREE.Object3D();

  // ====== Materials ======
  var skinMat = new THREE.MeshStandardMaterial({ color: 0xF2D2B6, roughness: 0.2 });
  var bookMat = new THREE.MeshStandardMaterial({ color: 0x3E2723 });
  var gearMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.3, roughness: 0.4 });
  var hoeMat  = new THREE.MeshStandardMaterial({ color: 0x665544 });

  // ====== Helper: Tạo bàn tay đơn giản ======
  function createHand() {
    var hand = new THREE.Object3D();

    // Lòng bàn tay
    var palm = new THREE.Mesh(new THREE.BoxGeometry(40, 15, 50), skinMat);
    palm.position.set(0, 0, 0);
    hand.add(palm);

    // 4 ngón tay
    for (let i = -1.5; i <= 1.5; i++) {
      var finger = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 30), skinMat);
      finger.position.set(i * 12, 0, 35);
      hand.add(finger);
    }
    return hand;
  }

  // ====== Đạo cụ ======
  function createBook() {
    return new THREE.Mesh(new THREE.BoxGeometry(30, 10, 40), bookMat);
  }

  function createGear() {
    return new THREE.Mesh(new THREE.CylinderGeometry(20, 20, 8, 16), gearMat);
  }

  function createHoe() {
    var hoe = new THREE.Object3D();
    var handle = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 80, 8), hoeMat);
    var head   = new THREE.Mesh(new THREE.BoxGeometry(30, 4, 10), hoeMat);
    head.position.set(0, 40, 10);
    hoe.add(handle); hoe.add(head);
    return hoe;
  }

  // ====== Tạo 3 bàn tay ======
  var handWorker = createHand(); // công nhân
  var handFarmer = createHand(); // nông dân
  var handScholar = createHand(); // trí thức

  // Vị trí & xoay các tay để chụm vào tâm
  handWorker.position.set(-50, 0, 0);  // tăng khoảng cách giữa các tay
  handWorker.rotation.set(0, Math.PI * 0.2, 0);

  handFarmer.position.set(50, 0, 0);   // tăng khoảng cách giữa các tay
  handFarmer.rotation.set(0, -Math.PI * 0.2, 0);

  handScholar.position.set(0, 0, -50); // tăng khoảng cách giữa các tay
  handScholar.rotation.set(-Math.PI * 0.2, 0, 0);

  // ====== Gắn đạo cụ trên tay ======
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

  // Add vào mesh tổng
  this.mesh.add(handWorker);
  this.mesh.add(handFarmer);
  this.mesh.add(handScholar);

  // Vị trí cao hơn so với mặt đất (tăng y) và tỉ lệ lớn hơn
  this.mesh.position.set(x, y + 100, z); // Nâng cao hơn 100 đơn vị
  this.mesh.scale.set(s * 1.5, s * 1.5, s * 1.5); // To hơn 50%
  this.type = "unityhands";

  // cho mesh tổng chính diện user nhìn
  this.mesh.rotation.x = Math.PI / 4;
  this.mesh.rotation.y = Math.PI;
  
  this.update = function() {
    // xoay toàn bộ theo trục y
    this.mesh.rotation.y += 0.004;
  };

  // ===== Collision =====
  this.collides = function(minX, maxX, minY, maxY, minZ, maxZ) {
    // Điều chỉnh vùng va chạm cho phù hợp với kích thước mới
    var size = 150 * this.scale; // Tăng vùng va chạm
    var cx = self.mesh.position.x;
    var cy = self.mesh.position.y;
    var cz = self.mesh.position.z;

    return (
      cx - size < maxX && cx + size > minX &&
      cy < maxY && cy + size > minY &&
      cz - size < maxZ && cz + size > minZ
    );
  };
}

function CorruptedThrone(x, y, z, s) {
  this.mesh = new THREE.Object3D();

  // ===== Materials =====
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x4b3621, roughness: 0.3, metalness: 0.5 });
  const webMat  = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 });
  const vineMat = new THREE.MeshStandardMaterial({ color: 0x556b2f, roughness: 0.4 });

  // ===== Main Throne – Scale to match previous asset size =====
  const SCALE = 1.5; // giống kiểu bạn muốn phóng nội bộ trước

  const seat = new THREE.Mesh(new THREE.BoxGeometry(80*SCALE, 20*SCALE, 80*SCALE), woodMat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(80*SCALE, 120*SCALE, 15*SCALE), woodMat);

  const armL = new THREE.Mesh(new THREE.BoxGeometry(15*SCALE, 40*SCALE, 60*SCALE), woodMat);
  const armR = armL.clone();
  armL.position.set(-50*SCALE, 40*SCALE, 0);
  armR.position.set(50*SCALE, 40*SCALE, 0);

  const leg1 = new THREE.Mesh(new THREE.BoxGeometry(15*SCALE, 50*SCALE, 15*SCALE), woodMat);
  const leg2 = leg1.clone(), leg3 = leg1.clone(), leg4 = leg1.clone();
  leg1.position.set(-30*SCALE, 10*SCALE, 30*SCALE);
  leg2.position.set(30*SCALE, 10*SCALE, 30*SCALE);
  leg3.position.set(-30*SCALE, 10*SCALE, -30*SCALE);
  leg4.position.set(30*SCALE, 10*SCALE, -30*SCALE);

  back.position.set(0, 70*SCALE, -35*SCALE);
  seat.position.set(0, 25*SCALE, 0);

  this.mesh.add(seat, back, armL, armR, leg1, leg2, leg3, leg4);

  // ===== Webs =====
  function createWeb(size, pos, rot) {
    let web = new THREE.Mesh(new THREE.PlaneGeometry(size*SCALE, size*SCALE), webMat);
    web.position.set(pos.x*SCALE, pos.y*SCALE, pos.z*SCALE);
    web.rotation.set(rot.x, rot.y, rot.z);
    return web;
  }
  this.mesh.add(
    createWeb(70, {x:-40, y:60, z:0}, {x:0, y:Math.PI/2, z:0}),
    createWeb(60, {x:0, y:40, z:45}, {x:Math.PI/2, y:0, z:0})
  );

  // ===== Vines =====
  function createVine(pos, rot) {
    const vine = new THREE.Mesh(new THREE.CylinderGeometry(2*SCALE, 2*SCALE, 100*SCALE, 8), vineMat);
    vine.position.set(pos.x*SCALE, pos.y*SCALE, pos.z*SCALE);
    vine.rotation.set(rot.x, rot.y, rot.z);
    return vine;
  }
  this.mesh.add(
    createVine({x:20, y:60, z:-20}, {x:Math.PI*0.4, y:0, z:0}),
    createVine({x:-25, y:50, z:10}, {x:-Math.PI*0.3, y:0, z:Math.PI*0.2})
  );

  // Final
  this.mesh.position.set(x, y, z);
  this.mesh.scale.set(s, s, s); // game có thể scale thêm
  this.type = "corruptedThrone";

  // Optional: auto rotate
  this.update = function() {
    this.mesh.rotation.y += 0.003;
  };
}

function ColonialRemnant(x, y, z, s) {
  this.mesh = new THREE.Object3D();

  // ===== Materials =====
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.5, roughness: 0.6 });
  const rustMat = new THREE.MeshStandardMaterial({ color: 0x7a5a3a, metalness: 0.2, roughness: 0.9 });
  const flagMat = new THREE.MeshStandardMaterial({ color: 0x8b0000, roughness: 1, side: THREE.DoubleSide });

  // 📌 Tăng hệ số chung (to tương tự Puppet / RuleOfLawState)
  const SCALE = 2.5; // điều chỉnh cho phù hợp tất cả object trong cùng hệ

  // ===== 1. Cọc xiềng – lớn hơn =====
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(10 * SCALE, 14 * SCALE, 80 * SCALE, 16),
    rustMat
  );
  post.position.set(0, 40 * SCALE, 0);
  this.mesh.add(post);

  // ===== 2. Xiềng xích – vòng to + dài hơn =====
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

  // ===== 3. Lá cờ – lớn hơn =====
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(60 * SCALE, 40 * SCALE), flagMat);
  flag.position.set(35 * SCALE, 80 * SCALE, 0);
  flag.rotation.y = Math.PI / 2;
  this.mesh.add(flag);

  // ===== 4. Dây cờ – kéo dài theo cột =====
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(1.2 * SCALE, 1.2 * SCALE, 60 * SCALE, 8), ironMat);
  rope.rotation.z = Math.PI / 2;
  rope.position.set(12 * SCALE, 80 * SCALE, 0);
  this.mesh.add(rope);

  // ===== Final =====
  this.mesh.position.set(x, y, z);
  this.mesh.scale.set(s, s, s);
  this.type = "colonialRemnant";

  // ===== Animation (cờ + xích đung đưa nhẹ) =====
  this.update = function () {
    flag.rotation.z = Math.sin(Date.now() * 0.002) * 0.1;
    chainGroup.children.forEach((link, i) => {
      link.rotation.y = Math.sin(Date.now() * 0.003 + i) * 0.1;
    });
  };

  // ===== Collision box mở rộng theo scale =====
  this.collides = function (minX, maxX, minY, maxY, minZ, maxZ) {
    const size = 150 * SCALE * s;
    const px = this.mesh.position.x;
    const py = this.mesh.position.y;
    const pz = this.mesh.position.z;
    return (
      px - size <= maxX && px + size >= minX &&
      py <= maxY && py + size >= minY &&
      pz - size <= maxZ && pz + size >= minZ
    );
  };
}



function PuppetManipulation(x, y, z, s) {
  this.mesh = new THREE.Object3D();

  // ===== Materials (Gỗ là chính) =====
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.6, metalness: 0.1 });
  const stringMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 });

  // ===== 1. Puppet Body (Scale LỚN hơn phiên bản cũ) =====
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

  // ===== 2. Invisible Strings =====
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

  // ===== 3. Thanh Điều Khiển (Hand / Crossbar) =====
  const handBar = new THREE.Mesh(new THREE.BoxGeometry(80, 15, 30), woodMat);
  handBar.position.set(0, 215, 0);
  handBar.rotation.x = -Math.PI * 0.1;
  this.mesh.add(handBar);

  // ===== Final Transform =====
  this.mesh.position.set(x, y, z);
  this.mesh.scale.set(s, s, s); // scale từ bên ngoài game truyền vào
  this.type = "puppetManipulation";

  // ===== Animation + Xoay quanh trục Y =====
  this._rotationSpeed = 0.004; // tốc độ xoay
  this.update = function () {
    this.mesh.rotation.y += this._rotationSpeed;
    head.rotation.y = Math.sin(Date.now() * 0.002) * 0.2;
    leftArm.rotation.z = Math.sin(Date.now() * 0.0015) * 0.3 + Math.PI / 4;
    rightArm.rotation.z = -Math.sin(Date.now() * 0.0015) * 0.3 - Math.PI / 4;
  };

  // ===== Collision (nếu cần dùng cho game) =====
  this.collides = function(minX, maxX, minY, maxY, minZ, maxZ) {
    let size = 150 * s;
    let px = this.mesh.position.x;
    let py = this.mesh.position.y;
    let pz = this.mesh.position.z;
    return (px - size <= maxX && px + size >= minX &&
            py <= maxY && py + size >= minY &&
            pz - size <= maxZ && pz + size >= minZ);
  };
}


function MisbalancedScale(x, y, z, s) {
  var self = this;
  this.mesh = new THREE.Object3D();

  // ===== Materials =====
  var metalMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.2, roughness: 0.35 });
  var darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.25, roughness: 0.4 });
  var goldMat = new THREE.MeshStandardMaterial({ color: 0xD4AF37, metalness: 0.5, roughness: 0.3 });
  var dullWoodMat = new THREE.MeshStandardMaterial({ color: 0x4b3a2a, metalness: 0.1, roughness: 0.6 });

  // ===== Base =====
  var base = new THREE.Mesh(new THREE.BoxGeometry(220, 20, 120), dullWoodMat);
  base.position.set(0, 10, 0);
  this.mesh.add(base);

  var plinth = new THREE.Mesh(new THREE.BoxGeometry(140, 18, 70), darkMetalMat);
  plinth.position.set(0, 38, 0);
  this.mesh.add(plinth);

  // ===== Pillar =====
  var pillar = new THREE.Mesh(new THREE.CylinderGeometry(7, 9, 180, 20), metalMat);
  pillar.position.set(0, 128, 0);
  this.mesh.add(pillar);

  // ===== Beam =====
  var beam = new THREE.Mesh(new THREE.BoxGeometry(220, 10, 10), metalMat);
  beam.position.set(0, 200, 0);
  this.mesh.add(beam);

  var pivot = new THREE.Mesh(new THREE.SphereGeometry(10, 16, 16), goldMat);
  pivot.position.set(0, 200, 0);
  this.mesh.add(pivot);

  // ===== Scale Pans =====
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

  // ===== Person =====
  var person = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 40, 12), new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.7 }));
  person.position.set(0, 22, 0);
  leftPan.add(person);

  // ===== Gold blocks =====
  for (let i = 0; i < 3; i++) {
    let gold = new THREE.Mesh(new THREE.BoxGeometry(30, 15, 20), goldMat);
    gold.position.set(i * 25 - 25, 10, 0);
    rightPan.add(gold);
  }

  // ===== Initial Setup =====
  this.mesh.position.set(x, y, z);
  this.mesh.scale.set(s, s, s);
  this.type = "misbalancedScale";

  // ===== Collider =====
  this.collider = new THREE.Box3().setFromObject(this.mesh);

  // ===== Animation State =====
  this._tilt = -0.12;
  this._rotateEnabled = true;
  this._rotationSpeed = 0.004;

  // ===== Update =====
  this.update = function () {
    if (this._rotateEnabled) this.mesh.rotation.y += this._rotationSpeed;

    beam.rotation.z = this._tilt;
    pivot.rotation.z = this._tilt * 0.5;
    leftPan.rotation.z = -this._tilt * 1.2;
    rightPan.rotation.z = this._tilt * 1.2;

    // Cập nhật collider sau khi xoay/nghiêng
    this.collider.setFromObject(this.mesh);
  };

  // ===== Collision Check =====
  this.collides = function (minX, maxX, minY, maxY, minZ, maxZ) {
    const px = this.mesh.position.x;
    const py = this.mesh.position.y;
    const pz = this.mesh.position.z;
    const size = 200 * s; // mở rộng cho phù hợp scale object

    return (
      px - size <= maxX && px + size >= minX &&
      py - size <= maxY && py + size >= minY &&
      pz - size <= maxZ && pz + size >= minZ
    );
  };
}

