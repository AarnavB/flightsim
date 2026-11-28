# Stage 3 — Flight simulation and aircraft systems

## Scope and safety boundary

Stage 3 changes the Stage 2 arcade movement implementation into a modular educational simulation prototype. It is **not** certified, manufacturer-calibrated, flight-validated or suitable for real-world aircraft operation or training. The C172P system interactions are abstract software states; this document intentionally does not provide aircraft operating procedures or checklist sequences.

## Runtime architecture

- `aircraft-config.ts` provides aircraft-specific configuration. The C172P profile defines one piston engine, a fixed-pitch propeller and no APU. The fictional demonstration profile exercises an optional APU and a multi-engine count without claiming to model a real aircraft.
- `aircraft-systems.ts` owns electrical, fuel, ignition, engine, avionics and optional APU state. The simulation and guide read snapshots from this manager rather than deriving system state from UI switches.
- `startup-state-machine.ts` evaluates readiness from the systems snapshot. The guide is display/control UI only; completion is never user-editable.
- `flight-simulation.ts` performs fixed-step rigid-body and aerodynamic approximations independently of React and rendering. `environmental-system.ts` owns the local pressure/temperature/wind/visibility settings and density estimate; `propulsion-system.ts` owns the fixed-pitch thrust approximation.
- `arcade-flight.worker.ts` is retained as the worker entry path to preserve integration points, but now runs the Stage 3 simulation. Physics uses a 120 Hz accumulator, a 120 ms incoming-frame clamp, a 12-step catch-up ceiling, dropped-step accounting, and approximately 12 Hz snapshot publication.
- React consumes snapshots and publishes them to the instrument HUD and the existing aircraft renderer. Camera mode transitions do not write to the physics state.
- The existing WorldStreamer remains the owner of quadtree traversal, camera-frustum/LOD selection, request scheduling, cancellation, cache, memory budgets and disposal. Its aircraft position anchor remains local ENU (Three.js X east, Y up, Z south).

## Rigid-body and aerodynamic model

The state includes local position, body-frame velocity, body angular velocity and a normalised body-to-NED quaternion. Translational acceleration includes aerodynamic forces, propulsion, gravity and rotating-body coupling. Angular acceleration uses diagonal inertia and applied aerodynamic/control moments.

The aerodynamic approximation models dynamic pressure, lift coefficient response, parasite and induced drag, side force, angle of attack, sideslip, control authority and a simple stall-region transition. Density is derived from configurable pressure and temperature. Wind is configurable as east/north local components.

### Explicit approximations and limitations

- The current coefficients, mass/inertia and control derivatives are engineering placeholders, not verified or manufacturer-published coefficients.
- The `EnvironmentalSystem` uses a simple pressure/temperature density relation, not a complete ISA implementation. Temperature, pressure, wind and visibility are locally configurable in the simulation API; this milestone does not ship a weather editor or online weather provider.
- The `PropulsionSystem` is a compact normalized piston-engine/fixed-pitch-propeller approximation. It does not reproduce engine maps, mixture, carburettor physics, propeller blade-element aerodynamics, magneto timing or validated thermal limits.
- Ground contact is a local height clamp with simplified velocity damping, not a full landing-gear, tyre, runway-friction or terrain-collision model.
- Instruments are derived from simulation snapshots but indicated airspeed, altitude, vertical speed and other readouts remain approximate. No vacuum gyro, pitot-static failure, magnetic variation, barometric setting or certified instrument-error model is implemented.
- The aircraft mesh and cockpit interior are not a detailed or scale-accurate C172P. The current Stage 2 procedural high-wing exterior remains a temporary visual.
- The optional APU profile is a fictional architecture test. It is not a real aircraft system model. Hydraulics, pneumatics, detailed turbine dynamics, electrical load shedding and independent engine-specific controls are future work.

## Aircraft systems

The C172P profile has one engine system instance and no APU. Electrical state distinguishes battery charge, master state, alternator availability, bus voltage, estimated load and starter availability. Fuel quantity/flow is updated by the fuel subsystem and is consumed only while an engine is running. Ignition, engine RPM/state, propeller RPM, oil-temperature/pressure indications and avionics power are represented in the systems snapshot.

For future profiles, engine instances are allocated from the configured engine count and the APU subsystem is instantiated only when `hasApu` and an APU configuration are both present. This is an extension point; it does not imply that the current UI supports all multi-engine or APU operations. A C172P profile never receives an APU.

## Startup guide

The guide is a toggleable React overlay with a readiness phase, progress meter, state rows, blocked-transition explanations, expandable system notes, beginner explanations, guide-view reset and full simulation restart. Its status is computed from electrical, fuel, ignition, engine and avionics state. A start request is rejected with a reason if the required abstract dependencies are unavailable. The reset-guide-view action only resets presentation preferences; it does not fake a system state transition.

The guide uses broad educational states such as cold-and-dark, electrical initialisation, engine-start simulation, avionics readiness and systems ready. These are application states, not a checklist or an aircraft procedure.

## Instruments, controls and cameras

The HUD reads airspeed, local altitude, vertical speed, heading, attitude, engine RPM, fuel quantity, bus voltage and system warnings from one timestamped worker snapshot. Keyboard and gamepad input continue to use the central Stage 2 input polling path and send normalised controls to the worker. Keyboard focus, key-release and focus-loss handling remain in the existing application.

Cockpit/chase/orbit/free camera modes remain in the existing camera rig. Camera changes are presentation-only. A detailed interactive cockpit panel, clickable individual cockpit switches and accurate C172P interior geometry remain incomplete.

## Coordinate contract

Simulation body axes are X forward, Y right, Z down (FRD). Attitude is a quaternion mapping body coordinates to local NED (north, east, down). Conversion to the existing Three.js render frame is east/up/south: `(x, y, z) = (ned.east, -ned.down, -ned.north)`. The existing WGS84/local tangent frame and Stage 1 world-streaming origin are preserved. This local simulation position is not a navigation solution.

See [coordinate documentation](../geography/coordinates.md).

## JSBSim investigation and decision

JSBSim is not treated as abandoned. The [official upstream repository](https://github.com/JSBSim-Team/jsbsim) describes a C++17, CMake-based, LGPL-2.1 flight-dynamics library. The upstream [v1.3.3 release](https://github.com/JSBSim-Team/jsbsim/releases/tag/v1.3.3) is published in October 2026, and its release notes include an Emscripten portability fix. Upstream therefore has an active development/release stream and browser/WASM feasibility is credible.

A community project, [0x62/jsbsim-wasm](https://github.com/0x62/jsbsim-wasm), provides Emscripten build scripts and a TypeScript SDK, but its README labels the toolkit early development and describes an additional CMake/Emscripten toolchain and compatibility patch. It is not an upstream-maintained official binding. Its existence demonstrates a path, not production readiness.

**Stage 3 decision: investigate further, do not integrate yet.** No new dependency or generated binary is added. Before adoption, Stage 4 should pin upstream commit/tag and the Emscripten compiler image, produce a reproducible local build, test deterministic worker performance and memory, verify the JS/TS boundary and browser lifecycle, and audit every aircraft XML/configuration file and its licence header/source. The C172P coefficients in this Stage 3 internal model are not a reason to bypass those checks.

## Dependencies, cost and deployment

No npm package was added and no package manifest change was required. No external APIs, API keys, subscriptions, proprietary aircraft assets, paid scenery or online runtime service is required. Local development remains Node.js 22.12+ with the repository's existing scripts. The Vercel configuration remains static Vite: install `npm install --no-audit --no-fund`, build `npm run build`, output `dist`. Vercel preview availability and plan limits must be verified per deployment; local operation does not depend on Vercel.

## Validation matrix

The new unit tests cover C172P configuration validation, optional APU profile, dependency-gated engine start, engine state transitions, fuel/ignition interruption, electrical-to-avionics propagation, fuel consistency, control-moment response, atmosphere sensitivity, pause and reset. Browser tests exercise guide visibility, system-start interaction, aircraft controls, instruments, spawn and pause.

These checks validate software state consistency and basic behaviour only. They do not validate real aircraft handling, performance, flight-model fidelity, cockpit procedure accuracy, hardware-controller calibration or sustained runtime performance. CI and production build status must be read from the Stage 3 commit's GitHub Actions run before claiming success. No FPS or performance-improvement figure is asserted.

## Stage 4 priorities

1. Repair any CI/type/browser findings from this PR and run longer deterministic property tests.
2. Establish validated references and independently reviewable aerodynamic/engine parameter sources.
3. Build a detailed, licensed C172P exterior and functional cockpit instrument panel.
4. Add testable instrument-system and failure models, improved gear/ground contact and atmosphere.
5. Create a reproducible JSBSim/WASM proof-of-concept behind a selectable adapter only after licensing and performance gates pass.
6. Profile rendering, physics-worker timing, message queue pressure, memory and world streaming during long sessions.
