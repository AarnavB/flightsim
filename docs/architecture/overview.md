# System architecture

~~~mermaid
flowchart TD
  UI[React application shell] --> VP[React Three Fiber viewport]
  VP --> CAM[Camera rig and input]
  VP --> RS[Three.js world scene]
  RS --> WS[World streamer]
  WS --> Q[Lazy geographical quadtree]
  WS --> SEL[Frustum / distance / SSE selector]
  WS --> SCH[Priority scheduler]
  SCH --> PROVIDER[Terrain provider contract]
  PROVIDER --> WORKER[Terrain Web Worker]
  WORKER --> DATA[Transferable typed arrays]
  DATA --> GEO[BufferGeometry preparation]
  GEO --> GPU[WebGL 2 scene resources]
  WS --> CACHE[Resident tile cache]
  WS --> MEM[Resource manager and eviction]
  UI --> CFG[Graphics profiles]
  UI --> DBG[Streaming diagnostics]
~~~

## Responsibility boundaries

- `packages/geography`: WGS84 coordinate validation, geodetic/ECEF conversion, local ENU frame and geographic tile addressing.
- `packages/terrain`: terrain-provider contract, procedural development provider, typed-array generation and worker lifecycle.
- `packages/world-streaming`: lazy tile metadata, selection, lifecycle, scheduling, prediction, cache and residency.
- `apps/web`: browser rendering, camera input, profile controls and diagnostics.
- `packages/shared-types`: data contracts shared across the independent modules.

The application shell owns low-frequency interface state. Camera transforms and world updates execute inside React Three Fiber's render loop. The streamer publishes a React update only when its renderable tile set changes; the telemetry panel is sampled twice per second.

## Render and streaming sequence

~~~mermaid
sequenceDiagram
  participant C as Camera
  participant W as World streamer
  participant Q as Quadtree selector
  participant S as Priority scheduler
  participant P as Terrain provider
  participant G as GPU scene
  C->>W: transforms and velocity each frame
  W->>Q: detailed selection at profile cadence
  Q-->>W: visible tile IDs and LOD
  W->>S: visible requests and ancestor fallbacks
  W->>S: predictive prefetch candidates
  S->>P: bounded asynchronous generation
  P-->>W: transferable typed arrays
  W->>G: BufferGeometry and material resources
  W->>W: retain / evict against memory budget
~~~

## Technology decisions

Three.js is the only rendering engine. React Three Fiber integrates the scene while preserving Three.js ownership of rendering and geometry. WebGL 2 is the baseline; WebGPU remains optional future work. Geographic coordinates and the local ENU render frame remain separate from scene objects. The procedural provider can be replaced by a licensed DEM reader without changing the renderer's geometry integration contract.
