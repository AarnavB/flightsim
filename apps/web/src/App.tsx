import { useCallback, useState } from "react";
import { WorldViewport } from "./components/WorldViewport";
import { TopBar } from "./components/TopBar";
import { SettingsPanel } from "./components/SettingsPanel";
import { DebugPanel } from "./components/DebugPanel";
import { GRAPHICS_PROFILES, type GraphicsProfileName } from "./settings/profiles";
import type { StreamerStats } from "@flightsim/world-streaming";
import { RESET_CAMERA_EVENT, cameraMotion } from "./camera/camera-motion";

export default function App() {
  const [profile, setProfile] = useState<GraphicsProfileName>("Medium");
  const [sensitivity, setSensitivity] = useState(1);
  const [debug, setDebug] = useState(false);
  const [settings, setSettings] = useState(false);
  const [stats, setStats] = useState<StreamerStats | null>(null);
  const [rendererReady, setRendererReady] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      setError("Fullscreen is not available in this browser session.");
    }
  }, []);
  const resetCamera = useCallback(() => window.dispatchEvent(new CustomEvent(RESET_CAMERA_EVENT)), []);
  const changeSensitivity = useCallback((value: number) => {
    cameraMotion.sensitivity = value;
    setSensitivity(value);
  }, []);

  return (
    <main className="app-shell">
      <TopBar
        profile={profile}
        onProfileChange={setProfile}
        debug={debug}
        onDebugToggle={() => setDebug((value) => !value)}
        onSettingsToggle={() => setSettings((value) => !value)}
        onFullscreen={toggleFullscreen}
      />
      <section className="sim-stage">
        <WorldViewport profile={GRAPHICS_PROFILES[profile]} onStats={setStats} onRendererReady={setRendererReady} />
        <div className="flight-readout">
          <div><span className="eyebrow">WORLD REFERENCE</span><b>WGS84 / LOCAL ENU</b></div>
          <i />
          <div><span className="eyebrow">SCENERY MODE</span><b>ON-DEMAND STREAMING</b></div>
          <i />
          <div><span className="eyebrow">RENDER API</span><b>{rendererReady === null ? "INITIALISING" : rendererReady ? "WEBGL 2" : "WEBGL 2 UNAVAILABLE"}</b></div>
        </div>
        {rendererReady === false && <div className="renderer-warning" role="alert">WebGL 2 is unavailable. Enable hardware acceleration or try a browser with WebGL 2 support.</div>}
        {error && <button className="toast" onClick={() => setError(null)}>{error} <span>×</span></button>}
        {debug && <DebugPanel stats={stats} />}
        {settings && (
          <SettingsPanel
            profile={profile}
            onProfileChange={setProfile}
            sensitivity={sensitivity}
            onSensitivityChange={changeSensitivity}
            onResetCamera={resetCamera}
            onClose={() => setSettings(false)}
          />
        )}
        <div className="loading-indicator" aria-live="polite">
          <span className={stats && stats.activeTileCount > 0 ? "loading-dot ready" : "loading-dot"} />
          {stats && stats.activeTileCount > 0 ? "SCENERY STREAM ACTIVE" : "GENERATING PROCEDURAL TERRAIN"}
        </div>
      </section>
      <footer className="statusbar">
        <span>PHASE 01 <b>RENDERING / WORLD FOUNDATION</b></span>
        <span>{profile.toUpperCase()} PROFILE <i /> {stats ? stats.visibleTileCount + " VISIBLE TILES" : "SELECTING TILES"}</span>
        <span>BUILD 0.1.0 <i /> LOCAL-FIRST SYSTEM</span>
      </footer>
    </main>
  );
}