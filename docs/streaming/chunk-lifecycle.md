# Chunk lifecycle and recovery

~~~mermaid
stateDiagram-v2
  [*] --> Unloaded
  Unloaded --> Queued
  Queued --> Loading
  Queued --> Unloaded: cancelled before start
  Loading --> Decoding
  Loading --> Failed: provider error
  Loading --> Unloaded: cancelled
  Decoding --> Ready
  Decoding --> Failed: validation error
  Decoding --> Unloaded: stale result
  Ready --> Resident
  Resident --> Visible
  Visible --> Retained
  Retained --> Visible
  Resident --> Evicting
  Retained --> Evicting
  Evicting --> Unloaded
  Failed --> Queued: bounded retry
  Failed --> Unloaded: reset / reselect
~~~

Each lifecycle transition is checked by `TileLifecycle`. An illegal transition throws rather than silently changing state. A tile request is keyed by its geographic ID, so concurrent requests for the same tile do not create duplicate workers.

## Loading sequence

~~~mermaid
sequenceDiagram
  participant S as Scheduler
  participant W as Worker client
  participant P as Procedural provider
  participant M as Main thread
  participant R as Resource manager
  S->>P: tile request + AbortSignal
  P->>W: generation request
  W->>W: create typed-array mesh data
  W-->>P: transferable buffers
  P-->>M: terrain payload
  M->>M: validate payload / create BufferGeometry
  M->>R: register CPU and GPU estimates
  M->>S: mark tile resident
  alt request is cancelled or stale
    W-->>S: abort / terminate
    S->>S: discard result and return tile to Unloaded
  end
~~~

A request failure is recorded and retried a limited number of times. A high-detail leaf failing does not remove an already-resident parent fallback. The renderer owns geometry disposal; the geographic quadtree retains or recreates metadata independently.
