# Memory management

~~~mermaid
flowchart TD
  A[Worker typed arrays] --> B[CPU geometry estimate]
  B --> C[BufferGeometry upload]
  C --> D[GPU buffer estimate]
  D --> E[LRU tile cache]
  E --> F{Within profile budget?}
  F -->|Yes| G[Resident / retained]
  F -->|No| H[Oldest unreferenced tile]
  H --> I[BufferGeometry.dispose]
  I --> J[Remove cache entry]
  J --> F
~~~

The resource manager tracks application-owned geometry buffers and their typed-array sizes. The same buffer byte count is used as a conservative estimate for GPU allocation after upload. It is not a browser-reported or physical GPU measurement.

Visible scene assets are marked referenced and are excluded from eviction. Prefetch assets have lower scheduling priority and may be evicted when they are no longer relevant. Recently visible assets receive a 45-second retention grace period. Once the budget is exceeded, oldest unreferenced resources are disposed first.

Texture accounting is separate. It currently reports zero because the procedural world uses no texture maps. Geographic tile metadata is not removed when geometry is evicted; it can be recreated on demand.

Profile budgets are 256 MiB (Low), 512 MiB (Medium), 1 GiB (High) and 1.5 GiB (Ultra). They govern this application's scenery resource estimates, not total browser memory or total GPU memory.
