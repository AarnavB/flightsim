import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WorldViewport } from "./components/WorldViewport";
import { TopBar } from "./components/TopBar";
import { SettingsPanel } from "./components/SettingsPanel";
import { DebugPanel } from "./components/DebugPanel";
import { FlightHud } from "./components/FlightHud";
import { FlightPanel } from "./components/FlightPanel";
import { GRAPHICS_PROFILES, type GraphicsProfileName } from "./settings/profiles";
import type { StreamerStats } from "@flightsim/world-streaming";
import type { ArcadeControls, ArcadeSnapshot, SpawnPreset } from "./simulation/arcade-flight";
import type { CameraMode } from "./components/ArcadeCameraRig";
import { RESET_CAMERA_EVENT, cameraMotion } from "./camera/camera-motion";

const DEADZONE = 0.14;
const deadzone = (value: number) => Math.abs(value) < DEADZONE ? 0 : Math.sign(value) * (Math.abs(value) - DEADZONE) / (1 - DEADZONE);

type WorkerMessage = { type: "snapshot"; snapshot: ArcadeSnapshot } | { type: "error"; message: string };

export default function App() {
  const [profile, setProfile] = useState<GraphicsProfileName>("Medium");
  const [sensitivity, setSensitivity] = useState(1);
  const [debug, setDebug] = useState(false);
  const [settings, setSettings] = useState(false);
  const [stats, setStats] = useState<StreamerStats | null>(null);
  const [snapshot, setSnapshot] = useState<ArcadeSnapshot | null>(null);
  const [rendererReady, setRendererReady] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraMode, setCameraMode] = useState<CameraMode>("chase");
  const [hudVisible, setHudVisible] = useState(true);
  const keys = useRef(new Set<string>());
  const menusActive = useRef(false);
  menusActive.current = settings || debug;
  const throttle = useRef(0);
  const cameraModes: CameraMode[] = ["cockpit", "chase", "orbit", "free"];

  const worker = useMemo(() => new Worker(new URL("./simulation/arcade-flight.worker.ts", import.meta.url), { type: "module" }), []);
  const send = useCallback((message: unknown) => worker.postMessage(message), [worker]);

  useEffect(() => {
    const onMessage = (event: MessageEvent<WorkerMessage>) => {
      if (event.data.type === "snapshot") setSnapshot(event.data.snapshot);
      else if (event.data.type === "error") setError(event.data.message);
    };
    const onError = () => setError("The arcade simulation worker reported an error.");
    worker.addEventListener("message", onMessage);
    worker.addEventListener("error", onError);
    return () => {
      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onError);
      worker.terminate();
    };
  }, [worker]);

  useEffect(() => {
    let last = performance.now();
    const interval = window.setInterval(() => {
      const now = performance.now();
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const down = keys.current;
      const current: ArcadeControls = {
        pitch: ((down.has("arrowup") ? 1 : 0) - (down.has("arrowdown") ? 1 : 0)) * cameraMotion.sensitivity,
        roll: ((down.has("arrowright") ? 1 : 0) - (down.has("arrowleft") ? 1 : 0)) * cameraMotion.sensitivity,
        yaw: ((down.has("d") ? 1 : 0) - (down.has("a") ? 1 : 0)) * cameraMotion.sensitivity,
        throttle: throttle.current,
        brake: down.has(" ") ? 1 : 0
      };
      if (down.has("w")) throttle.current = Math.min(1, throttle.current + dt * 0.42);
      if (down.has("s")) throttle.current = Math.max(0, throttle.current - dt * 0.52);
      current.throttle = throttle.current;

      const pads = navigator.getGamepads?.() ?? [];
      const pad = Array.from(pads).find((candidate) => candidate?.connected) ?? null;
      if (pad) {
        current.roll = deadzone(pad.axes[0] ?? 0);
        current.pitch = -deadzone(pad.axes[1] ?? 0);
        current.yaw = deadzone(pad.axes[2] ?? 0);
        const throttleAxis = pad.axes[5] ?? pad.axes[3];
        const throttleTrigger = pad.buttons[7]?.value;
        if (Number.isFinite(throttleAxis)) current.throttle = THREEClamp((throttleAxis + 1) / 2);
        if (Number.isFinite(throttleTrigger)) current.throttle = Math.max(current.throttle, throttleTrigger ?? 0);
        current.brake = Math.max(current.brake, pad.buttons[6]?.value ?? 0);
        throttle.current = current.throttle;
      }
      send({ type: "controls", controls: current });
    }, 33);
    return () => window.clearInterval(interval);
  }, [send]);

  useEffect(() => {
    const activeElementIsControl = (target: EventTarget | null) => {
      const element = target as HTMLElement | null;
      return Boolean(element && ["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(element.tagName));
    };
    const keyDown = (event: KeyboardEvent) => {
      if (activeElementIsControl(event.target)) return;
      const key = event.key.toLowerCase();
      if (menusActive.current && key !== "h" && key !== "escape") return;
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "escape"].includes(key)) event.preventDefault();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "a", "d", "w", "s"].includes(key)) keys.current.add(key);
      if (event.repeat) return;
      if (key === "e") send({ type: "toggle-power" });
      if (key === "escape") send({ type: "toggle-pause" });
      if (key === "r") send({ type: "reset" });
      if (key === "h") setHudVisible((value) => !value);
      if (key === "v") setCameraMode((value) => cameraModes[(cameraModes.indexOf(value) + 1) % cameraModes.length]);
      if (/^[1-4]$/.test(key)) setCameraMode(cameraModes[Number(key) - 1]);
    };
    const keyUp = (event: KeyboardEvent) => keys.current.delete(event.key.toLowerCase());
    const blur = () => keys.current.clear();
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      window.removeEventListener("blur", blur);
    };
  }, [send]);

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
  const spawn = useCallback((preset: SpawnPreset) => {
    throttle.current = preset === "airborne" ? 0.72 : 0;
    send({ type: "spawn", preset });
  }, [send]);
  const togglePause = useCallback(() => send({ type: "toggle-pause" }), [send]);
  const reset = useCallback(() => {
    send({ type: "reset" });
    resetCamera();
  }, [send, resetCamera]);

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
        <WorldViewport
          profile={GRAPHICS_PROFILES[profile]}
          snapshot={snapshot}
          cameraMode={cameraMode}
          onStats={setStats}
          onRendererReady={setRendererReady}
        />
        <FlightHud snapshot={snapshot} visible={hudVisible} />
        <FlightPanel
          snapshot={snapshot}
          spawn={spawn}
          togglePower={() => send({ type: "toggle-power" })}
          togglePause={togglePause}
          reset={reset}
          cameraMode={cameraMode}
          setCameraMode={setCameraMode}
          hudVisible={hudVisible}
          setHudVisible={setHudVisible}
        />
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
        <span>STAGE 02 <b>ARCADE FLIGHT PROTOTYPE</b></span>
        <span>{profile.toUpperCase()} PROFILE <i /> {stats ? stats.visibleTileCount + " VISIBLE TILES" : "SELECTING TILES"}</span>
        <span>BUILD 0.2.0 <i /> SYNTHETIC WORLD</span>
      </footer>
    </main>
  );
}

function THREEClamp(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}
