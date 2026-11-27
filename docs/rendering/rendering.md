# Rendering architecture

Three.js WebGLRenderer is the baseline renderer and React Three Fiber owns the React scene lifecycle. A WebGL 2 capability check is surfaced in the viewport. The application does not use a WebGPU-only feature.

## Frame responsibilities

- Every rendered frame updates camera transforms, the view-projection matrix and the cheap frustum.
- Full quadtree tile selection is throttled by the selected quality profile (initially about 5–10 Hz).
- Predictive prefetch is updated less frequently (initially about 2–4 Hz).
- Residency and budget evaluation run at approximately 1 Hz.
- UI telemetry is sampled at 2 Hz.
- React is updated when the renderable scenery set changes, not for every camera movement.

## Geometry

Terrain payloads contain positions, UVs and indices. The main thread validates typed arrays, creates BufferGeometry, computes vertex normals, assigns a procedural vertex-colour ramp and uploads through Three.js. A small boundary skirt is added on every terrain edge. The same global-coordinate elevation function is sampled by neighbouring tiles, preventing differences in the underlying test elevation at shared geographic coordinates.

Skirts mitigate gaps when adjacent tiles use different sample densities; they are not a substitute for full geomorphing or edge stitching. Those techniques remain a future rendering refinement.

## Lighting and quality

Low and Medium disable shadow maps. High and Ultra enable directional-light shadows. Profiles also adjust drawing resolution, maximum view distance, maximum LOD, terrain segment density, update cadence, scheduler concurrency and scenery-residency budget.

The browser's device pixel ratio is capped by the active profile. Window resizing is handled by React Three Fiber's canvas controller.

## Instrumentation

FPS and frame time are computed from rendered-frame deltas. Draw calls and triangle counts are read from Three.js renderer counters. Geometry/texture residency is application-managed accounting and is not a measurement of physical GPU memory. Texture memory is zero in this procedural scene because it currently has no texture assets.
