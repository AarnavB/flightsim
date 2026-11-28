# PROJECT FLIGHTSIM

A browser-based flight-simulator foundation. Phase 1 establishes a Three.js / React Three Fiber WebGL 2 viewport, WGS84 geographic utilities, a lazy geographical quadtree, deterministic procedural terrain, and on-demand scenery streaming.

## Current milestone

- Full-window React application with an interactive 3D viewport.
- Mouse / trackpad look, keyboard movement, adjustable camera sensitivity, speed adjustment and camera reset.
- WGS84 geodetic/ECEF conversion and an independent local east-north-up rendering frame.
- Lazy global tile metadata organised as a four-child quadtree with antimeridian-safe X wrapping.
- Procedural terrain sampled from globally periodic geographic functions, generated in cancellable Web Workers where supported.
- Terrain BufferGeometry, vertex normals, terrain colour and boundary skirts.
- Camera frustum and distance selection, screen-space-error LOD and hysteresis.
- Priority-ordered asynchronous requests, request de-duplication, cancellation and bounded retries.
- Predictive camera-motion prefetching, retention, parent-tile fallback and application-managed resource disposal.
- Low / Medium / High / Ultra graphics profiles that change resolution, view distance, LOD, geometry detail, queue concurrency, update cadence, shadows and memory budgets.
- Streaming diagnostics with measured FPS, frame time, geographic camera position, LOD, scheduler counters, renderer draw calls / triangles and explicitly labelled memory estimates.
- Vitest unit tests, Playwright browser smoke tests and GitHub Actions validation workflow.

**Scenery data disclaimer:** The current terrain is a synthetic engineering fixture around the San Francisco Bay Area. No real-world elevation model, satellite imagery, airport database, buildings, roads or third-party map tiles have been integrated.

## Quick start

Requirements: Node.js 22.12+ and npm.

~~~bash
npm install
npm run dev
~~~

Open the local URL printed by Vite.

| Control | Action |
| --- | --- |
| W / A / S / D | Move forward / left / backward / right |
| Space / Shift | Move vertically |
| Mouse or trackpad drag | Look around |
| Arrow keys | Rotate camera |
| Mouse wheel | Adjust movement speed |
| R | Reset camera |
| Quality selector | Change graphics profile |
| Diagnostics button | Toggle streaming telemetry |
| Settings button | Change sensitivity and reset camera |
| Fullscreen button | Enter / leave fullscreen |

## Validation

~~~bash
npm run lint
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run build
~~~

CI installs Chromium and runs all checks on pushes to `main`, `phase-1/**`, `stage-2/**` and `stage-3/**`, plus pull requests targeting `main`, `phase-1/**` or `stage-2/**`.

## Zero-cost operation

The application is browser-local and does not require a runtime backend, database, paid API, paid AI service, imagery subscription, or external map-tile service. Hosting is optional. Vercel Hobby is configured as a static-site target; connect and deploy only while the project remains eligible under current personal/non-commercial terms and within the plan's allowances. No paid upgrade, domain purchase or add-on is configured.

GitHub Actions uses the repository's standard free allowances. If those are exhausted, local development and local tests still work; CI is not required at runtime.

## Architecture

- [System architecture](docs/architecture/overview.md)
- [Geographic coordinate model](docs/geography/coordinates.md)
- [Rendering architecture](docs/rendering/rendering.md)
- [World streaming](docs/streaming/world-streaming.md)
- [Chunk lifecycle](docs/streaming/chunk-lifecycle.md)
- [Memory management](docs/streaming/memory-management.md)
- [Testing guide](docs/testing/testing.md)
- [Deployment guide](docs/deployment/deployment.md)
- [Known limitations and Phase 1 report](docs/phase-1-report.md)
- [Data provenance and licensing policy](docs/data/licensing.md)

## Phase boundary

Stage 1 remains the geographic rendering and streaming foundation. Stage 3 adds an approximate local aircraft simulation and profile-driven systems prototype; it does not implement validated real-aircraft performance, operating procedures, global navigation, detailed collision/landing-gear physics, a full C172P cockpit, ATC, flight planning, live weather, voice AI or multiplayer. Terrain and camera presentation remain decoupled from simulation-critical state.

## Stage 2 prototype (historical)

The current feature branch adds a fictional arcade flying-game prototype with an original procedural high-wing aircraft, synthetic runway/parking/airborne starts, keyboard and optional gamepad input, four game-camera modes, a game-value telemetry HUD, and a worker-driven fixed-step movement loop. Stage 1's world streamer remains in use and can take the aircraft's local ENU position as its optional streaming anchor.

This is not a Cessna 172P flight model and is not intended for flight training or real-world use. Its movement, power, speed and telemetry are illustrative game mechanics. See [Stage 2 architecture and limitations](docs/phase-2/overview.md).


## Stage 3 — Flight dynamics and aircraft systems

Stage 3 replaces the arcade worker with a worker-owned, fixed-step simulation foundation and a systems-driven educational interface.

- A 120 Hz accumulator drives a quaternion-based six-degree-of-freedom rigid-body approximation. Rendering remains independent; worker snapshots publish at approximately 12 Hz.
- The current aircraft profile is a **simulated 1981 Cessna 172P configuration** with one Avco Lycoming O-320-D2J piston-engine model, fixed-pitch propeller configuration, and battery/alternator/starter, fuel, ignition and avionics subsystems. It has **no APU**.
- A separate fictional profile exercises optional APU and multi-engine interfaces. It is not a representation of a real aircraft.
- The toggleable Startup Guide reports readiness from the authoritative worker snapshot; it cannot manually mark a system complete.
- Standalone environment and propulsion modules provide local atmosphere settings and an explicitly approximate fixed-pitch thrust calculation.
- The HUD, aircraft movement and streaming anchor consume the same simulation snapshot. Camera and world-streaming code remain separate from physics.
- The model uses explicit approximations and unverified tuning values. It is not manufacturer-calibrated, validated, certified or suitable for flight training or real-world decisions.

See [Stage 3 architecture and limitations](docs/phase-3/overview.md). No new npm dependencies, paid APIs, online runtime services or third-party aircraft assets are introduced in Stage 3.
