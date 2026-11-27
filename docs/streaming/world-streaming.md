# World streaming

## Visibility and LOD selection

~~~mermaid
flowchart TD
  A[Camera pose and projection] --> B[Frustum sphere test]
  B --> C[Maximum distance test]
  C --> D[Screen-space geometric error]
  D --> E{Refine this tile?}
  E -->|Yes| F[Materialise four child metadata nodes]
  F --> B
  E -->|No| G[Visible LOD leaf]
  G --> H[Priority request queue]
  A --> I[Camera motion predictor]
  I --> J[Predicted tile and neighbour ring]
  J --> K[Lower-priority prefetch requests]
  H --> L[Resource retention set]
  K --> L
  L --> M[Cache and memory budget manager]
~~~

The selector uses the camera frustum, a conservative tile bounding sphere, viewing distance and a screen-space-error approximation. A two-threshold hysteresis band is used to prevent rapid LOD changes when error is close to the transition threshold. A configurable visit cap and tile cap keep selection bounded.

## Predictive streaming regions

- **Visible:** tiles intersecting the active view and view range. They receive the highest request priority.
- **Prefetch:** a short-horizon estimate derived from camera position, velocity and view direction. Nearby neighbours are queued at lower priority.
- **Retention:** recently used resident tiles remain cached for a grace period. This avoids needless unload/reload cycles around selection boundaries.

A prefetched tile is not automatically rendered. It becomes renderable only when selected by the current visibility pass.

## Request scheduling

The scheduler de-duplicates requests by tile ID, sorts queued work by priority and limits concurrent generation. Queued requests can be removed immediately. Active requests receive an AbortSignal; workers terminate and results are checked before integration. Failed tiles have bounded retry attempts.

## Fallback

A selected tile requests its ancestors as lower-priority coarse fallbacks. If its own geometry is not ready or has failed, the renderable lookup walks upward to the closest cached ancestor. Visual resources are independent of the geographic metadata tree.
