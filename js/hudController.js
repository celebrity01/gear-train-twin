/**
 * hudController.js
 * High-performance UI and HUD event controller
 * Synchronizes engineering telemetry gauges, sliders, toggles, and camera view presets
 */

class HUDController {
  constructor(app) {
    this.app = app;
    this.initElements();
    this.bindEvents();
    this.lastTelemetryUpdate = 0;
  }

  initElements() {
    // Controls
    this.rpmSlider = document.getElementById('rpm-slider');
    this.rpmValue = document.getElementById('rpm-value');
    this.loadSlider = document.getElementById('load-slider');
    this.loadValue = document.getElementById('load-value');
    this.explodeSlider = document.getElementById('explode-slider');
    this.explodeValue = document.getElementById('explode-value');
    this.backlashSlider = document.getElementById('backlash-slider');
    this.backlashValue = document.getElementById('backlash-value');

    this.playPauseBtn = document.getElementById('btn-play-pause');
    this.reverseBtn = document.getElementById('btn-reverse');
    this.cutawayBtn = document.getElementById('btn-cutaway');
    this.transparentBtn = document.getElementById('btn-transparent');
    this.quickTransparentBtn = document.getElementById('btn-quick-transparent');
    this.overlayBtn = document.getElementById('btn-overlay');
    this.audioBtn = document.getElementById('btn-audio');

    // Telemetry readouts
    this.telRpm1 = document.getElementById('tel-rpm1');
    this.telRpm2 = document.getElementById('tel-rpm2');
    this.telRpm4 = document.getElementById('tel-rpm4');
    this.telTorque1 = document.getElementById('tel-torque1');
    this.telTorque2 = document.getElementById('tel-torque2');
    this.telTorque4 = document.getElementById('tel-torque4');
    this.telPower = document.getElementById('tel-power');
    this.telPitchVel = document.getElementById('tel-pitch-vel');
    this.telMeshFreq1 = document.getElementById('tel-mesh-freq1');
    this.telMeshFreq2 = document.getElementById('tel-mesh-freq2');
    this.telLewis = document.getElementById('tel-lewis');
    this.telHertz = document.getElementById('tel-hertz');

    // Progress bar fills
    this.barRpm = document.getElementById('bar-rpm');
    this.barLoad = document.getElementById('bar-load');
    this.barStress = document.getElementById('bar-stress');
  }

  bindEvents() {
    // 1. Input RPM Slider
    if (this.rpmSlider) {
      this.rpmSlider.addEventListener('input', (e) => {
        const val = Number(e.target.value);
        this.rpmValue.textContent = `${val} RPM`;
        this.app.kinematics.setInputRpm(val);
      });
    }

    // RPM Quick Presets
    document.querySelectorAll('.preset-rpm-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const val = Number(btn.getAttribute('data-val'));
        this.rpmSlider.value = val;
        this.rpmValue.textContent = `${val} RPM`;
        this.app.kinematics.setInputRpm(val);
      });
    });

    // 2. Braking Load Slider
    if (this.loadSlider) {
      this.loadSlider.addEventListener('input', (e) => {
        const val = Number(e.target.value);
        this.loadValue.textContent = `${val.toFixed(1)} N·m`;
        this.app.kinematics.setBrakingLoad(val);
      });
    }

    // 3. Exploded View Slider
    if (this.explodeSlider) {
      this.explodeSlider.addEventListener('input', (e) => {
        const val = Number(e.target.value);
        this.explodeValue.textContent = `${Math.round(val * 100)}%`;
        this.app.assembly.setExplodedFactor(val);
      });
    }

    // 4. Backlash / Center Distance Slider
    if (this.backlashSlider) {
      this.backlashSlider.addEventListener('input', (e) => {
        const val = Number(e.target.value);
        this.backlashValue.textContent = `${val.toFixed(2)} mm`;
        this.app.kinematics.setBacklash(val);
      });
    }

    // 5. Play / Pause
    if (this.playPauseBtn) {
      this.playPauseBtn.addEventListener('click', () => {
        this.app.isRunning = !this.app.isRunning;
        this.playPauseBtn.innerHTML = this.app.isRunning
          ? '<span class="icon">⏸</span> Pause'
          : '<span class="icon">▶</span> Run';
        this.playPauseBtn.classList.toggle('active', this.app.isRunning);
      });
    }

    // 6. Reverse Direction
    if (this.reverseBtn) {
      this.reverseBtn.addEventListener('click', () => {
        const newDir = this.app.kinematics.direction * -1;
        this.app.kinematics.setDirection(newDir);
        this.reverseBtn.classList.toggle('active', newDir < 0);
      });
    }

    // 7. Transparent View & Cutaway Mode
    let isTransparentActive = false;
    const toggleTransparent = () => {
      isTransparentActive = !isTransparentActive;
      this.app.assembly.setTransparentMode(isTransparentActive);
      if (this.transparentBtn) this.transparentBtn.classList.toggle('active', isTransparentActive);
      if (this.quickTransparentBtn) this.quickTransparentBtn.classList.toggle('active', isTransparentActive);
      if (this.cutawayBtn) this.cutawayBtn.classList.toggle('active', isTransparentActive);
    };

    if (this.transparentBtn) this.transparentBtn.addEventListener('click', toggleTransparent);
    if (this.quickTransparentBtn) this.quickTransparentBtn.addEventListener('click', toggleTransparent);
    if (this.cutawayBtn) this.cutawayBtn.addEventListener('click', toggleTransparent);

    // 8. Pitch Circles & Line of Action Overlay
    let isOverlayActive = false;
    if (this.overlayBtn) {
      this.overlayBtn.addEventListener('click', () => {
        isOverlayActive = !isOverlayActive;
        if (this.app.assembly.overlayGroup) {
          this.app.assembly.overlayGroup.visible = isOverlayActive;
        }
        this.overlayBtn.classList.toggle('active', isOverlayActive);
      });
    }

    // 9. Web Audio Toggle
    if (this.audioBtn) {
      this.audioBtn.addEventListener('click', () => {
        const isPlaying = this.app.audio.toggle();
        this.audioBtn.classList.toggle('active', isPlaying);
        this.audioBtn.innerHTML = isPlaying
          ? '<span class="icon">🔊</span> Synth On'
          : '<span class="icon">🔇</span> Sound Muted';
      });
    }

    // 10. Camera Presets
    document.querySelectorAll('[data-camera]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const preset = btn.getAttribute('data-camera');
        document.querySelectorAll('[data-camera]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        if (preset === 'orbit') {
          this.app.isAutoOrbit = !this.app.isAutoOrbit;
          btn.classList.toggle('active', this.app.isAutoOrbit);
        } else {
          this.app.setCameraPreset(preset, true);
          if (preset === 'internals' && !isTransparentActive) {
            toggleTransparent();
          }
        }
      });
    });

    // 11. Drive Transmission Mode Selector (Belt / Chain / Coupling)
    document.querySelectorAll('[data-drive]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-drive');
        document.querySelectorAll('[data-drive]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        this.app.assembly.setDriveMode(mode);

        const labelMap = {
          belt: 'Timing Belt Drive (1:1)',
          chain: '08A Roller Chain (1:1)',
          combo: 'Belt + Roller Chain Combo (Jackshaft)',
          coupling: 'Spider Flexible Coupling (In-Line)'
        };
        const el = document.getElementById('tel-drive-type');
        if (el) el.textContent = labelMap[mode] || mode;
      });
    });

    // 12. Collapsible HUD Panels
    const panelTelemetry = document.getElementById('panel-telemetry');
    const panelControls = document.getElementById('panel-controls');
    const btnCollapseLeft = document.getElementById('btn-collapse-left');
    const btnReopenLeft = document.getElementById('btn-reopen-left');
    const btnCollapseRight = document.getElementById('btn-collapse-right');
    const btnReopenRight = document.getElementById('btn-reopen-right');

    if (btnCollapseLeft && panelTelemetry && btnReopenLeft) {
      btnCollapseLeft.addEventListener('click', () => {
        panelTelemetry.classList.add('collapsed');
        btnReopenLeft.style.display = 'flex';
      });
      btnReopenLeft.addEventListener('click', () => {
        panelTelemetry.classList.remove('collapsed');
        btnReopenLeft.style.display = 'none';
      });
    }

    if (btnCollapseRight && panelControls && btnReopenRight) {
      btnCollapseRight.addEventListener('click', () => {
        panelControls.classList.add('collapsed');
        btnReopenRight.style.display = 'flex';
      });
      btnReopenRight.addEventListener('click', () => {
        panelControls.classList.remove('collapsed');
        btnReopenRight.style.display = 'none';
      });
    }
  }

  /**
   * Throttled Telemetry UI Refresh
   */
  updateTelemetry(tel) {
    const now = performance.now();
    if (now - this.lastTelemetryUpdate < 50) return; // 20 Hz update
    this.lastTelemetryUpdate = now;

    if (!tel) return;

    if (this.telRpm1) this.telRpm1.textContent = Math.round(tel.rpm1 || 0);
    if (this.telRpm2) this.telRpm2.textContent = Math.round(tel.rpm2 || 0);
    if (this.telRpm4) this.telRpm4.textContent = Math.round(tel.rpm4 || 0);

    if (this.telTorque1) this.telTorque1.textContent = (tel.torque1 || 0).toFixed(2);
    if (this.telTorque2) this.telTorque2.textContent = (tel.torque2 || 0).toFixed(2);
    if (this.telTorque4) this.telTorque4.textContent = (tel.torque4 || 0).toFixed(2);

    if (this.telPower) this.telPower.textContent = (tel.powerKw || 0).toFixed(3);
    if (this.telPitchVel) this.telPitchVel.textContent = (tel.pitchVel1 || 0).toFixed(2);

    if (this.telMeshFreq1) this.telMeshFreq1.textContent = `${Math.round(tel.meshFreq1 || 0)} Hz`;
    if (this.telMeshFreq2) this.telMeshFreq2.textContent = `${Math.round(tel.meshFreq2 || 0)} Hz`;

    if (this.telLewis) this.telLewis.textContent = (tel.lewisStress2 || 0).toFixed(1);
    if (this.telHertz) this.telHertz.textContent = (tel.hertzStress2 || 0).toFixed(1);

    // Bars
    if (this.barRpm) {
      const pct = Math.min(100, ((tel.rpm1 || 0) / 3000) * 100);
      this.barRpm.style.width = `${pct}%`;
    }
    if (this.barLoad) {
      const pct = Math.min(100, ((tel.torque4 || 0) / 100) * 100);
      this.barLoad.style.width = `${pct}%`;
    }
    if (this.barStress) {
      const pct = Math.min(100, ((tel.hertzStress2 || 0) / 850) * 100);
      this.barStress.style.width = `${pct}%`;
    }
  }
}

window.HUDController = HUDController;
