import type { SpawnPreset, FlightSnapshot } from "../simulation/flight-simulation";
import type { CameraMode } from "./ArcadeCameraRig";

export function FlightPanel(props: {
  snapshot: FlightSnapshot | null;
  spawn: (preset: SpawnPreset) => void;
  togglePower: () => void;
  togglePause: () => void;
  reset: () => void;
  cameraMode: CameraMode;
  setCameraMode: (mode: CameraMode) => void;
  hudVisible: boolean;
  setHudVisible: (visible: boolean) => void;
  guideVisible: boolean;
  toggleGuide: () => void;
}) {
  const modes: { id: CameraMode; label: string }[] = [
    { id: "cockpit", label: "CABIN" },
    { id: "chase", label: "CHASE" },
    { id: "orbit", label: "ORBIT" },
    { id: "free", label: "FREE" }
  ];
  const masterOn = props.snapshot?.systems.electrical.masterOn ?? false;
  return (
    <aside className="flight-panel" aria-label="Aircraft controls">
      <div className="flight-panel-head">
        <div><span className="eyebrow">AIRCRAFT / SYSTEMS SIM</span><h2>Cessna 172P · 1981</h2></div>
        <span className="flight-status-dot" />
      </div>
      <label className="flight-select-label" htmlFor="spawn-preset">SIMULATION START</label>
      <select id="spawn-preset" className="flight-select" value={props.snapshot?.spawn ?? "runway"} onChange={(event) => props.spawn(event.target.value as SpawnPreset)}>
        <option value="runway">Runway · cold start</option>
        <option value="parking">Parking · cold start</option>
        <option value="airborne">Airborne · cold systems</option>
      </select>
      <div className="flight-button-row">
        <button className={masterOn ? "flight-action active" : "flight-action"} onClick={props.togglePower}>
          {masterOn ? "MASTER OFF" : "MASTER ON"}
        </button>
        <button className="flight-action" onClick={props.togglePause}>{props.snapshot?.paused ? "RESUME" : "PAUSE"}</button>
      </div>
      <button className="flight-reset" onClick={props.reset}>RESET AIRCRAFT & SYSTEMS</button>
      <button className={props.guideVisible ? "startup-guide-toggle active" : "startup-guide-toggle"} onClick={props.toggleGuide} aria-pressed={props.guideVisible}>
        {props.guideVisible ? "HIDE STARTUP GUIDE" : "OPEN STARTUP GUIDE"}
      </button>
      <div className="flight-panel-divider" />
      <span className="flight-select-label">CAMERA VIEW</span>
      <div className="camera-mode-grid">
        {modes.map((mode) => (
          <button key={mode.id} className={props.cameraMode === mode.id ? "camera-mode selected" : "camera-mode"} onClick={() => props.setCameraMode(mode.id)} aria-pressed={props.cameraMode === mode.id}>{mode.label}</button>
        ))}
      </div>
      <label className="hud-toggle"><input type="checkbox" checked={props.hudVisible} onChange={(event) => props.setHudVisible(event.target.checked)} /> Show instrument HUD</label>
      <div className="flight-panel-divider" />
      <span className="flight-select-label">FLIGHT INPUTS</span>
      <div className="control-guide">
        <div><kbd>↑ ↓</kbd><span>Pitch input</span></div><div><kbd>← →</kbd><span>Roll input</span></div>
        <div><kbd>A / D</kbd><span>Yaw input</span></div><div><kbd>W / S</kbd><span>Throttle</span></div>
        <div><kbd>SPACE</kbd><span>Ground brake</span></div><div><kbd>E</kbd><span>Master switch</span></div>
        <div><kbd>V / 1–4</kbd><span>Camera</span></div><div><kbd>ESC</kbd><span>Pause</span></div>
        <div><kbd>R</kbd><span>Reset</span></div><div><kbd>H</kbd><span>HUD</span></div>
        <div><kbd>G</kbd><span>Startup guide</span></div>
      </div>
      <p className="panel-footnote">Approximate educational simulation. Inputs affect the physics worker; system switches affect the aircraft systems model.</p>
    </aside>
  );
}
