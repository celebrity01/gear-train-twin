/**
 * audioSynthesizer.js
 * High-fidelity Web Audio API acoustic gear train synthesizer
 * - Synthesizes real-time tooth meshing tones (f1 = n1 * z1, f2 = n2 * z3)
 * - Simulates mechanical sidebands, bearing raceway rumble, and load-dependent acoustic whine
 */

class GearAudioSynthesizer {
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
    this.volume = 0.35;

    // Audio node references
    this.masterGain = null;
    this.oscStage1 = null;
    this.oscStage2 = null;
    this.oscHarmonic1 = null;
    this.oscHarmonic2 = null;
    this.noiseNode = null;
    this.noiseFilter = null;
    this.noiseGain = null;

    this.gainStage1 = null;
    this.gainStage2 = null;
  }

  init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();

    // Master Limiter / Dynamics Compressor
    const compressor = this.ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-12, this.ctx.currentTime);
    compressor.knee.setValueAtTime(30, this.ctx.currentTime);
    compressor.ratio.setValueAtTime(12, this.ctx.currentTime);
    compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
    compressor.release.setValueAtTime(0.25, this.ctx.currentTime);
    compressor.connect(this.ctx.destination);

    // Master volume gain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    this.masterGain.connect(compressor);

    // 1. Stage 1 Gear Meshing Tone (Carrier Oscillator)
    this.oscStage1 = this.ctx.createOscillator();
    this.oscStage1.type = 'triangle';
    this.gainStage1 = this.ctx.createGain();
    this.gainStage1.gain.setValueAtTime(0.001, this.ctx.currentTime);
    this.oscStage1.connect(this.gainStage1);
    this.gainStage1.connect(this.masterGain);
    this.oscStage1.start();

    // 1b. Stage 1 Second Harmonic
    this.oscHarmonic1 = this.ctx.createOscillator();
    this.oscHarmonic1.type = 'sine';
    this.gainHarmonic1 = this.ctx.createGain();
    this.gainHarmonic1.gain.setValueAtTime(0.001, this.ctx.currentTime);
    this.oscHarmonic1.connect(this.gainHarmonic1);
    this.gainHarmonic1.connect(this.masterGain);
    this.oscHarmonic1.start();

    // 2. Stage 2 Gear Meshing Tone (Carrier Oscillator)
    this.oscStage2 = this.ctx.createOscillator();
    this.oscStage2.type = 'sawtooth';
    this.gainStage2 = this.ctx.createGain();
    this.gainStage2.gain.setValueAtTime(0.001, this.ctx.currentTime);
    this.oscStage2.connect(this.gainStage2);
    this.gainStage2.connect(this.masterGain);
    this.oscStage2.start();

    // 3. Bearing Raceway Rumble (Filtered Noise)
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.02 * white) / 1.02; // Pink noise approximation
      lastOut = output[i];
    }

    this.noiseNode = this.ctx.createBufferSource();
    this.noiseNode.buffer = noiseBuffer;
    this.noiseNode.loop = true;

    this.noiseFilter = this.ctx.createBiquadFilter();
    this.noiseFilter.type = 'bandpass';
    this.noiseFilter.frequency.setValueAtTime(140, this.ctx.currentTime);
    this.noiseFilter.Q.setValueAtTime(3.0, this.ctx.currentTime);

    this.noiseGain = this.ctx.createGain();
    this.noiseGain.gain.setValueAtTime(0.001, this.ctx.currentTime);

    this.noiseNode.connect(this.noiseFilter);
    this.noiseFilter.connect(this.noiseGain);
    this.noiseGain.connect(this.masterGain);
    this.noiseNode.start();
  }

  toggle() {
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.isPlaying = !this.isPlaying;
    if (!this.isPlaying && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    } else if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
    return this.isPlaying;
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, Number(val)));
    if (this.masterGain && this.isPlaying) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  /**
   * Updates frequency and amplitudes based on kinematics telemetry
   */
  update(telemetry) {
    if (!this.isPlaying || !this.ctx) return;

    const rpm1 = telemetry.rpm1 || 0;
    const rpm2 = telemetry.rpm2 || 0;
    const loadFactor = 0.3 + 0.7 * ((telemetry.torque4 || 30) / 100);

    if (rpm1 <= 5) {
      // Idle silence
      this.gainStage1.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.05);
      this.gainStage2.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.05);
      this.gainHarmonic1.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.05);
      this.noiseGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.05);
      return;
    }

    // Tooth mesh frequencies
    // Stage 1: f1 = (rpm1 / 60) * 18
    const f1 = Math.max(20, (rpm1 / 60) * 18);
    // Stage 2: f2 = (rpm2 / 60) * 18 = f1 / 3
    const f2 = Math.max(20, (rpm2 / 60) * 18);

    // Smooth frequency interpolation
    this.oscStage1.frequency.setTargetAtTime(f1, this.ctx.currentTime, 0.04);
    this.oscHarmonic1.frequency.setTargetAtTime(f1 * 2, this.ctx.currentTime, 0.04);
    this.oscStage2.frequency.setTargetAtTime(f2, this.ctx.currentTime, 0.04);

    // Amplitudes
    const baseAmp = Math.min(1.0, rpm1 / 1800);
    this.gainStage1.gain.setTargetAtTime(baseAmp * 0.22 * loadFactor, this.ctx.currentTime, 0.04);
    this.gainHarmonic1.gain.setTargetAtTime(baseAmp * 0.08 * loadFactor, this.ctx.currentTime, 0.04);
    this.gainStage2.gain.setTargetAtTime(baseAmp * 0.28 * loadFactor, this.ctx.currentTime, 0.04);

    // Bearing rumble filter tracks shaft rotational speed
    const bearingFreq = Math.max(60, (rpm1 / 60) * 8);
    this.noiseFilter.frequency.setTargetAtTime(bearingFreq, this.ctx.currentTime, 0.05);
    this.noiseGain.gain.setTargetAtTime(baseAmp * 0.12, this.ctx.currentTime, 0.05);
  }
}

window.GearAudioSynthesizer = GearAudioSynthesizer;
