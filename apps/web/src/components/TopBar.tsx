import type { GraphicsProfileName } from "../settings/profiles";

export function TopBar(props: {
  profile: GraphicsProfileName;
  onProfileChange: (profile: GraphicsProfileName) => void;
  debug: boolean;
  onDebugToggle: () => void;
  onSettingsToggle: () => void;
  onFullscreen: () => void;
}) {
  return (
    <header className="topbar">
      <div className="brand-lockup">
        <div className="brand-mark"><span /><span /><span /></div>
        <div>
          <div className="brand-title">PROJECT <b>FLIGHTSIM</b></div>
          <div className="brand-subtitle">WORLD SYSTEMS / PHASE 01</div>
        </div>
      </div>
      <div className="topbar-center"><span className="status-dot" /> SIMULATION ENVIRONMENT <i /> PROCEDURAL REGION</div>
      <div className="topbar-actions">
        <label className="profile-control">
          <span>QUALITY</span>
          <select value={props.profile} onChange={(event) => props.onProfileChange(event.target.value as GraphicsProfileName)} aria-label="Graphics quality">
            <option>Low</option><option>Medium</option><option>High</option><option>Ultra</option>
          </select>
        </label>
        <button className={props.debug ? "icon-button active" : "icon-button"} onClick={props.onDebugToggle} aria-label="Streaming diagnostics" title="Streaming diagnostics">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18V6m5 12V9m5 9V4m5 14v-7" /></svg>
        </button>
        <button className="icon-button" onClick={props.onSettingsToggle} aria-label="Open settings" title="Settings">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" /><path d="m19.4 15 .1.1 1.1.9-1.3 2.2-1.4-.5a7.8 7.8 0 0 1-1.4.8l-.2 1.5h-2.6l-.3-1.5a7.8 7.8 0 0 1-1.5-.8l-1.4.5-1.3-2.2 1.2-1a7.3 7.3 0 0 1 0-1.7l-1.2-1 1.3-2.2 1.4.5a7.8 7.8 0 0 1 1.5-.8l.3-1.5h2.6l.2 1.5a7.8 7.8 0 0 1 1.4.8l1.4-.5 1.3 2.2-1.1.9a7.3 7.3 0 0 1-.1 1.8Z" /></svg>
        </button>
        <button className="icon-button" onClick={props.onFullscreen} aria-label="Toggle fullscreen" title="Fullscreen">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4H4v4m12-4h4v4M4 16v4h4m12-4v4h-4" /></svg>
        </button>
      </div>
    </header>
  );
}