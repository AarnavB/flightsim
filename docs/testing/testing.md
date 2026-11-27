# Testing guide

## Local commands

~~~bash
npm install
npm run lint
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run build
~~~

## Unit coverage

- WGS84 input validation, longitude normalisation, geodetic/ECEF and local ENU round trips.
- Antimeridian handling, tile bounds, parent/child addressing and neighbouring columns.
- Deterministic procedural terrain, global longitude periodicity and shared edge sampling.
- Lazy metadata creation, legal lifecycle transitions, bounded scheduler concurrency, queue cancellation and LRU recency.
- Geometry disposal and application budget enforcement.

## Browser smoke tests

Playwright checks the full-window application shell, viewport accessibility label, diagnostics toggle and graphics profile selector. Chromium is configured with SwiftShader arguments for a headless WebGL-capable smoke test. This does not replace testing on real browser/driver combinations.

## Performance validation

The in-app FPS, frame time, tile and memory telemetry is live measurement. No cross-device benchmark has yet been recorded for this repository milestone. Extended multi-minute camera sweeps and long-duration memory plateau measurements remain required before calling the performance acceptance criteria complete.
