/**
 * modelAssembly.js
 * Assembles the full CAD machine geometry matching the reference schematic:
 * - Slotted baseplate bed with transverse mounting ties
 * - Support risers (with counterbored face holes)
 * - 6x UCP 205 Pillow block bearings with brass grease zerks and internal ball raceways
 * - 3x Ground steel transmission shafts (Input, Intermediate, Output)
 * - 4x Involute spur gears (18T -> 54T -> 18T -> 54T)
 * - Transparent cutaway mode and exploded view animation system
 */

class MachineAssembly {
  constructor(scene) {
    this.scene = scene;
    this.rootGroup = new THREE.Group();
    this.scene.add(this.rootGroup);

    // Assembly parameter constants (mm)
    this.module = 4;
    this.zPinion = 18;
    this.zWheel = 54;
    this.rPinion = (this.module * this.zPinion) / 2; // 36 mm
    this.rWheel = (this.module * this.zWheel) / 2;   // 108 mm
    this.centerDist = this.rPinion + this.rWheel;   // 144 mm
    this.shaftRadius = 12;
    this.shaftLength = 390;

    // Shaft coordinates
    // Shaft 1 (Input): X = -144
    // Shaft 2 (Intermediate): X = 0
    // Shaft 3 (Output): X = +144
    // Height: Shaft centerline at Y = 135 mm above ground (riser 45mm + pillow block center 90mm)
    this.shaftY = 135;
    this.shaftX = {
      input: -this.centerDist,
      intermediate: 0,
      output: this.centerDist
    };

    // Gear Z positions along shaft axis (Staggered Gears - No Interference)
    this.zStage1 = -15;   // Mesh 1: Pinion 1 (18T) on Shaft 1 <-> Wheel 2 (54T) on Shaft 2
    this.zStage2 = +105;  // Mesh 2: Pinion 3 (18T) on Shaft 2 <-> Wheel 4 (54T) on Shaft 3

    // Material library
    this.initMaterials();

    // Component tracking arrays for animation & cutaway
    this.bearings = [];
    this.bearingHousings = [];
    this.internalBalls = [];
    this.gears = {};
    this.shaftGroups = {};
    this.explodedComponents = [];
    this.pitchOverlays = [];

    // Build the assembly
    this.buildBaseplate();
    this.buildRisers();
    this.buildBearingsAndShafts();
    this.buildGears();
    this.buildKinematicOverlays();

    // 6. Electric Motor Drive System (Dolang Training Kit Model)
    this.motorDrive = new MotorDriveSystem(this.rootGroup, this.shaftY, this.shaftRadius);
  }

  initMaterials() {
    // 1. Industrial green cast iron for pillow block housings (CAD reference color #2e8b57)
    this.castIronGreenMat = new THREE.MeshStandardMaterial({
      color: 0x2e8b57,
      roughness: 0.52,
      metalness: 0.18,
      bumpScale: 0.05
    });

    // 1b. Optical transparent cutaway material for bearing housings
    this.cutawayHousingMat = new THREE.MeshStandardMaterial({
      color: 0x86efac,
      opacity: 0.38,
      transparent: true,
      roughness: 0.2,
      metalness: 0.12,
      depthWrite: false
    });

    // 2. Hardened blackened carbon steel for gear teeth (#2c323b)
    this.gearSteelMat = new THREE.MeshStandardMaterial({
      color: 0x282e37,
      roughness: 0.34,
      metalness: 0.88
    });

    // 3. Precision ground transmission steel for shafts & bearing raceways
    this.groundShaftMat = new THREE.MeshStandardMaterial({
      color: 0xd6dde5,
      roughness: 0.18,
      metalness: 0.94
    });

    // 4. Mirror-polished chrome steel for bearing rolling balls
    this.chromeBallMat = new THREE.MeshStandardMaterial({
      color: 0xf5f8fc,
      roughness: 0.04,
      metalness: 0.98
    });

    // 5. Brass lubrication fittings (grease zerks) & ball cages
    this.brassMat = new THREE.MeshStandardMaterial({
      color: 0xd8ad34,
      roughness: 0.28,
      metalness: 0.82
    });

    // 6. Machined tool steel for slotted base bedplates
    this.slottedBedMat = new THREE.MeshStandardMaterial({
      color: 0xdedede,
      roughness: 0.38,
      metalness: 0.45
    });

    // 7. Dark treated structural steel for support risers & fasteners
    this.riserMat = new THREE.MeshStandardMaterial({
      color: 0x474e56,
      roughness: 0.44,
      metalness: 0.62
    });

    // 8. Bolt & washer black oxide steel
    this.boltMat = new THREE.MeshStandardMaterial({
      color: 0x1d2127,
      roughness: 0.35,
      metalness: 0.85
    });
  }

  // ==========================================
  // 1. BASEPLATE WITH SLOTTED T-RAILS
  // ==========================================
  // ==========================================
  // 1. UNIFIED PRECISION BASE PLATE WITH TRANSVERSE T-SLOTS
  // ==========================================
  buildBaseplate() {
    const baseGroup = new THREE.Group();
    baseGroup.name = 'UnifiedBaseplateAssembly';

    // A. Longitudinal foundation support ties underneath (spanning Z = -500 to +220)
    const tieGeom = new THREE.BoxGeometry(36, 16, 720);
    [-144, 0, 144].forEach((xPos) => {
      const tieMesh = new THREE.Mesh(tieGeom, this.riserMat);
      tieMesh.position.set(xPos, 8, -140);
      tieMesh.castShadow = true;
      tieMesh.receiveShadow = true;
      baseGroup.add(tieMesh);
    });

    // B. Transverse T-slotted bed plates spanning across the machine width
    // Matching the engineering schematic: 8 sections across Z = -280 to +200
    const plateWidthX = 440; // Spanning X = -220 to +220
    const plateHeight = 18;
    const plateDepthZ = 52;
    const zPositions = [-270, -205, -140, -75, -10, 55, 120, 185];

    zPositions.forEach((zPos) => {
      const plateMesh = new THREE.Mesh(
        new THREE.BoxGeometry(plateWidthX, plateHeight, plateDepthZ),
        this.slottedBedMat
      );
      plateMesh.position.set(0, 16 + plateHeight / 2, zPos);
      plateMesh.castShadow = true;
      plateMesh.receiveShadow = true;
      baseGroup.add(plateMesh);

      // Central milled T-slot channel running across X
      const tSlotGeom = new THREE.BoxGeometry(plateWidthX - 24, 10, 14);
      const tSlotMat = new THREE.MeshStandardMaterial({ color: 0x303640, roughness: 0.5 });
      const tSlot = new THREE.Mesh(tSlotGeom, tSlotMat);
      tSlot.position.set(0, 16 + plateHeight - 4, zPos);
      baseGroup.add(tSlot);

      // Counterbored mounting pockets
      [-144, 0, 144].forEach((xHole) => {
        if (zPos === -140 && xHole === -144) return; // Clean clearance directly under belt drive pulley
        const pocketGeom = new THREE.CylinderGeometry(9, 9, 6, 20);
        const pocket = new THREE.Mesh(pocketGeom, this.boltMat);
        pocket.position.set(xHole, 16 + plateHeight - 2, zPos);
        baseGroup.add(pocket);
      });
    });

    // C. Motor & Gearbox Precision Base Extension Plate (left section: Z = -490 to -280)
    const motorPlateW = 260; // X = -220 to +40
    const motorPlateL = 200; // Z = -490 to -290
    const motorPlateMesh = new THREE.Mesh(
      new THREE.BoxGeometry(motorPlateW, plateHeight, motorPlateL),
      this.slottedBedMat
    );
    motorPlateMesh.position.set(-90, 16 + plateHeight / 2, -390);
    motorPlateMesh.castShadow = true;
    motorPlateMesh.receiveShadow = true;
    baseGroup.add(motorPlateMesh);

    // Motor bedplate T-slots running across X
    [-450, -390, -330].forEach((zSlot) => {
      const mSlotGeom = new THREE.BoxGeometry(motorPlateW - 20, 10, 14);
      const mSlotMat = new THREE.MeshStandardMaterial({ color: 0x303640, roughness: 0.5 });
      const mSlot = new THREE.Mesh(mSlotGeom, mSlotMat);
      mSlot.position.set(-90, 16 + plateHeight - 4, zSlot);
      baseGroup.add(mSlot);
    });

    this.rootGroup.add(baseGroup);
    this.explodedComponents.push({
      group: baseGroup,
      basePos: baseGroup.position.clone(),
      explodedOffset: new THREE.Vector3(0, -35, 0)
    });
  }

  // ==========================================
  // 2. PRECISION RISER BLOCKS (8 PEDESTALS)
  // ==========================================
  buildRisers() {
    this.risersGroup = new THREE.Group();
    this.risersGroup.name = 'RisersGroup';

    // Riser dimensions: 45mm height, 72mm wide along Z, 48mm deep along X
    const riserW = 48;
    const riserH = 45;
    const riserL = 72;
    const riserY = 34 + riserH / 2; // Y = 56.5 (top at Y = 79)

    // Placement for 7 bearing pedestals matching CAD schematic:
    // Shaft 1 (Drive Shaft, X = -144): Z = -70, +45, +165
    // Shaft 2 (Intermediate, X = 0):   Z = +45 (between gears)
    // Shaft 3 (Final Output, X = +144): Z = -70, +45, +165
    const riserConfigs = [
      { id: 'R1_1', x: this.shaftX.input, z: -70 },
      { id: 'R1_2', x: this.shaftX.input, z: +45 },
      { id: 'R1_3', x: this.shaftX.input, z: +165 },
      { id: 'R2_2', x: this.shaftX.intermediate, z: +45 },
      { id: 'R3_1', x: this.shaftX.output, z: -70 },
      { id: 'R3_2', x: this.shaftX.output, z: +45 },
      { id: 'R3_3', x: this.shaftX.output, z: +165 }
    ];

    riserConfigs.forEach((cfg) => {
      const riserBox = new THREE.Mesh(
        new THREE.BoxGeometry(riserW, riserH, riserL),
        this.riserMat
      );
      riserBox.position.set(cfg.x, riserY, cfg.z);
      riserBox.castShadow = true;
      riserBox.receiveShadow = true;
      this.risersGroup.add(riserBox);

      // Distinctive counterbored horizontal holes matching CAD
      [-20, +20].forEach((zOff) => {
        const holeGeom = new THREE.CylinderGeometry(7, 7, 8, 20);
        holeGeom.rotateZ(Math.PI / 2);
        const holeMesh = new THREE.Mesh(holeGeom, this.boltMat);
        holeMesh.position.set(cfg.x - riserW / 2 + 3.9, riserY, cfg.z + zOff);
        this.risersGroup.add(holeMesh);
      });

      // Clamping stud bolts securing riser into bedplate T-slots
      [-24, +24].forEach((zBolt) => {
        const stud = new THREE.Mesh(
          new THREE.CylinderGeometry(4.5, 4.5, 12, 16),
          this.boltMat
        );
        stud.position.set(cfg.x, riserY + riserH / 2 + 4, cfg.z + zBolt);
        stud.castShadow = true;
        this.risersGroup.add(stud);
      });
    });

    this.rootGroup.add(this.risersGroup);
    this.explodedComponents.push({
      group: this.risersGroup,
      basePos: this.risersGroup.position.clone(),
      explodedOffset: new THREE.Vector3(0, -18, 0)
    });
  }

  // ==========================================
  // 3. PILLOW BLOCK BEARINGS (7x UCP 205) & SHAFTS
  // ==========================================
  buildBearingsAndShafts() {
    const bearingLocations = [
      { shaft: 'input', x: this.shaftX.input, z: -70, name: 'Bearing_Input_1' },
      { shaft: 'input', x: this.shaftX.input, z: +45, name: 'Bearing_Input_2' },
      { shaft: 'input', x: this.shaftX.input, z: +165, name: 'Bearing_Input_3' },
      { shaft: 'intermediate', x: this.shaftX.intermediate, z: +45, name: 'Bearing_Inter_2' },
      { shaft: 'output', x: this.shaftX.output, z: -70, name: 'Bearing_Output_1' },
      { shaft: 'output', x: this.shaftX.output, z: +45, name: 'Bearing_Output_2' },
      { shaft: 'output', x: this.shaftX.output, z: +165, name: 'Bearing_Output_3' }
    ];

    bearingLocations.forEach((loc) => {
      const bGroup = this.createPillowBlockBearing(loc.name);
      bGroup.position.set(loc.x, this.shaftY, loc.z);
      this.rootGroup.add(bGroup);
      this.bearings.push(bGroup);

      // Register for exploded view
      const explodeY = 40;
      const explodeZ = loc.z > 0 ? 40 : -40;
      this.explodedComponents.push({
        group: bGroup,
        basePos: bGroup.position.clone(),
        explodedOffset: new THREE.Vector3(0, explodeY, explodeZ)
      });
    });

    // Transmission Shafts (Input / Drive, Intermediate, Output)
    // startZ and endZ aligned to split coupling (Z=-165) and flanged coupling (Z=-162)
    const shaftConfigs = [
      { name: 'input', x: this.shaftX.input, startZ: -202, endZ: 195, keyZ: -15 },
      { name: 'intermediate', x: this.shaftX.intermediate, startZ: -159, endZ: 135, keyZ: 45 },
      { name: 'output', x: this.shaftX.output, startZ: -140, endZ: 195, keyZ: 105 }
    ];

    shaftConfigs.forEach((cfg) => {
      const shaftGroup = new THREE.Group();
      shaftGroup.name = `Shaft_${cfg.name}`;
      shaftGroup.position.set(cfg.x, this.shaftY, 0);

      const curLen = cfg.endZ - cfg.startZ;
      const curPosZ = (cfg.startZ + cfg.endZ) / 2;

      const shaftGeom = new THREE.CylinderGeometry(this.shaftRadius, this.shaftRadius, curLen, 48);
      shaftGeom.rotateX(Math.PI / 2);
      const shaftMesh = new THREE.Mesh(shaftGeom, this.groundShaftMat);
      shaftMesh.position.z = curPosZ;
      shaftMesh.castShadow = true;
      shaftMesh.receiveShadow = true;
      shaftGroup.add(shaftMesh);



      // Shaft end chamfers
      [cfg.startZ, cfg.endZ].forEach((zEnd) => {
        const ringGeom = new THREE.RingGeometry(this.shaftRadius - 1.5, this.shaftRadius, 32);
        const ringMesh = new THREE.Mesh(ringGeom, this.groundShaftMat);
        ringMesh.position.z = zEnd;
        shaftGroup.add(ringMesh);
      });

      this.rootGroup.add(shaftGroup);
      this.shaftGroups[cfg.name] = shaftGroup;

      this.explodedComponents.push({
        group: shaftGroup,
        basePos: shaftGroup.position.clone(),
        explodedOffset: new THREE.Vector3(0, 0, cfg.name === 'intermediate' ? 0 : (cfg.name === 'input' ? -35 : +35))
      });
    });
  }

  /**
   * Constructs an authentic UCP 205 Pillow Block Bearing with internal ball raceway
   */
  createPillowBlockBearing(name) {
    const bGroup = new THREE.Group();
    bGroup.name = name;

    // A. Outer Cast-Iron Housing (UCP 205 style)
    const housingGroup = new THREE.Group();
    housingGroup.name = 'HousingGroup';

    // 1. Base mounting foot with dual slotted bolt ears
    const footShape = new THREE.Shape();
    footShape.moveTo(-65, -55);
    footShape.lineTo(65, -55);
    footShape.lineTo(62, -35);
    footShape.lineTo(38, -25);
    footShape.lineTo(-38, -25);
    footShape.lineTo(-62, -35);
    footShape.closePath();

    const footExtrude = { depth: 40, bevelEnabled: true, bevelThickness: 2, bevelSize: 2, bevelSegments: 2 };
    const footGeom = new THREE.ExtrudeGeometry(footShape, footExtrude);
    footGeom.translate(0, 0, -20);
    const footMesh = new THREE.Mesh(footGeom, this.castIronGreenMat);
    footMesh.castShadow = true;
    footMesh.receiveShadow = true;
    housingGroup.add(footMesh);

    // Mounting slotted ear holes & bolts
    [-50, +50].forEach((xSlot) => {
      const boltMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(8, 8, 22, 6), // Hex bolt head
        this.boltMat
      );
      boltMesh.position.set(xSlot, -45, 0);
      boltMesh.castShadow = true;
      housingGroup.add(boltMesh);

      // Washer
      const washer = new THREE.Mesh(
        new THREE.CylinderGeometry(11, 11, 2, 20),
        this.groundShaftMat
      );
      washer.position.set(xSlot, -53, 0);
      housingGroup.add(washer);
    });

    // 2. Central Arch Housing supporting the spherical bearing insert
    const archGeom = new THREE.CylinderGeometry(38, 42, 38, 36);
    archGeom.rotateX(Math.PI / 2);
    const archMesh = new THREE.Mesh(archGeom, this.castIronGreenMat);
    archMesh.castShadow = true;
    archMesh.receiveShadow = true;
    housingGroup.add(archMesh);

    // 3. Top Brass Grease Zerk (lubrication nipple fitting)
    const zerkGroup = new THREE.Group();
    const hexNipple = new THREE.Mesh(
      new THREE.CylinderGeometry(3.5, 3.5, 5, 6),
      this.brassMat
    );
    hexNipple.position.y = 40;
    zerkGroup.add(hexNipple);

    const ballNipple = new THREE.Mesh(
      new THREE.SphereGeometry(2.5, 16, 16),
      this.brassMat
    );
    ballNipple.position.y = 44;
    zerkGroup.add(ballNipple);
    housingGroup.add(zerkGroup);

    bGroup.add(housingGroup);
    this.bearingHousings.push(housingGroup);

    // B. Internal Rolling Bearing (Deep-Groove Ball Bearing Insert)
    const insertGroup = new THREE.Group();
    insertGroup.name = 'BearingInsert';

    // 1. Ground Outer Raceway Ring
    const outerRaceGeom = new THREE.TorusGeometry(26, 3.5, 20, 48);
    const outerRace = new THREE.Mesh(outerRaceGeom, this.groundShaftMat);
    insertGroup.add(outerRace);

    // 2. Ground Inner Raceway Ring (fitted to shaft)
    const innerRaceGeom = new THREE.CylinderGeometry(18, 18, 28, 36);
    innerRaceGeom.rotateX(Math.PI / 2);
    const innerRace = new THREE.Mesh(innerRaceGeom, this.groundShaftMat);
    insertGroup.add(innerRace);

    // Eccentric locking collar with hex socket set screw
    const collarGeom = new THREE.CylinderGeometry(21, 21, 9, 32);
    collarGeom.rotateX(Math.PI / 2);
    const collar = new THREE.Mesh(collarGeom, this.groundShaftMat);
    collar.position.z = 16;
    insertGroup.add(collar);

    const collarScrew = new THREE.Mesh(
      new THREE.CylinderGeometry(1.8, 1.8, 4, 12),
      this.boltMat
    );
    collarScrew.position.set(0, 20, 16);
    insertGroup.add(collarScrew);

    // 3. Brass Ball Cage / Retainer
    const cageGeom = new THREE.TorusGeometry(22, 1.8, 16, 32);
    const cage = new THREE.Mesh(cageGeom, this.brassMat);
    insertGroup.add(cage);

    // 4. Eight (8) High-Precision Chrome Rolling Steel Balls
    const numBalls = 8;
    const pitchRadius = 22; // Orbit pitch radius
    const ballRadius = 3.6;
    const ballsArray = [];

    const ballsHolder = new THREE.Group();
    ballsHolder.name = 'RotatingBallsHolder';

    for (let b = 0; b < numBalls; b++) {
      const angle = (b * 2 * Math.PI) / numBalls;
      const ballMesh = new THREE.Mesh(
        new THREE.SphereGeometry(ballRadius, 24, 24),
        this.chromeBallMat
      );
      ballMesh.position.set(
        pitchRadius * Math.cos(angle),
        pitchRadius * Math.sin(angle),
        0
      );
      ballMesh.castShadow = true;
      ballsHolder.add(ballMesh);
      ballsArray.push(ballMesh);
    }
    insertGroup.add(ballsHolder);
    this.internalBalls.push({ holder: ballsHolder, balls: ballsArray });

    bGroup.add(insertGroup);
    return bGroup;
  }

  // ==========================================
  // 4. TWO-STAGE INVOLUTE SPUR GEAR TRAIN
  // ==========================================
  buildGears() {
    // Stage 1: Pinion 1 (18T) on Input Shaft <--> Wheel 2 (54T) on Intermediate Shaft
    // Stage 2: Pinion 3 (18T) on Intermediate Shaft <--> Wheel 4 (54T) on Output Shaft

    // 1. Gear 1: Driving Pinion (z1 = 18)
    const gear1 = InvoluteGearGenerator.createGearMesh({
      module: this.module,
      teeth: this.zPinion,
      pressureAngleDeg: 20,
      faceWidth: 32,
      boreRadius: this.shaftRadius,
      material: this.gearSteelMat
    });
    gear1.position.set(this.shaftX.input, this.shaftY, this.zStage1);
    this.rootGroup.add(gear1);
    this.gears['gear1'] = gear1;

    // 2. Gear 2: Intermediate Driven Wheel (z2 = 54)
    const gear2 = InvoluteGearGenerator.createGearMesh({
      module: this.module,
      teeth: this.zWheel,
      pressureAngleDeg: 20,
      faceWidth: 32,
      boreRadius: this.shaftRadius,
      lighteningHoles: true,
      material: this.gearSteelMat
    });
    gear2.position.set(this.shaftX.intermediate, this.shaftY, this.zStage1);
    // Initial tooth meshing phase offset: half pitch tooth offset for perfect meshing!
    gear2.rotation.z = Math.PI / this.zWheel;
    this.rootGroup.add(gear2);
    this.gears['gear2'] = gear2;

    // 3. Gear 3: Intermediate Driving Pinion (z3 = 18)
    const gear3 = InvoluteGearGenerator.createGearMesh({
      module: this.module,
      teeth: this.zPinion,
      pressureAngleDeg: 20,
      faceWidth: 32,
      boreRadius: this.shaftRadius,
      material: this.gearSteelMat
    });
    gear3.position.set(this.shaftX.intermediate, this.shaftY, this.zStage2);
    this.rootGroup.add(gear3);
    this.gears['gear3'] = gear3;

    // 4. Gear 4: Final Output Driven Wheel (z4 = 54)
    const gear4 = InvoluteGearGenerator.createGearMesh({
      module: this.module,
      teeth: this.zWheel,
      pressureAngleDeg: 20,
      faceWidth: 32,
      boreRadius: this.shaftRadius,
      lighteningHoles: true,
      material: this.gearSteelMat
    });
    gear4.position.set(this.shaftX.output, this.shaftY, this.zStage2);
    gear4.rotation.z = Math.PI / this.zWheel;
    this.rootGroup.add(gear4);
    this.gears['gear4'] = gear4;

    // Register gears for exploded view along shaft axis Z
    this.explodedComponents.push(
      { group: gear1, basePos: gear1.position.clone(), explodedOffset: new THREE.Vector3(0, 0, -45) },
      { group: gear2, basePos: gear2.position.clone(), explodedOffset: new THREE.Vector3(0, 0, -30) },
      { group: gear3, basePos: gear3.position.clone(), explodedOffset: new THREE.Vector3(0, 0, +30) },
      { group: gear4, basePos: gear4.position.clone(), explodedOffset: new THREE.Vector3(0, 0, +45) }
    );
  }

  // ==========================================
  // 5. PITCH CIRCLE & LINE OF ACTION OVERLAYS
  // ==========================================
  buildKinematicOverlays() {
    this.overlayGroup = new THREE.Group();
    this.overlayGroup.name = 'KinematicOverlays';

    // A. Pitch Circle visualizers
    const addPCDCircle = (x, y, z, radius, color) => {
      const geom = new THREE.BufferGeometry();
      const pts = [];
      const segs = 80;
      for (let s = 0; s <= segs; s++) {
        const th = (s / segs) * Math.PI * 2;
        pts.push(x + radius * Math.cos(th), y + radius * Math.sin(th), z);
      }
      geom.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      const mat = new THREE.LineDashedMaterial({
        color: color,
        dashSize: 4,
        gapSize: 2,
        linewidth: 2
      });
      const line = new THREE.Line(geom, mat);
      line.computeLineDistances();
      this.overlayGroup.add(line);
      return line;
    };

    // Stage 1 PCDs
    addPCDCircle(this.shaftX.input, this.shaftY, this.zStage1 + 18, this.rPinion, 0x00e5ff);
    addPCDCircle(this.shaftX.intermediate, this.shaftY, this.zStage1 + 18, this.rWheel, 0x00e5ff);

    // Stage 2 PCDs
    addPCDCircle(this.shaftX.intermediate, this.shaftY, this.zStage2 + 18, this.rPinion, 0xffab00);
    addPCDCircle(this.shaftX.output, this.shaftY, this.zStage2 + 18, this.rWheel, 0xffab00);

    // B. Line of Action Vectors (20° tangent to base circle at pitch point)
    // Stage 1 Pitch Point: X = -144 + 36 = -108, Y = 135
    // Tangent inclined at 20 deg
    const addLineOfAction = (pitchPointX, zPos, color) => {
      const length = 55;
      const alpha = (20 * Math.PI) / 180;
      const dx = length * Math.sin(alpha);
      const dy = length * Math.cos(alpha);

      const loaGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(pitchPointX - dx, this.shaftY - dy, zPos + 18),
        new THREE.Vector3(pitchPointX + dx, this.shaftY + dy, zPos + 18)
      ]);
      const loaMat = new THREE.LineBasicMaterial({ color: color, linewidth: 3 });
      const loaLine = new THREE.Line(loaGeom, loaMat);
      this.overlayGroup.add(loaLine);

      // Pitch Point marker sphere
      const ptMesh = new THREE.Mesh(
        new THREE.SphereGeometry(3, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xff0055 })
      );
      ptMesh.position.set(pitchPointX, this.shaftY, zPos + 18);
      this.overlayGroup.add(ptMesh);
    };

    addLineOfAction(this.shaftX.input + this.rPinion, this.zStage1, 0x00e5ff);
    addLineOfAction(this.shaftX.intermediate + this.rPinion, this.zStage2, 0xffab00);

    this.overlayGroup.visible = false; // toggled via UI
    this.rootGroup.add(this.overlayGroup);
  }

  // ==========================================
  // 6. CUTAWAY INSPECTION MODE TOGGLE
  // ==========================================
  setCutawayMode(enabled) {
    this.isCutaway = enabled;
    const targetMat = enabled ? this.cutawayHousingMat : this.castIronGreenMat;

    this.bearingHousings.forEach((hGroup) => {
      hGroup.traverse((child) => {
        if (child.isMesh && (child.material === this.castIronGreenMat || child.material === this.cutawayHousingMat)) {
          child.material = targetMat;
        }
      });
    });

    if (this.motorDrive && this.motorDrive.setCutawayMode) {
      this.motorDrive.setCutawayMode(enabled);
    }
  }

  setTransparentMode(enabled) {
    this.setCutawayMode(enabled);
  }

  // ==========================================
  // 7. EXPLODED VIEW INTERPOLATION (0.0 -> 1.0)
  // ==========================================
  setExplodedFactor(t) {
    this.explodedFactor = Math.max(0, Math.min(1, t));
    this.explodedComponents.forEach((item) => {
      item.group.position.lerpVectors(
        item.basePos,
        item.basePos.clone().addScaledVector(item.explodedOffset, this.explodedFactor),
        1.0
      );
    });

    if (this.motorDrive && this.motorDrive.setExplodedFactor) {
      this.motorDrive.setExplodedFactor(this.explodedFactor);
    }
  }

  // ==========================================
  // 8. KINEMATIC UPDATE LOOP
  // ==========================================
  updateRotations(angles, dt) {
    // Gear & Shaft 1 (Input)
    if (this.gears.gear1) this.gears.gear1.rotation.z = angles.theta1;
    if (this.shaftGroups.input) this.shaftGroups.input.rotation.z = angles.theta1;

    // Gear 2, Gear 3 & Shaft 2 (Intermediate Countershaft)
    if (this.gears.gear2) this.gears.gear2.rotation.z = angles.theta2 + (Math.PI / this.zWheel);
    if (this.gears.gear3) this.gears.gear3.rotation.z = angles.theta2;
    if (this.shaftGroups.intermediate) this.shaftGroups.intermediate.rotation.z = angles.theta2;

    // Gear 4 & Shaft 3 (Output)
    if (this.gears.gear4) this.gears.gear4.rotation.z = angles.theta4 + (Math.PI / this.zWheel);
    if (this.shaftGroups.output) this.shaftGroups.output.rotation.z = angles.theta4;

    // Rotate internal rolling balls in all 6 pillow blocks
    // Ball orbit speed is approx half shaft speed
    const ballOrbit1 = angles.theta1 * 0.42;
    const ballOrbit2 = angles.theta2 * 0.42;
    const ballOrbit3 = angles.theta4 * 0.42;

    if (this.internalBalls.length >= 6) {
      this.internalBalls[0].holder.rotation.z = ballOrbit1;
      this.internalBalls[1].holder.rotation.z = ballOrbit1;
      this.internalBalls[2].holder.rotation.z = ballOrbit2;
      this.internalBalls[3].holder.rotation.z = ballOrbit2;
      this.internalBalls[4].holder.rotation.z = ballOrbit3;
      this.internalBalls[5].holder.rotation.z = ballOrbit3;
    }

    // 7. Update Electric Motor Drive and Transmission (Belt / Chain / Coupling)
    if (this.motorDrive) {
      this.motorDrive.update(angles.theta1, dt);
    }
  }

  setDriveMode(mode) {
    if (this.motorDrive) {
      this.motorDrive.setMode(mode);
    }
  }
}

window.MachineAssembly = MachineAssembly;
