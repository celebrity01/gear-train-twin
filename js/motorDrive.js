/**
 * motorDrive.js
 * Integrated Motor-Gearbox and Multi-Shaft System (Corrected Assembly)
 * Matches CAD Engineering Schematic (media_1788856010118.png):
 * 1. DIRECT MOTOR-GEARBOX COUPLING: Collinear in-line motor driving worm gearbox input
 * 2. ROTATED WORM GEAR BOX: Mounted on Shaft 1 axis with through-shaft to Shaft 1 and perpendicular 90° output
 * 3. NEW GEARBOX OUTPUT-TO-SYSTEM COUPLING: 90° miter transfer box on Shaft 2 with flanged coupling
 * 4. SINGLE BELT DRIVE: Continuous timing belt spanning from Shaft 1 across to Shaft 3
 * 5. Full transparent X-ray internal view with crisp CAD edge outlines and seamless shaft connections
 */

class MotorDriveSystem {
  constructor(scene, shaftY, shaftRadius) {
    this.scene = scene;
    this.shaftY = shaftY; // 135 mm
    this.shaftRadius = shaftRadius; // 12 mm

    this.group = new THREE.Group();
    this.group.name = 'MotorDriveSystem';
    this.scene.add(this.group);

    // Current drive mode: 'belt' | 'chain' | 'coupling'
    this.currentMode = 'belt';

    // Key spatial coordinates matching CAD schematic
    // Shaft 1 axis (Drive Shaft): X = -144
    // Shaft 2 axis (Intermediate): X = 0
    // Shaft 3 axis (Final Output): X = +144
    this.shaft1X = -144;
    this.shaft2X = 0;
    this.shaft3X = 144;

    // Component axial positions along Z
    this.motorCenterZ = -410;
    this.motorCouplingZ = -300;
    this.gearboxCenterZ = -240;
    this.shaft1CouplingZ = -165;
    this.miterBoxCenterZ = -240;
    this.miterFlangeCouplingZ = -160;
    this.drivePlaneZ = -120; // Plane of Single Belt Drive

    this.initMaterials();
    this.casingMeshes = [];
    this.edgeLines = [];
    this.explodedComponents = [];

    // Build the integrated powertrain
    this.buildElectricMotor();
    this.buildMotorToGearboxCoupling();
    this.buildRotatedWormGearbox();
    this.buildMiterCouplingAndShaft2();
    this.buildBeltDrive();
    this.buildChainDrive();
    this.buildSpiderCoupling();

    // Set initial mode
    this.setMode('belt');
  }

  initMaterials() {
    // 1. Industrial Dolang motor electric blue enamel
    this.motorBlueMat = new THREE.MeshStandardMaterial({
      color: 0x1976d2,
      roughness: 0.28,
      metalness: 0.45
    });

    // 2. Extruded aluminum motor stator with polished fins
    this.statorAlumMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.22,
      metalness: 0.88
    });

    // 3. Black oxide steel for terminal box, pulleys, hardware
    this.blackSteelMat = new THREE.MeshStandardMaterial({
      color: 0x22262c,
      roughness: 0.45,
      metalness: 0.65
    });

    // 4. Ground steel for transmission shafts & rollers
    this.groundSteelMat = new THREE.MeshStandardMaterial({
      color: 0xf0f4f8,
      roughness: 0.12,
      metalness: 0.96
    });

    // 5. Neoprene rubber drive belt
    this.beltMat = new THREE.MeshStandardMaterial({
      color: 0x1e2229,
      roughness: 0.75,
      metalness: 0.12
    });

    // 6. Hardened blackened carbon steel for sprockets & gears
    this.sprocketMat = new THREE.MeshStandardMaterial({
      color: 0x333b47,
      roughness: 0.28,
      metalness: 0.88
    });

    // 7. Polyurethane elastomeric star spider
    this.spiderMat = new THREE.MeshStandardMaterial({
      color: 0xff1744,
      roughness: 0.35,
      metalness: 0.05
    });

    // 8. Anodized aluminum coupling hubs
    this.couplingHubMat = new THREE.MeshStandardMaterial({
      color: 0xd9e2ec,
      roughness: 0.22,
      metalness: 0.88
    });

    // 9. Brass terminals, grease fittings & bushings
    this.brassMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.25,
      metalness: 0.85
    });

    // 10. Nickel / Chrome Plating
    this.nickelPlatedMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.08,
      metalness: 0.98
    });

    // 11. Copper Stator Coils
    this.copperCoilMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.22,
      metalness: 0.88
    });

    // 12. Silicon Steel Rotor Core
    this.rotorCoreMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.38,
      metalness: 0.75
    });

    // 13. Rotor Conductor Bars & End Rings
    this.rotorBarMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.2,
      metalness: 0.92
    });

    // 14. Motor Cooling Fan Impeller
    this.fanMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      roughness: 0.35,
      metalness: 0.2
    });

    // 15. Gearbox Cast Aluminum Housing
    this.gearboxAlumMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.42,
      metalness: 0.72
    });

    // 16. Worm Wheel Phosphor Bronze
    this.wormBronzeMat = new THREE.MeshStandardMaterial({
      color: 0xcd7f32,
      roughness: 0.25,
      metalness: 0.85
    });

    // 17. Hardened Steel Worm Screw & Bevel Gears
    this.wormSteelMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.15,
      metalness: 0.95
    });

    // 18. Brass Hex Oil Plug
    this.oilPlugMat = new THREE.MeshStandardMaterial({
      color: 0xeab308,
      roughness: 0.2,
      metalness: 0.9
    });

    // 19. Transparent X-Ray Cutaway Material (Crisp Technical Glass with Depth)
    this.cutawayMat = new THREE.MeshStandardMaterial({
      color: 0x93c5fd,
      opacity: 0.35,
      transparent: true,
      roughness: 0.18,
      metalness: 0.12,
      depthWrite: false
    });

    // 20. Blueprint CAD Edge Outlines for Transparent Mode
    this.edgeLineMat = new THREE.LineBasicMaterial({
      color: 0x1d4ed8,
      linewidth: 2,
      transparent: true,
      opacity: 0.85
    });
  }

  // Helper to create a casing mesh with automatic CAD edge outline
  createCasingMesh(geometry, originalMaterial, edgeColor = 0x1d4ed8) {
    const mesh = new THREE.Mesh(geometry, originalMaterial);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh._origMat = originalMaterial;

    // Generate crisp edge wireframe
    const edgeGeom = new THREE.EdgesGeometry(geometry, 25);
    const lineMat = new THREE.LineBasicMaterial({
      color: edgeColor,
      linewidth: 1.5,
      transparent: true,
      opacity: 0.85
    });
    const edgeLine = new THREE.LineSegments(edgeGeom, lineMat);
    edgeLine.visible = false; // Hidden in normal mode, shown in transparent mode
    mesh.add(edgeLine);

    this.casingMeshes.push(mesh);
    this.edgeLines.push(edgeLine);
    return mesh;
  }

  // ==========================================
  // 1. DOLANG-STYLE ELECTRIC DRIVE MOTOR (COLINEAR WITH SHAFT 1)
  // ==========================================
  buildElectricMotor() {
    this.motorGroup = new THREE.Group();
    this.motorGroup.name = 'ElectricDriveMotor';
    this.motorGroup.position.set(this.shaft1X, this.shaftY, this.motorCenterZ);

    const motorRadius = 42;
    const statorLen = 96;

    // A. Stator Housing & 16 Cooling Fins
    const statorGeom = new THREE.CylinderGeometry(motorRadius, motorRadius, statorLen, 32);
    statorGeom.rotateX(Math.PI / 2);
    const statorMesh = this.createCasingMesh(statorGeom, this.statorAlumMat);
    this.motorGroup.add(statorMesh);

    const numFins = 16;
    for (let f = 0; f < numFins; f++) {
      const angle = (f * 2 * Math.PI) / numFins;
      if (Math.abs(angle - Math.PI / 2) < 0.25 || Math.abs(angle + Math.PI / 2) < 0.35) continue;

      const finGeom = new THREE.BoxGeometry(2.4, 9, statorLen - 2);
      const fin = this.createCasingMesh(finGeom, this.statorAlumMat);
      fin.position.set(
        (motorRadius + 3.5) * Math.cos(angle),
        (motorRadius + 3.5) * Math.sin(angle),
        0
      );
      fin.rotation.z = angle + Math.PI / 2;
      this.motorGroup.add(fin);
    }

    // B. Internal Working Parts (visible in transparent view)
    const internalGroup = new THREE.Group();
    internalGroup.name = 'MotorInternals';

    // Stator Silicon Steel Core
    const statorCoreGeom = new THREE.CylinderGeometry(38, 38, 76, 32, 1, true);
    statorCoreGeom.rotateX(Math.PI / 2);
    const statorCore = new THREE.Mesh(statorCoreGeom, this.rotorCoreMat);
    internalGroup.add(statorCore);

    // 12 Copper Wire Stator Coils
    const numPoles = 12;
    const coilRadius = 31;
    for (let p = 0; p < numPoles; p++) {
      const pAngle = (p * 2 * Math.PI) / numPoles;
      const px = coilRadius * Math.cos(pAngle);
      const py = coilRadius * Math.sin(pAngle);

      const coilGeom = new THREE.CylinderGeometry(4.2, 4.2, 82, 12);
      coilGeom.rotateX(Math.PI / 2);
      const coil = new THREE.Mesh(coilGeom, this.copperCoilMat);
      coil.position.set(px, py, 0);
      internalGroup.add(coil);
    }
    this.motorGroup.add(internalGroup);

    // C. Rotor Assembly (rotating)
    this.motorRotorGroup = new THREE.Group();
    this.motorRotorGroup.name = 'MotorRotor';

    // Rotor Core & Conductor Bars
    const rotorCoreMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(23.5, 23.5, 72, 28),
      this.rotorCoreMat
    );
    rotorCoreMesh.geometry.rotateX(Math.PI / 2);
    this.motorRotorGroup.add(rotorCoreMesh);

    // Motor Shaft (extending from Z = -75 through Z = +110 in local coords -> world Z = -485 to -300)
    // Firmly enters the direct coupling with ZERO GAP!
    const shaftMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(12, 12, 205, 32),
      this.groundSteelMat
    );
    shaftMesh.geometry.rotateX(Math.PI / 2);
    shaftMesh.position.z = 20;
    shaftMesh.castShadow = true;
    this.motorRotorGroup.add(shaftMesh);

    // Internal Cooling Fan Impeller
    const fanGeom = new THREE.CylinderGeometry(34, 34, 14, 16);
    fanGeom.rotateX(Math.PI / 2);
    const fanMesh = new THREE.Mesh(fanGeom, this.fanMat);
    fanMesh.position.z = -56;
    this.motorRotorGroup.add(fanMesh);

    this.motorGroup.add(this.motorRotorGroup);

    // D. Front End Shield (towards +Z / gearbox)
    const frontShieldGeom = new THREE.CylinderGeometry(motorRadius + 1, motorRadius - 4, 26, 32);
    frontShieldGeom.rotateX(Math.PI / 2);
    const frontShield = this.createCasingMesh(frontShieldGeom, this.motorBlueMat);
    frontShield.position.z = 58;
    this.motorGroup.add(frontShield);

    // E. Rear End Shield & Fan Cowl (towards -Z)
    const rearShieldGeom = new THREE.CylinderGeometry(motorRadius + 1, motorRadius - 2, 24, 32);
    rearShieldGeom.rotateX(Math.PI / 2);
    const rearShield = this.createCasingMesh(rearShieldGeom, this.motorBlueMat);
    rearShield.position.z = -56;
    this.motorGroup.add(rearShield);

    // Rear Fan Cowl
    const cowlGeom = new THREE.CylinderGeometry(motorRadius + 2, motorRadius + 2, 28, 32, 1, true);
    cowlGeom.rotateX(Math.PI / 2);
    const cowl = this.createCasingMesh(cowlGeom, this.motorBlueMat);
    cowl.position.z = -74;
    this.motorGroup.add(cowl);

    // F. Terminal Box on Top (Y = +48 in local coords -> world Y = 183)
    const tBoxGroup = new THREE.Group();
    tBoxGroup.position.set(0, motorRadius + 14, 0);

    const tBox = new THREE.Mesh(
      new THREE.BoxGeometry(46, 20, 52),
      this.blackSteelMat
    );
    tBox.castShadow = true;
    tBoxGroup.add(tBox);

    // Red & Blue connection terminals (exact match to CAD drawing)
    const termConfigs = [
      { x: -12, z: -12, color: 0xef4444 }, // Red
      { x: +12, z: -12, color: 0xef4444 }, // Red
      { x: -12, z: +12, color: 0x3b82f6 }, // Blue
      { x: +12, z: +12, color: 0x3b82f6 }  // Blue
    ];
    termConfigs.forEach((tc) => {
      const stud = new THREE.Mesh(
        new THREE.CylinderGeometry(3, 3, 5, 16),
        new THREE.MeshStandardMaterial({ color: tc.color, roughness: 0.3, metalness: 0.5 })
      );
      stud.position.set(tc.x, 11, tc.z);
      tBoxGroup.add(stud);
    });
    this.motorGroup.add(tBoxGroup);

    // G. Heavy-duty Mounting Foot & Base Riser (bolted to bedplate at Y = 34)
    const footGroup = new THREE.Group();
    const footGeom = new THREE.BoxGeometry(112, 16, 120);
    const foot = new THREE.Mesh(footGeom, this.motorBlueMat);
    foot.position.set(0, -motorRadius - 8, 0);
    foot.castShadow = true;
    footGroup.add(foot);

    const riserH = this.shaftY - motorRadius - 16 - 34; // 43 mm
    const riserGeom = new THREE.BoxGeometry(120, riserH, 128);
    const riserMesh = new THREE.Mesh(riserGeom, this.blackSteelMat);
    riserMesh.position.set(0, -motorRadius - 16 - riserH / 2, 0);
    riserMesh.castShadow = true;
    footGroup.add(riserMesh);

    // 4 Corner Clamping Hex Bolts
    [
      { x: -48, z: -48 }, { x: +48, z: -48 },
      { x: -48, z: +48 }, { x: +48, z: +48 }
    ].forEach((bp) => {
      const bolt = new THREE.Mesh(
        new THREE.CylinderGeometry(5, 5, 20, 6),
        this.blackSteelMat
      );
      bolt.position.set(bp.x, -motorRadius, bp.z);
      footGroup.add(bolt);
    });
    this.motorGroup.add(footGroup);

    this.group.add(this.motorGroup);

    // Register Motor for Exploded View
    this.explodedComponents.push({
      group: this.motorGroup,
      basePos: this.motorGroup.position.clone(),
      explodedOffset: new THREE.Vector3(0, 0, -80)
    });
  }

  // ==========================================
  // 2. DIRECT MOTOR-GEARBOX COUPLING
  // ==========================================
  buildMotorToGearboxCoupling() {
    this.motorCouplingGroup = new THREE.Group();
    this.motorCouplingGroup.name = 'DirectMotorGearboxCoupling';
    this.motorCouplingGroup.position.set(this.shaft1X, this.shaftY, this.motorCouplingZ);

    const outerR = 18;
    const hubLen = 15;
    const gap = 4;

    [-hubLen / 2 - gap / 2, hubLen / 2 + gap / 2].forEach((zOff) => {
      const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(outerR, outerR, hubLen, 32),
        this.couplingHubMat
      );
      hub.geometry.rotateX(Math.PI / 2);
      hub.position.z = zOff;
      hub.castShadow = true;
      this.motorCouplingGroup.add(hub);

      // 4 Clamping Socket Head Screws per hub
      [-10, 10].forEach((xOff) => {
        [-12, 12].forEach((yOff) => {
          const screw = new THREE.Mesh(
            new THREE.CylinderGeometry(2.5, 2.5, 8, 12),
            this.blackSteelMat
          );
          screw.position.set(xOff, yOff, zOff);
          this.motorCouplingGroup.add(screw);
        });
      });
    });

    // Central damping ring
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(outerR - 1, outerR - 1, gap, 32),
      this.brassMat
    );
    ring.geometry.rotateX(Math.PI / 2);
    this.motorCouplingGroup.add(ring);

    this.group.add(this.motorCouplingGroup);

    this.explodedComponents.push({
      group: this.motorCouplingGroup,
      basePos: this.motorCouplingGroup.position.clone(),
      explodedOffset: new THREE.Vector3(0, 0, -45)
    });
  }

  // ==========================================
  // 3. ROTATED WORM GEAR BOX (ALUMINUM DIE-CAST HOUSING)
  // ==========================================
  buildRotatedWormGearbox() {
    this.gearboxGroup = new THREE.Group();
    this.gearboxGroup.name = 'RotatedWormGearbox';
    this.gearboxGroup.position.set(this.shaft1X, this.shaftY, this.gearboxCenterZ);

    const gbW = 74;  // along X
    const gbH = 88;  // along Y
    const gbD = 76;  // along Z

    // A. Main Gearbox Casing Body with Edge Wireframes
    const bodyMesh = this.createCasingMesh(
      new THREE.BoxGeometry(gbW, gbH, gbD),
      this.gearboxAlumMat
    );
    this.gearboxGroup.add(bodyMesh);

    // B. Top Horizontal Cooling Fins (4 fins)
    for (let f = -18; f <= 18; f += 12) {
      const topFinGeom = new THREE.BoxGeometry(gbW - 12, 5, 2.8);
      const topFin = this.createCasingMesh(topFinGeom, this.gearboxAlumMat);
      topFin.position.set(0, gbH / 2 + 2.5, f);
      this.gearboxGroup.add(topFin);
    }

    // C. Top Brass Oil Filler / Breather Plug
    const plugGroup = new THREE.Group();
    plugGroup.position.set(0, gbH / 2 + 2.5, 0);

    const washer = new THREE.Mesh(
      new THREE.CylinderGeometry(9, 9, 1.8, 24),
      this.copperCoilMat
    );
    plugGroup.add(washer);

    const hexPlug = new THREE.Mesh(
      new THREE.CylinderGeometry(7, 7, 8, 6),
      this.oilPlugMat
    );
    hexPlug.position.y = 4.5;
    hexPlug.castShadow = true;
    plugGroup.add(hexPlug);
    this.gearboxGroup.add(plugGroup);

    // D. 4 Corner Slotted Mounting Feet & Base Riser
    [-gbW / 2 + 8, gbW / 2 - 8].forEach((fx) => {
      [-gbD / 2 + 8, gbD / 2 - 8].forEach((fz) => {
        const foot = this.createCasingMesh(
          new THREE.BoxGeometry(16, 12, 16),
          this.gearboxAlumMat
        );
        foot.position.set(fx, -gbH / 2 + 6, fz);
        this.gearboxGroup.add(foot);

        const bolt = new THREE.Mesh(
          new THREE.CylinderGeometry(4.5, 4.5, 14, 16),
          this.blackSteelMat
        );
        bolt.position.set(fx, -gbH / 2 + 10, fz);
        this.gearboxGroup.add(bolt);
      });
    });

    // Base Riser to bedplate (Y = 34)
    const riserH = this.shaftY - gbH / 2 - 34; // 57 mm
    const riserMesh = new THREE.Mesh(
      new THREE.BoxGeometry(gbW + 16, riserH, gbD + 16),
      this.blackSteelMat
    );
    riserMesh.position.set(0, -gbH / 2 - riserH / 2, 0);
    riserMesh.castShadow = true;
    this.gearboxGroup.add(riserMesh);

    // E. INPUT WORM SHAFT (enters on -Z face, connects into direct coupling at Z = -300)
    const inShaftGeom = new THREE.CylinderGeometry(12, 12, 55, 32);
    inShaftGeom.rotateX(Math.PI / 2);
    const inShaft = new THREE.Mesh(inShaftGeom, this.groundSteelMat);
    inShaft.position.z = -gbD / 2 - 25; // Reaches Z = -300 with zero gap
    inShaft.castShadow = true;
    this.gearboxGroup.add(inShaft);

    // Circular input bearing retainer flange
    const inFlange = this.createCasingMesh(
      new THREE.CylinderGeometry(26, 26, 6, 32),
      this.gearboxAlumMat
    );
    inFlange.geometry.rotateX(Math.PI / 2);
    inFlange.position.z = -gbD / 2 - 3;
    this.gearboxGroup.add(inFlange);

    // F. INLINE OUTPUT BEARING RETAINER FLANGE (Shaft 1 enters cleanly through this seal)
    const outFlange = this.createCasingMesh(
      new THREE.CylinderGeometry(26, 26, 6, 32),
      this.gearboxAlumMat
    );
    outFlange.geometry.rotateX(Math.PI / 2);
    outFlange.position.z = gbD / 2 + 3;
    this.gearboxGroup.add(outFlange);

    // G. PERPENDICULAR 90° OUTPUT SHAFT & TORQUE TUBE (exits along +X towards Shaft 2 / Miter Box)
    // Spans from Worm Wheel at X = -128 directly to Miter Box at X = 0 (144 mm total span)
    const perpShaftLen = 138;
    const perpShaftGeom = new THREE.CylinderGeometry(11, 11, perpShaftLen, 32);
    perpShaftGeom.rotateZ(Math.PI / 2);
    const perpShaft = new THREE.Mesh(perpShaftGeom, this.groundSteelMat);
    perpShaft.position.set(perpShaftLen / 2 + 6, 0, 0);
    perpShaft.castShadow = true;
    this.gearboxGroup.add(perpShaft);

    // Heavy-duty Tubular Torque Sleeve / Quill enclosing the transverse shaft
    const torqueTubeGeom = new THREE.CylinderGeometry(17, 17, 72, 32);
    torqueTubeGeom.rotateZ(Math.PI / 2);
    const torqueTube = this.createCasingMesh(torqueTubeGeom, this.gearboxAlumMat);
    torqueTube.position.set(gbW / 2 + 36, 0, 0);
    this.gearboxGroup.add(torqueTube);

    // Flange collars at both ends of the torque tube
    const perpFlange1 = this.createCasingMesh(
      new THREE.CylinderGeometry(24, 24, 8, 32),
      this.gearboxAlumMat
    );
    perpFlange1.geometry.rotateZ(Math.PI / 2);
    perpFlange1.position.set(gbW / 2 + 4, 0, 0);
    this.gearboxGroup.add(perpFlange1);

    // H. INTERNAL WORKING PARTS (Visible through translucent glass in transparent view)
    const wormInternalGroup = new THREE.Group();
    wormInternalGroup.name = 'WormGearboxInternals';

    // 1. Hardened Steel Worm Screw (centered along Z axis inside casing)
    const wormScrewGeom = new THREE.CylinderGeometry(14, 14, 48, 32);
    wormScrewGeom.rotateX(Math.PI / 2);
    this.wormScrewMesh = new THREE.Mesh(wormScrewGeom, this.wormSteelMat);
    wormScrewGeom.computeVertexNormals();
    wormInternalGroup.add(this.wormScrewMesh);

    // 2. Phosphor Bronze Worm Wheel (30 teeth, meshing on the perpendicular output axis)
    const wormWheelGeom = new THREE.CylinderGeometry(28, 28, 16, 32);
    wormWheelGeom.rotateZ(Math.PI / 2);
    this.wormWheelMesh = new THREE.Mesh(wormWheelGeom, this.wormBronzeMat);
    this.wormWheelMesh.position.set(14, 0, 0);
    wormInternalGroup.add(this.wormWheelMesh);

    this.gearboxGroup.add(wormInternalGroup);
    this.group.add(this.gearboxGroup);

    this.explodedComponents.push({
      group: this.gearboxGroup,
      basePos: this.gearboxGroup.position.clone(),
      explodedOffset: new THREE.Vector3(0, 0, -25)
    });
  }


  // ==========================================
  // 5. NEW GEARBOX OUTPUT-TO-SYSTEM COUPLING (90° MITER BOX ON SHAFT 2)
  // ==========================================
  buildMiterCouplingAndShaft2() {
    this.miterGroup = new THREE.Group();
    this.miterGroup.name = 'NewGearboxOutputToSystemCoupling';
    this.miterGroup.position.set(this.shaft2X, this.shaftY, this.miterBoxCenterZ);

    const boxSize = 54;

    // A. 90° Miter Gearbox Casing with Blueprint Edge Lines
    const casingMesh = this.createCasingMesh(
      new THREE.BoxGeometry(boxSize, boxSize, boxSize),
      this.gearboxAlumMat
    );
    this.miterGroup.add(casingMesh);

    // Diagonal 'X' relief on top face indicating internal miter/bevel gears
    const xLineMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 });
    [-1, 1].forEach((dir) => {
      const lineMesh = new THREE.Mesh(
        new THREE.BoxGeometry(2.5, 2, boxSize * 1.2),
        xLineMat
      );
      lineMesh.position.y = boxSize / 2 + 1;
      lineMesh.rotation.y = (dir * Math.PI) / 4;
      this.miterGroup.add(lineMesh);
    });

    // Input flange on -X face (receiving the transverse torque tube)
    const inFlange = this.createCasingMesh(
      new THREE.CylinderGeometry(22, 22, 8, 32),
      this.gearboxAlumMat
    );
    inFlange.geometry.rotateZ(Math.PI / 2);
    inFlange.position.x = -boxSize / 2 - 4;
    this.miterGroup.add(inFlange);

    // Output flange on +Z face
    const outFlange = this.createCasingMesh(
      new THREE.CylinderGeometry(22, 22, 8, 32),
      this.gearboxAlumMat
    );
    outFlange.geometry.rotateX(Math.PI / 2);
    outFlange.position.z = boxSize / 2 + 4;
    this.miterGroup.add(outFlange);

    // B. Internal Spiral Bevel Gears (1:1 ratio, 20 teeth, visible in transparent mode)
    const bevelInternalGroup = new THREE.Group();
    bevelInternalGroup.name = 'MiterInternals';

    // Input Bevel Gear (along X)
    const inBevelGeom = new THREE.ConeGeometry(19, 15, 24);
    inBevelGeom.rotateZ(-Math.PI / 2);
    this.inputBevelMesh = new THREE.Mesh(inBevelGeom, this.wormSteelMat);
    this.inputBevelMesh.position.set(-6, 0, 0);
    bevelInternalGroup.add(this.inputBevelMesh);

    // Output Bevel Gear (along Z)
    const outBevelGeom = new THREE.ConeGeometry(19, 15, 24);
    outBevelGeom.rotateX(Math.PI / 2);
    this.outputBevelMesh = new THREE.Mesh(outBevelGeom, this.wormSteelMat);
    this.outputBevelMesh.position.set(0, 0, 6);
    bevelInternalGroup.add(this.outputBevelMesh);

    this.miterGroup.add(bevelInternalGroup);

    // C. CONTINUOUS SOLID GROUND SHAFT FROM BEVEL GEAR DIRECTLY INTO SHAFT 2
    // Extends from Z = 6 in local coords through the front flange, clamp collar, and flanged coupling to Z = 81 (world Z = -159)
    // ZERO GAP! Firmly connects into Shaft 2.
    const outShaftLen = 78;
    const outShaftGeom = new THREE.CylinderGeometry(12, 12, outShaftLen, 32);
    outShaftGeom.rotateX(Math.PI / 2);
    const outShaft = new THREE.Mesh(outShaftGeom, this.groundSteelMat);
    outShaft.position.z = boxSize / 2 + outShaftLen / 2 - 2; // Spans seamlessly across the entire coupling
    outShaft.castShadow = true;
    this.miterGroup.add(outShaft);

    // D. Split Clamp Collar (Z = -185)
    const collar = new THREE.Mesh(
      new THREE.CylinderGeometry(17, 17, 12, 24),
      this.blackSteelMat
    );
    collar.geometry.rotateX(Math.PI / 2);
    collar.position.z = boxSize / 2 + 22; // world Z = -191
    this.miterGroup.add(collar);

    // E. Heavy-duty 4-Bolt Flanged Sleeve Coupling (Z = -160)
    // Seamlessly bolted together with 4 high-strength hex bolts
    const flangeCouplingGroup = new THREE.Group();
    flangeCouplingGroup.position.z = boxSize / 2 + 52; // world Z = -161

    const flange1 = new THREE.Mesh(
      new THREE.CylinderGeometry(25, 25, 8, 32),
      this.groundSteelMat
    );
    flange1.geometry.rotateX(Math.PI / 2);
    flange1.position.z = -4;
    flangeCouplingGroup.add(flange1);

    const flange2 = new THREE.Mesh(
      new THREE.CylinderGeometry(25, 25, 8, 32),
      this.groundSteelMat
    );
    flange2.geometry.rotateX(Math.PI / 2);
    flange2.position.z = 4;
    flangeCouplingGroup.add(flange2);

    // 4 Hex Connecting Bolts & Nuts
    for (let b = 0; b < 4; b++) {
      const ang = (b * Math.PI) / 2;
      const bolt = new THREE.Mesh(
        new THREE.CylinderGeometry(3.5, 3.5, 20, 6),
        this.blackSteelMat
      );
      bolt.geometry.rotateX(Math.PI / 2);
      bolt.position.set(17 * Math.cos(ang), 17 * Math.sin(ang), 0);
      flangeCouplingGroup.add(bolt);
    }
    this.miterGroup.add(flangeCouplingGroup);

    this.group.add(this.miterGroup);

    this.explodedComponents.push({
      group: this.miterGroup,
      basePos: this.miterGroup.position.clone(),
      explodedOffset: new THREE.Vector3(0, 0, -25)
    });
  }

  // ==========================================
  // 6. SINGLE BELT DRIVE (SHAFT 1 TO SHAFT 3)
  // ==========================================
  buildBeltDrive() {
    this.beltGroup = new THREE.Group();
    this.beltGroup.name = 'SingleBeltDriveSystem';

    this.pulleyRadius = 27; // mm
    const pulleyWidth = 22; // mm

    // Helper: Create flanged timing pulley
    const createPulleyMesh = () => {
      const pGroup = new THREE.Group();

      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(this.pulleyRadius, this.pulleyRadius, pulleyWidth, 48),
        this.blackSteelMat
      );
      body.geometry.rotateX(Math.PI / 2);
      body.castShadow = true;
      pGroup.add(body);

      // Flanges on both sides
      [-pulleyWidth / 2, pulleyWidth / 2].forEach((zFlange) => {
        const flange = new THREE.Mesh(
          new THREE.CylinderGeometry(this.pulleyRadius + 5, this.pulleyRadius + 5, 2, 48),
          this.groundSteelMat
        );
        flange.geometry.rotateX(Math.PI / 2);
        flange.position.z = zFlange;
        pGroup.add(flange);
      });

      // Split hub with clamping socket screws
      const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(18, 18, 8, 32),
        this.groundSteelMat
      );
      hub.geometry.rotateX(Math.PI / 2);
      hub.position.z = pulleyWidth / 2 + 4;
      pGroup.add(hub);

      return pGroup;
    };

    // A. Top Pulley on Shaft 1 (Drive Shaft, X = -144)
    this.topPulley = createPulleyMesh();
    this.topPulley.position.set(this.shaft1X, this.shaftY, this.drivePlaneZ);
    this.beltGroup.add(this.topPulley);

    // B. Bottom Pulley on Shaft 3 (Final Output, X = +144)
    this.bottomPulley = createPulleyMesh();
    this.bottomPulley.position.set(this.shaft3X, this.shaftY, this.drivePlaneZ);
    this.beltGroup.add(this.bottomPulley);

    // C. Single Continuous Timing Belt Loop spanning across X = -144 to +144
    const xTop = this.shaft1X;      // -144
    const xBottom = this.shaft3X;  // +144
    const rOut = this.pulleyRadius + 4;
    const rIn = this.pulleyRadius;

    const beltShape = new THREE.Shape();
    beltShape.absarc(xTop, 0, rOut, Math.PI / 2, Math.PI * 3 / 2, false);
    beltShape.absarc(xBottom, 0, rOut, Math.PI * 3 / 2, Math.PI / 2, false);
    beltShape.closePath();

    const holePath = new THREE.Path();
    holePath.absarc(xTop, 0, rIn, Math.PI / 2, Math.PI * 3 / 2, false);
    holePath.absarc(xBottom, 0, rIn, Math.PI * 3 / 2, Math.PI / 2, false);
    holePath.closePath();
    beltShape.holes.push(holePath);

    const beltGeom = new THREE.ExtrudeGeometry(beltShape, { depth: pulleyWidth - 2, bevelEnabled: false });
    beltGeom.translate(0, 0, -pulleyWidth / 2 + 1);

    this.beltMesh = new THREE.Mesh(beltGeom, this.beltMat);
    this.beltMesh.position.set(0, this.shaftY, this.drivePlaneZ);
    this.beltMesh.castShadow = true;
    this.beltGroup.add(this.beltMesh);

    // D. Dynamic molded timing teeth & outer ribs for continuous rolling animation
    this.beltCogs = [];
    const numCogs = 56;
    const cogGeom = new THREE.BoxGeometry(3.6, 2.2, pulleyWidth - 3);
    const ribGeom = new THREE.BoxGeometry(2.4, 1.4, pulleyWidth - 3);

    for (let c = 0; c < numCogs; c++) {
      const frac = c / numCogs;

      const cog = new THREE.Mesh(cogGeom, this.beltMat);
      cog.castShadow = true;
      this.beltGroup.add(cog);
      this.beltCogs.push({ mesh: cog, frac: frac, isOuter: false });

      if (c % 2 === 0) {
        const rib = new THREE.Mesh(ribGeom, this.blackSteelMat);
        this.beltGroup.add(rib);
        this.beltCogs.push({ mesh: rib, frac: frac, isOuter: true });
      }
    }

    this.group.add(this.beltGroup);

    this.explodedComponents.push(
      { group: this.topPulley, basePos: this.topPulley.position.clone(), explodedOffset: new THREE.Vector3(0, 0, -35) },
      { group: this.bottomPulley, basePos: this.bottomPulley.position.clone(), explodedOffset: new THREE.Vector3(0, 0, -35) },
      { group: this.beltMesh, basePos: this.beltMesh.position.clone(), explodedOffset: new THREE.Vector3(0, -25, -35) }
    );
  }

  // ==========================================
  // 7. ROLLER CHAIN DRIVE (MODULAR ALTERNATIVE)
  // ==========================================
  buildChainDrive() {
    this.chainGroup = new THREE.Group();
    this.chainGroup.name = 'ChainDriveSystem';

    this.sprocketTeeth = 20;
    this.sprocketPitchRadius = 32;
    const sprocketWidth = 8;

    const createSprocket = () => {
      const spGroup = new THREE.Group();
      const disc = new THREE.Mesh(
        new THREE.CylinderGeometry(this.sprocketPitchRadius, this.sprocketPitchRadius, sprocketWidth, 32),
        this.sprocketMat
      );
      disc.geometry.rotateX(Math.PI / 2);
      spGroup.add(disc);
      return spGroup;
    };

    this.chainSprocket1 = createSprocket();
    this.chainSprocket1.position.set(this.shaft1X, this.shaftY, this.drivePlaneZ);
    this.chainGroup.add(this.chainSprocket1);

    this.chainSprocket3 = createSprocket();
    this.chainSprocket3.position.set(this.shaft3X, this.shaftY, this.drivePlaneZ);
    this.chainGroup.add(this.chainSprocket3);

    this.group.add(this.chainGroup);
  }

  // ==========================================
  // 8. SPIDER COUPLING (MODULAR ALTERNATIVE)
  // ==========================================
  buildSpiderCoupling() {
    this.couplingGroup = new THREE.Group();
    this.couplingGroup.name = 'SpiderCouplingSystem';

    const jawGeom = new THREE.CylinderGeometry(20, 20, 16, 24);
    jawGeom.rotateX(Math.PI / 2);
    this.spiderJaw1 = new THREE.Mesh(jawGeom, this.couplingHubMat);
    this.spiderJaw1.position.set(this.shaft1X, this.shaftY, this.drivePlaneZ - 10);
    this.couplingGroup.add(this.spiderJaw1);

    const spider = new THREE.Mesh(
      new THREE.CylinderGeometry(18, 18, 6, 6),
      this.spiderMat
    );
    spider.geometry.rotateX(Math.PI / 2);
    spider.position.set(this.shaft1X, this.shaftY, this.drivePlaneZ);
    this.couplingGroup.add(spider);

    this.group.add(this.couplingGroup);
  }

  // ==========================================
  // MODE SELECTION & VISIBILITY
  // ==========================================
  setMode(mode) {
    this.currentMode = mode;
    if (this.beltGroup) this.beltGroup.visible = (mode === 'belt');
    if (this.chainGroup) this.chainGroup.visible = (mode === 'chain');
    if (this.couplingGroup) this.couplingGroup.visible = (mode === 'coupling');
  }

  // ==========================================
  // TRANSPARENT X-RAY CUTAWAY MODE
  // ==========================================
  setCutawayMode(enabled) {
    this.isCutaway = enabled;

    // Toggle translucent glass material
    this.casingMeshes.forEach((mesh) => {
      if (enabled) {
        mesh.material = this.cutawayMat;
      } else {
        mesh.material = mesh._origMat || this.gearboxAlumMat;
      }
    });

    // Toggle blueprint edge line outlines
    this.edgeLines.forEach((line) => {
      line.visible = enabled;
    });
  }

  // ==========================================
  // EXPLODED VIEW INTERPOLATION
  // ==========================================
  setExplodedViewProgress(t) {
    this.explodedComponents.forEach((comp) => {
      comp.group.position.lerpVectors(
        comp.basePos,
        comp.basePos.clone().add(comp.explodedOffset),
        t
      );
    });
  }

  // ==========================================
  // REAL-TIME KINEMATIC UPDATE & BELT ROLLING
  // ==========================================
  update(theta1, dt) {
    // 1. Rotate motor rotor, shaft, and fan
    if (this.motorRotorGroup) {
      this.motorRotorGroup.rotation.z = theta1;
    }

    // 2. Rotate worm screw and worm wheel (10:1 reduction)
    if (this.wormScrewMesh) {
      this.wormScrewMesh.rotation.z = theta1;
    }
    if (this.wormWheelMesh) {
      this.wormWheelMesh.rotation.x = theta1 / 10;
    }

    // 3. Rotate 90° miter bevel gears
    if (this.inputBevelMesh) {
      this.inputBevelMesh.rotation.x = theta1 / 10;
    }
    if (this.outputBevelMesh) {
      this.outputBevelMesh.rotation.z = theta1 / 10;
    }

    // 4. Rotate Single Belt Drive Pulleys & Continuous Rolling Animation
    if (this.currentMode === 'belt') {
      if (this.topPulley) this.topPulley.rotation.z = theta1;
      if (this.bottomPulley) this.bottomPulley.rotation.z = theta1;

      if (this.beltCogs && this.beltCogs.length > 0) {
        const xTop = this.shaft1X;       // -144
        const xBottom = this.shaft3X;   // +144
        const rIn = this.pulleyRadius;
        const rOut = this.pulleyRadius + 4;
        const spanLen = Math.abs(xBottom - xTop); // 288 mm
        const curveLen = Math.PI * rIn;
        const totalLen = 2 * spanLen + 2 * curveLen;

        const linearAdvance = theta1 * this.pulleyRadius;
        const fracAdvance = (linearAdvance % totalLen) / totalLen;

        this.beltCogs.forEach((item) => {
          let curFrac = (item.frac + fracAdvance) % 1.0;
          if (curFrac < 0) curFrac += 1.0;
          const d = curFrac * totalLen;
          const r = item.isOuter ? rOut : (rIn - 1.1);

          let cx = 0, cy = 0, czRot = 0;
          if (d < spanLen) {
            // Top strand: moving from Shaft 3 (+144) to Shaft 1 (-144)
            const t = d / spanLen;
            cx = xBottom - t * spanLen;
            cy = r;
            czRot = 0;
          } else if (d < spanLen + curveLen) {
            // Pulley wrap around Shaft 1 (-144)
            const t = (d - spanLen) / curveLen;
            const ang = Math.PI / 2 + t * Math.PI;
            cx = xTop + r * Math.cos(ang);
            cy = r * Math.sin(ang);
            czRot = ang + Math.PI / 2;
          } else if (d < 2 * spanLen + curveLen) {
            // Bottom strand: moving from Shaft 1 (-144) to Shaft 3 (+144)
            const t = (d - spanLen - curveLen) / spanLen;
            cx = xTop + t * spanLen;
            cy = -r;
            czRot = Math.PI;
          } else {
            // Pulley wrap around Shaft 3 (+144)
            const t = (d - 2 * spanLen - curveLen) / curveLen;
            const ang = -Math.PI / 2 + t * Math.PI;
            cx = xBottom + r * Math.cos(ang);
            cy = r * Math.sin(ang);
            czRot = ang + Math.PI / 2;
          }

          item.mesh.position.set(cx, this.shaftY + cy, this.drivePlaneZ);
          item.mesh.rotation.z = czRot;
        });
      }
    }

    // 5. Rotate chain sprockets if active
    if (this.currentMode === 'chain') {
      if (this.chainSprocket1) this.chainSprocket1.rotation.z = theta1;
      if (this.chainSprocket3) this.chainSprocket3.rotation.z = theta1;
    }

    // 6. Rotate spider coupling if active
    if (this.currentMode === 'coupling') {
      if (this.spiderJaw1) this.spiderJaw1.rotation.z = theta1;
    }
  }
}

window.MotorDriveSystem = MotorDriveSystem;
