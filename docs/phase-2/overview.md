# Stage 2 — Arcade Flight Prototype

## Scope and safety boundary

Stage 2 adds a desktop browser flying game prototype to the existing Stage 1 world. It is not a Cessna 172P simulation, flight-training product, flight-planning aid, or representation of real aircraft handling. The visual aircraft is an original stylised high-wing design named **High-wing Explorer**. Values, movement, camera effects, power controls and spawn presets are illustrative game mechanics only.

This boundary is intentional: the first playable milestone is a controllable interactive game, not a safety-critical or realistic aircraft model. No aircraft operating procedures, flight-manual performance tables, or manufacturer-calibrated aerodynamic data are used.

## Runtime architecture

- apps/web/src/simulation/arcade-flight.ts contains the deterministic, game-oriented movement model and typed input/snapshot contracts.
- apps/web/src/simulation/arcade-flight.worker.ts runs the simulation away from React and the Three.js render loop. It uses an accumulator with a 60 Hz fixed step, caps each timer turn to eight catch-up steps, clamps large timer gaps to 120 ms, discards excess whole steps, and reports the dropped-step count.
- Worker commands are typed discriminated messages: controls, pause, toggle-pause, toggle-power, reset, and spawn.
- Snapshots are published at roughly 15 Hz. React receives those snapshots at UI frequency; the canvas interpolates aircraft and camera motion per rendered frame.
- ArcadeAircraft builds the original high-wing silhouette from Three.js geometry and animates the propeller and simple control-surface hints from snapshots.
- ArcadeCameraRig implements cockpit, chase, orbit and free game-camera views. Camera changes do not feed back into the movement model.
- FlightPanel owns the visible spawn/power/pause/reset/camera/HUD controls; FlightHud labels all outputs as arcade telemetry.

The worker is the authoritative movement state. The UI does not run a competing physics update loop.

## Coordinates and Stage 1 integration

Stage 1's LocalTangentFrame maps WGS84 geodetic coordinates into Three.js local ENU coordinates as:

- X = east
- Y = up
- Z = south (negative north)

The game aircraft's local position is passed into the existing WorldStreamer.updateFrame(camera, motion, anchor) optional anchor parameter. TileSelector still uses the same camera frustum, quadtree, screen-space-error LOD, hysteresis, scheduler, cancellation, cache, resource budget and disposal path. Only distance selection and geographic diagnostics use the aircraft anchor when supplied. Existing callers omit the optional anchor and preserve the original camera-centred behaviour.

The map's geographic origin remains the Stage 1 synthetic SFO-area origin. It is only a local engineering fixture; the runway and ground objects introduced in this milestone are synthetic and are not an actual airport.

## Game movement model and assumptions

This is a deliberately simple game-physics model:

- Inputs are clamped to finite normalized game controls.
- Attitude follows filtered keyboard/gamepad input rather than solving aerodynamic forces and moments.
- Heading is advanced using a bank/yaw game-turn rule.
- Speed changes using a game throttle, drag and brake curve.
- Vertical movement is a game-energy curve based on pitch and speed.
- A single local floor plane prevents the aircraft game state from falling below the synthetic play surface.
- powered is a visual/game state. It is not a combustion-engine, propeller, fuel, mixture, carburettor, ignition or starter simulation.

There is no lift/drag coefficient set, angle-of-attack solver, sideslip model, stall model, inertia tensor, rigid-body 6-DOF integration, ISA atmosphere, real wind, true/indicated airspeed calculation, runway collision mesh, gear suspension model, or C172P parameter calibration. Do not use game values to infer real aircraft performance.

## Spawn presets

- **Runway · Powered** — synthetic runway start, game power available, stationary initial state.
- **Parking · Unpowered** — synthetic parking pad, power off, stationary.
- **Airborne · Free flight** — illustrative raised start with an initial game speed and power state.

These are game-start presets, not checklists or flight procedures.

## Controls

| Key | Game action |
| --- | --- |
| Arrow Up / Down | Pitch game attitude |
| Arrow Left / Right | Bank game attitude |
| A / D | Yaw assist |
| W / S | Increase / decrease game power |
| Space | Brake |
| E | Toggle game power state |
| Escape | Pause / resume |
| R | Reset the selected spawn |
| V or 1–4 | Cycle / select camera |
| H | Toggle arcade telemetry |
| I / J / K / L / U / O | Move in free-camera mode |
| Home | Reset free-camera position |

Gamepad support is optional. Left stick controls pitch/bank, the right stick provides yaw where available, and triggers provide power/brake input. Axis values are normalized with a deadzone; disconnects naturally fall back to keyboard input. No physical controller was available for device validation.

## Third-party dependencies and costs

No new runtime or development npm dependency was added for the game prototype; the existing Three.js, React, React Three Fiber, TypeScript, Vite, Vitest and Playwright stack is reused. All aircraft and scenery geometry added for Stage 2 is original procedural geometry. There are no new sound, texture, mesh, map, elevation or airport data assets, no API keys, and no online runtime service dependency.

The development validation used the already-linked Vercel Hobby project for a temporary sandbox. The public Vercel pricing page currently lists 5 monthly Sandbox active-CPU hours and 420 GB-hours of provisioned memory for Hobby; usage beyond plan-included allowances is not free. This sandbox session reported about 74 seconds of active CPU and 603 seconds elapsed time across its sessions. The team's cumulative use by other workloads is outside this repository. Local use of the app itself does not require Vercel Sandbox. Hobby is intended for personal, non-commercial use. See Vercel's live pricing and plan conditions before relying on hosted CI, previews or sandbox compute.

## JSBSim decision

JSBSim is not integrated or claimed as supported. Stage 2's game-model interface is not an aircraft-dynamics adapter and must not be treated as one. A future, separately scoped technical investigation would need to verify current upstream status/licence, supported browser/WASM build, wrapper maintenance, aircraft-model data licences and a reproducible build before any integration decision. No JSBSim/WASM dependency or aircraft model file has been added here.

## Validation

From repository root:

~~~bash
npm ci
npm run lint
npm run typecheck
npm test
npx playwright install --with-deps chromium
npm run test:e2e
npm run build
~~~

Stage 2 unit/integration coverage checks spawn initialization, throttle response, pause stability, reset, floor bounds and the aircraft-anchor handoff into the existing world streamer. Browser tests check initial app rendering, streaming diagnostics, graphics profile, movement sensitivity, arcade panel/HUD, spawn switching and pause/resume. See the Stage 2 PR for exact execution results and any browser-environment limitations.

## Known limitations and next milestone

- Arcade-only kinematics; not C172P aerodynamics or aircraft system simulation.
- Synthetic local runway and ground visuals; no general terrain collision or actual airport data.
- No audio, AI traffic, ATC, weather API, multiplayer, flight planning or real aircraft instruments.
- No performance profile is claimed from the temporary Vercel sandbox. Build currently reports a large main JS chunk; splitting shared Three.js/R3F bundles is a performance follow-up.
- Browser E2E execution in the temporary sandbox is blocked by its missing Linux Chromium runtime libraries. Treat E2E as unverified until the GitHub Actions Ubuntu runner or a fully provisioned desktop runs it.
- Stage 3 should begin with rendering/worker performance and interaction QA for this arcade prototype, not with any real-flight or training features.
