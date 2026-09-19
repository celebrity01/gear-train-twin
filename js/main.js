/**
 * main.js
 * Core application orchestrator for Two-Stage Compound Spur Gear Train Digital Twin
 * - Studio Three.js lighting & shadow setup
 * - Machine assembly lifecycle
 * - Render animation loop & smooth camera transitions
 */

class DigitalTwinApp {
  constructor() {
    this.canvasContainer = document.getElementById('webgl-container');
    this.cameraAnimation = null;
    this.isAutoOrbit = false;

    this.initThree();
    this.initLighting();
    this.initGroundAndGrid();

    // Core Systems
    this.assembly = new MachineAssembly(this.scene);
    this.kinematics = new KinematicsEngine();
    this.audio = new GearAudioSynthesizer();
    this.hud = new HUDController(this);

    // Initial Camera Preset: CAD Isometric matching reference image
    this.setCameraPreset('isometric', false);

    this.clock = new THREE.Clock();
    this.isRunning = true;

    window.addEventListener('resize', () => this.onWindowResize());
    this.animate();
  }

  initThree() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf4f6f9);
    this.scene.fog = new THREE.Fog(0xf4f6f9, 1400, 3600);

    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(38, aspect, 1, 4000);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;

    this.canvasContainer.appendChild(this.renderer.domElement);

    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.02; // Prevent going below ground
    this.controls.minDistance = 80;
    this.controls.maxDistance = 1800;
    this.controls.target.set(0, 135, -120);
  }

  initLighting() {
    // 1. Balanced Hemisphere Fill Light
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xe2e8f0, 0.88);
    hemiLight.position.set(0, 500, 0);
    this.scene.add(hemiLight);

    // 2. Directional Key Light with Soft Shadow Mapping
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.35);
    keyLight.position.set(380, 550, 320);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 100;
    keyLight.shadow.camera.far = 1600;
    const d = 360;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0004;
    keyLight.shadow.radius = 2.4;
    this.scene.add(keyLight);

    // 3. Specular Edge Rim Light for crisp metallic edges
    const rimLight = new THREE.DirectionalLight(0xccdcff, 0.85);
    rimLight.position.set(-360, 320, -380);
    this.scene.add(rimLight);

    // 4. Subtle Front Softener Light
    const frontFill = new THREE.DirectionalLight(0xffeedd, 0.45);
    frontFill.position.set(0, 100, 450);
    this.scene.add(frontFill);

    // 5. Dedicated High-Intensity Studio Light for Drive Motor & Modular Transmissions
    const motorKeyLight = new THREE.DirectionalLight(0xffffff, 1.45);
    motorKeyLight.position.set(-280, 460, 300);
    motorKeyLight.castShadow = true;
    motorKeyLight.shadow.mapSize.width = 1024;
    motorKeyLight.shadow.mapSize.height = 1024;
    motorKeyLight.shadow.bias = -0.0003;
    this.scene.add(motorKeyLight);
  }

  initGroundAndGrid() {
    // A. Soft Contact Shadow Floor
    const shadowPlaneGeom = new THREE.PlaneGeometry(2400, 2400);
    const shadowPlaneMat = new THREE.ShadowMaterial({
      opacity: 0.16,
      transparent: true
    });
    const shadowMesh = new THREE.Mesh(shadowPlaneGeom, shadowPlaneMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = 0;
    shadowMesh.receiveShadow = true;
    this.scene.add(shadowMesh);

    // B. Engineering Precision Coordinate Grid
    const grid = new THREE.GridHelper(1800, 90, 0x8896a6, 0xd0d7de);
    grid.position.y = 0.1;
    grid.material.opacity = 0.45;
    grid.material.transparent = true;
    this.scene.add(grid);
  }

  setCameraPreset(presetName, animate = true) {
    const presets = {
      // Isometric view perfectly centering the entire motor + gearbox + multi-shaft assembly
      isometric: {
        pos: new THREE.Vector3(380, 480, 180),
        target: new THREE.Vector3(0, 135, -120)
      },
      // Motor & Rotated Gearbox Close-up
      motorDrive: {
        pos: new THREE.Vector3(-320, 280, -200),
        target: new THREE.Vector3(-72, 135, -240)
      },
      // Internal Working Parts View (Worm gear, bevel gear, motor coils)
      internals: {
        pos: new THREE.Vector3(-220, 240, -220),
        target: new THREE.Vector3(-72, 135, -240)
      },
      // Close-up on Stage 1 Mesh (Pinion 1 <-> Wheel 2 at Z = -15)
      mesh1: {
        pos: new THREE.Vector3(-95, 200, 100),
        target: new THREE.Vector3(-72, 135, -15)
      },
      // Close-up on Stage 2 Mesh (Pinion 3 <-> Wheel 4 at Z = +105)
      mesh2: {
        pos: new THREE.Vector3(120, 210, 220),
        target: new THREE.Vector3(72, 135, 105)
      },
      // Engineering Top View (Plan Projection matching CAD Schematic)
      top: {
        pos: new THREE.Vector3(0, 920, -120),
        target: new THREE.Vector3(0, 135, -120)
      },
      // End View down the shaft axes
      endView: {
        pos: new THREE.Vector3(0, 135, 640),
        target: new THREE.Vector3(0, 135, -120)
      }
    };

    const targetPreset = presets[presetName];
    if (!targetPreset) return;

    this.isAutoOrbit = false;

    if (!animate) {
      this.camera.position.copy(targetPreset.pos);
      this.controls.target.copy(targetPreset.target);
      this.controls.update();
      return;
    }

    // Smooth camera transition animation
    this.cameraAnimation = {
      startPos: this.camera.position.clone(),
      endPos: targetPreset.pos.clone(),
      startTarget: this.controls.target.clone(),
      endTarget: targetPreset.target.clone(),
      duration: 1.0,
      elapsed: 0
    };
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const dt = Math.min(0.05, this.clock.getDelta());

    // 1. Update Camera Tween Animation
    if (this.cameraAnimation) {
      this.cameraAnimation.elapsed += dt;
      const progress = Math.min(1.0, this.cameraAnimation.elapsed / this.cameraAnimation.duration);
      // Smooth cubic ease out
      const ease = 1 - Math.pow(1 - progress, 3);

      this.camera.position.lerpVectors(this.cameraAnimation.startPos, this.cameraAnimation.endPos, ease);
      this.controls.target.lerpVectors(this.cameraAnimation.startTarget, this.cameraAnimation.endTarget, ease);
      this.controls.update();

      if (progress >= 1.0) {
        this.cameraAnimation = null;
      }
    } else if (this.isAutoOrbit) {
      // Auto Orbit around the central gear train
      const speed = 0.25 * dt;
      const radius = Math.hypot(this.camera.position.x, this.camera.position.z);
      const angle = Math.atan2(this.camera.position.z, this.camera.position.x) + speed;
      this.camera.position.x = radius * Math.cos(angle);
      this.camera.position.z = radius * Math.sin(angle);
      this.controls.update();
    } else {
      this.controls.update();
    }

    // 2. Physics & Kinematics Update
    let angles = { theta1: 0, theta2: 0, theta4: 0, telemetry: {} };
    if (this.isRunning) {
      angles = this.kinematics.update(dt);
    } else {
      angles.telemetry = this.kinematics.telemetry;
    }

    // 3. Update 3D Geometry Rotations
    this.assembly.updateRotations(angles, dt);

    // 4. Update Web Audio Synthesizer
    if (this.audio) {
      this.audio.update(angles.telemetry);
    }

    // 5. Update Telemetry HUD
    this.hud.updateTelemetry(angles.telemetry);

    // 6. Render Scene
    this.renderer.render(this.scene, this.camera);
  }
}

function launchApp() {
  if (!window.app) {
    window.app = new DigitalTwinApp();
  }
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', launchApp);
} else {
  launchApp();
}

