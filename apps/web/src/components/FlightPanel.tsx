import type { SpawnPreset } from "../simulation/arcade-flight";
import type { CameraMode } from "./ArcadeCameraRig";
import type { ArcadeSnapshot } from "../simulation/arcade-flight";

export function FlightPanel(props: {
  snapshot: ArcadeSnapshot | null;
  spawn: (preset: SpawnPreset) => void;
  togglePower: () => void;
  togglePause: () => void;
  reset: () => void;
  cameraMode: CameraMode;
  setCameraMode: (mode: CameraMode) => void;
  hudVisible: boolean;
  setHudVisible: (visible: boolean) => void;
}) {
  const modes: { id: CameraMode; label: string }[] = [
    { id: "cockpit", label: "CABIN" },
    { id: "chase", label: "CHASE" },
    { id: "orbit", label: "ORBIT" },
    { id: "free", label: "FREE" }
  ];
  return (
    <aside className="flight-panel" aria-label="Flight game controls">
      <div className="flight-panel-head">
        <div><span className="eyebrow">AIRCRAFT / GAME MODE</span><h2>High-wing Explorer</h2></div>
        <span className="flight-status-dot" />
      </div>
      <label className="flight-select-label" htmlFor="spawn-preset">SPAWN CONFIGURATION</label>
      <select id="spawn-preset" className="flight-select" value={props.snapshot?.spawn ?? "runway"} onChange={(event) => props.spawn(event.target.value as SpawnPreset)}>
        <option value="runway">Runway · Powered</option>
        <option value="parking">Parking · Unpowered</option>
        <option value="airborne">Airborne · Free flight</option>
      </select>
      <div className="flight-button-row">
        <button className={props.snapshot?.powered ? "flight-action active" : "flight-action"} onClick={props.togglePower}>
          {props.snapshot?.powered ? "POWER OFF" : "POWER ON"}
        </button>
        <button className="flight-action" onClick={props.togglePause}>{props.snapshot?.paused ? "RESUME" : "PAUSE"}</button>
      </div>
      <button className="flight-reset" onClick={props.reset}>RESET CURRENT SPAWN</button>
      <div className="flight-panel-divider" />
      <span className="flight-select-label">CAMERA VIEW</span>
      <div className="camera-mode-grid">
        {modes.map((mode) => (
          <button key={mode.id} className={props.cameraMode === mode.id ? "camera-mode selected" : "camera-mode"} onClick={() => props.setCameraMode(mode.id)} aria-pressed={props.cameraMode === mode.id}>{mode.label}</button>
        ))}
      </div>
      <label className="hud-toggle"><input type="checkbox" checked={props.hudVisible} onChange={(event) => props.setHudVisible(event.target.checked)} /> Show arcade telemetry</label>
      <div className="flight-panel-divider" />
      <span className="flight-select-label">KEYBOARD</span>
      <div className="control-guide">
        <div><kbd>↑ ↓</kbd><span>Pitch</span></div><div><kbd>← →</kbd><span>Bank</span></div>
        <div><kbd>A / D</kbd><span>Yaw assist</span></div><div><kbd>W / S</kbd><span>Power</span></div>
        <div><kbd>SPACE</kbd><span>Brake</span></div><div><kbd>E</kbd><span>Power toggle</span></div>
        <div><kbd>V / 1–4</kbd><span>Camera</span></div><div><kbd>ESC</kbd><span>Pause</span></div>
        <div><kbd>R</kbd><span>Reset</span></div><div><kbd>H</kbd><span>HUD</span></div>
      </div>
      <p className="panel-footnote">Optional gamepad: left stick for pitch/bank, right stick for yaw where available, triggers for power/brake.</p>
    </aside>
  );
}
