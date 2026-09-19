/**
 * gearGenerator.js
 * High-fidelity procedural true involute spur gear generator
 * Compliant with AGMA / ISO standard 20-degree full-depth involute tooth profiles.
 */

class InvoluteGearGenerator {
  /**
   * @param {Object} params
   * @param {number} params.module - Gear module (mm)
   * @param {number} params.teeth - Number of teeth (z)
   * @param {number} params.pressureAngleDeg - Pressure angle (standard 20 deg)
   * @param {number} params.faceWidth - Tooth face width (extrusion depth)
   * @param {number} params.boreRadius - Central shaft bore radius
   * @param {number} params.keywayWidth - Shaft keyway width
   * @param {number} params.keywayDepth - Shaft keyway depth
   * @param {number} params.hubRadius - Hub collar radius
   * @param {number} params.hubLength - Hub axial extension length
   * @param {boolean} params.lighteningHoles - Whether to include web relief holes (for large gear)
   * @param {THREE.Material} params.material - PBR material
   */
  static createGearMesh(params) {
    const m = params.module || 4;
    const z = params.teeth || 18;
    const alphaDeg = params.pressureAngleDeg || 20;
    const alpha = (alphaDeg * Math.PI) / 180;
    const faceWidth = params.faceWidth || 28;
    const boreRadius = params.boreRadius || 12;
    const keywayW = params.keywayWidth || 4;
    const keywayD = params.keywayDepth || 2.5;
    const hubRadius = params.hubRadius || (boreRadius + 8);
    const hubLength = params.hubLength || 10;
    const lighteningHoles = params.lighteningHoles || (z > 30);

    // Standard gear dimensions
    const rp = (m * z) / 2;               // Pitch radius
    const rb = rp * Math.cos(alpha);       // Base circle radius
    const ra = rp + 1.0 * m;               // Addendum radius
    const rd = rp - 1.25 * m;              // Dedendum radius
    const rf = 0.38 * m;                   // Root fillet radius

    // Involute helper functions
    const inv = (a) => Math.tan(a) - a;
    const invAlpha = inv(alpha);

    // Angular pitch
    const pitchAngle = (2 * Math.PI) / z;
    const halfToothThicknessAngle = Math.PI / (2 * z); // Half tooth thickness angle at pitch circle

    // Build 2D tooth outline shape
    const shape = new THREE.Shape();
    const toothPoints = [];

    // Helper: calculate involute angle theta for a given radius r (>= rb)
    const getInvoluteAngle = (r) => {
      const clampedR = Math.max(r, rb);
      const a_r = Math.acos(rb / clampedR);
      return invAlpha - inv(a_r);
    };

    const numInvoluteSamples = 7;

    for (let i = 0; i < z; i++) {
      const toothCenterAngle = i * pitchAngle;

      // 1. Root bottom arc (dedendum circle)
      const rootAngleStart = toothCenterAngle - pitchAngle * 0.5 + 0.015;
      const rootAngleFlank = toothCenterAngle - halfToothThicknessAngle - 0.05;

      // 2. Left flank (rising from rd -> rb -> ra)
      const pRootL = {
        x: rd * Math.cos(rootAngleFlank),
        y: rd * Math.sin(rootAngleFlank)
      };

      const leftFlankPts = [];
      for (let s = 0; s <= numInvoluteSamples; s++) {
        const t = s / numInvoluteSamples;
        const curR = rb + t * (ra - rb);
        const thetaInv = getInvoluteAngle(curR);
        const angle = toothCenterAngle - (halfToothThicknessAngle + thetaInv);
        leftFlankPts.push({
          x: curR * Math.cos(angle),
          y: curR * Math.sin(angle)
        });
      }

      // If rd < rb, add intermediate points from rd to rb
      if (rd < rb) {
        leftFlankPts.unshift({
          x: rd * Math.cos(toothCenterAngle - halfToothThicknessAngle - getInvoluteAngle(rb)),
          y: rd * Math.sin(toothCenterAngle - halfToothThicknessAngle - getInvoluteAngle(rb))
        });
      }

      // 3. Tooth tip arc (addendum circle)
      const tipAngleL = toothCenterAngle - (halfToothThicknessAngle + getInvoluteAngle(ra));
      const tipAngleR = toothCenterAngle + (halfToothThicknessAngle + getInvoluteAngle(ra));

      // 4. Right flank (falling from ra -> rb -> rd)
      const rightFlankPts = [];
      for (let s = numInvoluteSamples; s >= 0; s--) {
        const t = s / numInvoluteSamples;
        const curR = rb + t * (ra - rb);
        const thetaInv = getInvoluteAngle(curR);
        const angle = toothCenterAngle + (halfToothThicknessAngle + thetaInv);
        rightFlankPts.push({
          x: curR * Math.cos(angle),
          y: curR * Math.sin(angle)
        });
      }

      if (rd < rb) {
        rightFlankPts.push({
          x: rd * Math.cos(toothCenterAngle + halfToothThicknessAngle + getInvoluteAngle(rb)),
          y: rd * Math.sin(toothCenterAngle + halfToothThicknessAngle + getInvoluteAngle(rb))
        });
      }

      // Concatenate for this tooth
      if (i === 0) {
        toothPoints.push(leftFlankPts[0]);
      }
      for (let p of leftFlankPts) toothPoints.push(p);
      toothPoints.push({ x: ra * Math.cos(tipAngleL), y: ra * Math.sin(tipAngleL) });
      toothPoints.push({ x: ra * Math.cos(toothCenterAngle), y: ra * Math.sin(toothCenterAngle) });
      toothPoints.push({ x: ra * Math.cos(tipAngleR), y: ra * Math.sin(tipAngleR) });
      for (let p of rightFlankPts) toothPoints.push(p);

      // Root trough to next tooth
      const midTroughAngle = toothCenterAngle + pitchAngle * 0.5;
      toothPoints.push({
        x: rd * Math.cos(midTroughAngle),
        y: rd * Math.sin(midTroughAngle)
      });
    }

    // Build Shape from tooth points
    shape.moveTo(toothPoints[0].x, toothPoints[0].y);
    for (let i = 1; i < toothPoints.length; i++) {
      shape.lineTo(toothPoints[i].x, toothPoints[i].y);
    }
    shape.closePath();

    // Central bore with keyway cutout
    const borePath = new THREE.Path();
    const boreSteps = 32;
    const keyHalfW = keywayW / 2;
    const keyTop = boreRadius + keywayD;

    borePath.moveTo(keyHalfW, boreRadius * Math.cos(Math.asin(Math.min(0.99, keyHalfW / boreRadius))));
    borePath.lineTo(keyHalfW, keyTop);
    borePath.lineTo(-keyHalfW, keyTop);
    borePath.lineTo(-keyHalfW, boreRadius * Math.cos(Math.asin(Math.min(0.99, keyHalfW / boreRadius))));

    const startAngle = Math.PI - Math.asin(Math.min(0.99, keyHalfW / boreRadius));
    const endAngle = 2 * Math.PI + Math.asin(Math.min(0.99, keyHalfW / boreRadius));
    for (let j = 0; j <= boreSteps; j++) {
      const theta = startAngle + (j / boreSteps) * (endAngle - startAngle);
      borePath.lineTo(boreRadius * Math.sin(theta), boreRadius * Math.cos(theta));
    }
    borePath.closePath();
    shape.holes.push(borePath);

    // Lightening holes for 54T gear
    if (lighteningHoles) {
      const numHoles = 5;
      const holeOrbitR = (rp + boreRadius + 10) / 2;
      const holeRadius = Math.min(18, (holeOrbitR * 2 * Math.PI) / (numHoles * 2.6));
      for (let h = 0; h < numHoles; h++) {
        const hAngle = (h * 2 * Math.PI) / numHoles;
        const cx = holeOrbitR * Math.cos(hAngle);
        const cy = holeOrbitR * Math.sin(hAngle);
        const holePath = new THREE.Path();
        holePath.absarc(cx, cy, holeRadius, 0, Math.PI * 2, false);
        shape.holes.push(holePath);
      }
    }

    // Extrude geometry with bevel
    const extrudeSettings = {
      steps: 1,
      depth: faceWidth,
      bevelEnabled: true,
      bevelThickness: 0.8,
      bevelSize: 0.6,
      bevelOffset: -0.2,
      bevelSegments: 3
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.translate(0, 0, -faceWidth / 2);
    geometry.computeVertexNormals();

    const gearGroup = new THREE.Group();
    const gearMesh = new THREE.Mesh(geometry, params.material);
    gearMesh.castShadow = true;
    gearMesh.receiveShadow = true;
    gearGroup.add(gearMesh);

    // Hub Boss collar
    const hubGeom = new THREE.CylinderGeometry(hubRadius, hubRadius, hubLength, 32);
    hubGeom.rotateX(Math.PI / 2);
    const hubMat = params.material.clone();
    hubMat.roughness = 0.45;
    const hubMesh = new THREE.Mesh(hubGeom, hubMat);
    hubMesh.position.z = faceWidth / 2 + hubLength / 2 - 0.2;
    hubMesh.castShadow = true;
    gearGroup.add(hubMesh);

    // Hex socket set screw on hub
    const screwGeom = new THREE.CylinderGeometry(2, 2, 3, 12);
    const screwMat = new THREE.MeshStandardMaterial({
      color: 0x1a1d20,
      roughness: 0.4,
      metalness: 0.9
    });
    const screwMesh = new THREE.Mesh(screwGeom, screwMat);
    screwMesh.position.set(0, hubRadius - 0.5, hubMesh.position.z);
    gearGroup.add(screwMesh);

    // Pitch circle diameter wireframe helper
    const pitchCircleGeom = new THREE.BufferGeometry();
    const pcPoints = [];
    const pcSegments = 64;
    for (let k = 0; k <= pcSegments; k++) {
      const th = (k / pcSegments) * Math.PI * 2;
      pcPoints.push(rp * Math.cos(th), rp * Math.sin(th), 0);
    }
    pitchCircleGeom.setAttribute('position', new THREE.Float32BufferAttribute(pcPoints, 3));
    const pitchCircleMat = new THREE.LineDashedMaterial({
      color: 0x00e5ff,
      dashSize: 3,
      gapSize: 2,
      linewidth: 2
    });
    const pitchCircleLine = new THREE.Line(pitchCircleGeom, pitchCircleMat);
    pitchCircleLine.computeLineDistances();
    pitchCircleLine.visible = false;
    pitchCircleLine.name = 'pitchCircleOverlay';
    gearGroup.add(pitchCircleLine);

    // Attach metadata
    gearGroup.userData = {
      teeth: z,
      module: m,
      pitchRadius: rp,
      pitchDiameter: rp * 2,
      baseRadius: rb,
      addendumRadius: ra,
      dedendumRadius: rd,
      faceWidth: faceWidth,
      gearMesh: gearMesh
    };

    return gearGroup;
  }
}

window.InvoluteGearGenerator = InvoluteGearGenerator;
