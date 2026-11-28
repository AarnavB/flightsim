import type { FlightSnapshot } from "../simulation/flight-simulation";

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="flight-metric"><span>{label}</span><b>{value}</b></div>;
}

export function FlightHud({ snapshot, visible }: { snapshot: FlightSnapshot | null; visible: boolean }) {
  if (!visible) return null;
  if (!snapshot) return <div className="flight-hud loading-hud" aria-live="polite">INITIALISING FLIGHT SIMULATION</div>;
  const systems = snapshot.systems;
  const warnings = [
    systems.electrical.warning, systems.fuel.warning, systems.engine.warning,
    systems.avionics.warning, snapshot.stalled ? "High angle-of-attack approximation: stall region" : null
  ].filter((warning): warning is string => Boolean(warning));
  return (
    <section className="flight-hud" aria-label="Simulated flight instruments">
      <div className="hud-heading"><span>SIMULATED INSTRUMENTS</span><b>{snapshot.paused ? "PAUSED" : systems.engine.state.toUpperCase()}</b></div>
      <div className="hud-grid">
        <Metric label="AIRSPEED · KTS" value={snapshot.airspeedKts.toFixed(0)} />
        <Metric label="ALTITUDE · FT" value={snapshot.altitudeFt.toFixed(0)} />
        <Metric label="HEADING" value={snapshot.headingDeg.toFixed(0) + "°"} />
        <Metric label="VERTICAL · FPM" value={snapshot.verticalSpeedFpm.toFixed(0)} />
        <Metric label="PITCH" value={snapshot.pitchDeg.toFixed(1) + "°"} />
        <Metric label="BANK" value={snapshot.bankDeg.toFixed(1) + "°"} />
        <Metric label="ENGINE RPM" value={systems.engine.rpm.toFixed(0)} />
        <Metric label="FUEL · GAL" value={systems.fuel.quantityGallons.toFixed(1)} />
      </div>
      <div className="hud-power"><span>THROTTLE</span><div><i style={{ width: (snapshot.throttle * 100) + "%" }} /></div></div>
      <div className="hud-system-row">
        <span>BUS <b>{systems.electrical.busVoltage.toFixed(1)} V</b></span>
        <span>AVIONICS <b>{systems.avionics.powered ? "ON" : "OFF"}</b></span>
        <span>ENGINE <b>{systems.engine.state.toUpperCase()}</b></span>
      </div>
      {warnings.length > 0 && <div className="hud-warnings" aria-live="polite">{warnings.slice(0, 3).map(warning => <span key={warning}>{warning}</span>)}</div>}
      <div className="hud-footnote">APPROXIMATE SIMULATION VALUES · NOT CERTIFIED FLIGHT INSTRUMENTS</div>
    </section>
  );
}
