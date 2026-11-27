import type { StreamerStats } from "@flightsim/world-streaming";

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export function DebugPanel({ stats }: { stats: StreamerStats | null }) {
  if (!stats) return <aside className="debug-panel"><span className="eyebrow">STREAMING DIAGNOSTICS</span><p>Initialising world selector…</p></aside>;
  const rows = [
    ["FPS", stats.fps.toFixed(0)],
    ["Frame time", stats.frameTimeMs.toFixed(1) + " ms"],
    ["Geographic position", stats.geographicPosition],
    ["Camera direction", stats.cameraDirection],
    ["Streaming anchor altitude", Math.round(stats.streamingAnchorAltitude).toLocaleString() + " m"],
    ["Resident / visible", stats.activeTileCount + " / " + stats.visibleTileCount],
    ["Prefetched / cached", stats.prefetchedTileCount + " / " + stats.cachedTileCount],
    ["Pending / failed", stats.pendingRequests + " / " + stats.failedRequests],
    ["Worker activity", stats.activeWorkers.toString()],
    ["Estimated geometry", formatBytes(stats.geometryMemoryBytes)],
    ["Estimated CPU data", formatBytes(stats.cpuMemoryBytes)],
    ["Estimated texture", formatBytes(stats.textureMemoryBytes)],
    ["Draw calls", stats.drawCalls.toLocaleString()],
    ["Triangles", stats.triangles.toLocaleString()],
    ["Terrain LODs", stats.lodSummary || "—"]
  ];
  return (
    <aside className="debug-panel">
      <div className="debug-title"><div><span className="eyebrow">DEVELOPER OVERLAY</span><h2>Streaming diagnostics</h2></div><span className="live-label">LIVE</span></div>
      <div className="debug-grid">
        {rows.map(([label, value]) => <div className="debug-row" key={label}><span>{label}</span><b>{value}</b></div>)}
      </div>
      <div className="budget-meter"><div><span>Scenery memory budget</span><b>{stats.memoryBudgetMiB} MiB</b></div><div className="meter-track"><span style={{ width: Math.min(100, stats.memoryUsagePercent) + "%" }} /></div></div>
      <p className="debug-note">Memory figures are application estimates, not browser or physical GPU telemetry.</p>
    </aside>
  );
}