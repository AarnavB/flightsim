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

CI installs Chromium and runs all checks on pushes to the Phase 1 branch and on pull requests targeting `main`.

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

This milestone does not implement aircraft flight dynamics, Cessna systems, cockpit instrumentation, ATC, flight planning, live weather, voice AI or multiplayer. The terrain provider, coordinate layer, camera controller and world-streaming modules expose extension points for later milestones without coupling visual resource eviction to simulation-critical state.
