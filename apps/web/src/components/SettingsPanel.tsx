import type { GraphicsProfileName } from "../settings/profiles";
import { GRAPHICS_PROFILES, PROFILE_NAMES } from "../settings/profiles";

export function SettingsPanel(props: {
  profile: GraphicsProfileName;
  onProfileChange: (profile: GraphicsProfileName) => void;
  sensitivity: number;
  onSensitivityChange: (value: number) => void;
  onResetCamera: () => void;
  onClose: () => void;
}) {
  return (
    <aside className="settings-panel">
      <div className="panel-heading">
        <div><span className="eyebrow">CONFIGURATION</span><h2>Graphics & controls</h2></div>
        <button className="close-button" onClick={props.onClose} aria-label="Close settings">×</button>
      </div>
      <div className="setting-group">
        <span className="setting-label">RENDER PROFILE</span>
        <div className="profile-grid">
          {PROFILE_NAMES.map((name) => (
            <button key={name} className={props.profile === name ? "profile-card selected" : "profile-card"} onClick={() => props.onProfileChange(name)}>
              <strong>{name}</strong><small>{GRAPHICS_PROFILES[name].description}</small>
            </button>
          ))}
        </div>
      </div>
      <div className="setting-group">
        <span className="setting-label">CAMERA</span>
        <div className="control-row"><span>Movement</span><b>W A S D</b></div>
        <div className="control-row"><span>Look around</span><b>Mouse / trackpad drag</b></div>
        <div className="control-row"><span>Altitude</span><b>Space / Shift</b></div>
        <div className="control-row"><span>Look / reset</span><b>Arrow keys / R</b></div>
        <label className="sensitivity-control">
          <span><span>Movement sensitivity</span><b>{props.sensitivity.toFixed(2)}×</b></span>
          <input
            type="range"
            min="0.25"
            max="3"
            step="0.25"
            value={props.sensitivity}
            onChange={(event) => props.onSensitivityChange(Number(event.target.value))}
            aria-label="Movement sensitivity"
          />
        </label>
        <button className="secondary-action" onClick={props.onResetCamera}>Reset camera position</button>
      </div>
      <p className="panel-footnote">Terrain is generated locally for engineering tests. No map tiles, remote imagery or paid data APIs are requested.</p>
    </aside>
  );
}