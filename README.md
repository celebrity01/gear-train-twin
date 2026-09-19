# Industrial Gear Train Digital Twin

An interactive, high-fidelity 3D WebGL digital twin and kinematic simulation of an industrial multi-shaft transmission system, Dolang-style electric drive motor, 90° worm reduction gearbox, rolling belt transmission, and staggered spur gear stages.

## Overview

This project provides an engineering-grade 3D mechanical simulation of an integrated power transmission system:
- **Dolang Electric Drive Motor**: Colinear with Shaft 1, featuring extruded aluminum stator, cooling fins, internal rotor core, copper wire coils, impeller fan, and terminal box.
- **Direct Motor-to-Gearbox Connection**: Aligned ground steel drive shaft entering the worm gearbox with zero gap.
- **90° Rotated Worm Reduction Gearbox**: Die-cast aluminum casing with cooling fins, phosphor bronze worm wheel, hardened steel worm screw (10:1 reduction), and transverse torque tube to Shaft 2.
- **Continuous Belt Transmission**: Rolling neoprene V-belt connecting Shaft 1 and Shaft 3 with dynamic texture coordinate animation.
- **Multi-Shaft Staggered Gear Train**: 2-stage precision spur gear train across 3 parallel shafts (Shaft 1 Input, Shaft 2 Intermediate, Shaft 3 Output) with authentic tooth meshing profiles and zero gear interference.
- **Pillow Block Bearings**: Authentic UCP 205 cast-iron housings with inner/outer raceways and grease fittings.
- **Unified Precision Slotted Bedplate**: Heavy-duty industrial T-slot baseplate.

## Features

- **Real-Time Kinematic Simulation**: Accurate angular velocities, gear ratio calculations, and direction reversals.
- **Transparent X-Ray Cutaway Mode**: View internal rotating assemblies, gear meshing, and motor windings with CAD blueprint edge outlines.
- **Exploded View**: Interactive 0–100% assembly inspection showing all component positions and relations.
- **Pitch Circles & Line of Action**: Engineering overlay visualizing pitch circles and pressure line vectors.
- **Interactive HUD**: Real-time tachometer, RPM gauges, torque readouts, gear ratio displays, and speed controls.
- **Synthesized Audio**: Dynamic mechanical acoustic feedback corresponding to motor speed and gear meshing frequency.

## Getting Started

### Prerequisites
Any modern web browser supporting WebGL (Chrome, Firefox, Edge, Safari). No build tools or Node.js required.

### Running Locally
To launch locally using Python's built-in HTTP server:
```bash
# Clone the repository
git clone https://github.com/celebrity01/gear-train-twin.git
cd gear-train-twin

# Start a local web server
python -m http.server 8085
```
Then open your browser and navigate to:
```
http://localhost:8085/index.html
```

Or double-click `start.bat` on Windows.

## Controls
- **Left Click + Drag**: Orbit / Rotate camera
- **Right Click + Drag**: Pan camera
- **Scroll Wheel**: Zoom in / out
- **Run / Pause**: Start or halt kinematic simulation
- **Transparent Mode**: Toggle translucent casing and edge wireframes
- **Exploded View**: Slide to inspect disassembled components

## Architecture
- `index.html`: Entry point and UI overlay HUD
- `css/style.css`: Modern engineering dark-mode HUD styling
- `js/main.js`: Core application lifecycle, rendering pipeline, and loop
- `js/modelAssembly.js`: 3D transmission assembly, shafts, bearings, and baseplate
- `js/motorDrive.js`: Electric motor, worm gearbox, belt drive, and couplings
- `js/kinematics.js`: Analytical speed and gear ratio physics solver
- `js/gearGenerator.js`: Involute tooth geometry generation
- `js/audioSynthesizer.js`: Procedural Web Audio API sound engine
- `js/hudController.js`: UI event binding and dashboard telemetry updates
- `js/three.min.js`: Three.js WebGL 3D library (r128)
- `js/OrbitControls.js`: Three.js camera interaction controls

## License
MIT License
