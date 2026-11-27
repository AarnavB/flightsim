import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import type { GraphicsProfile } from "../settings/profiles";
import type { StreamerStats } from "@flightsim/world-streaming";
import { WorldScene } from "../rendering/WorldScene";

export function WorldViewport(props: {
  profile: GraphicsProfile;
  onStats: (stats: StreamerStats) => void;
  onRendererReady: (ready: boolean) => void;
}) {
  return (
    <div className="world-viewport">
      <Canvas
        dpr={[0.8, props.profile.pixelRatio]}
        shadows={props.profile.shadows}
        camera={{ fov: 62, near: 1, far: props.profile.maxDistance * 1.5, position: [0, 6_500, 15_000] }}
        gl={{ antialias: props.profile.pixelRatio >= 1, powerPreference: "high-performance", alpha: false }}
        onCreated={({ gl, scene }) => {
          scene.background = new THREE.Color("#9ab4c3");
          props.onRendererReady(gl.capabilities.isWebGL2);
        }}
      >
        <WorldScene profile={props.profile} onStats={props.onStats} />
      </Canvas>
      <div className="viewport-reticle" aria-hidden="true"><span /></div>
      <div className="viewport-hint">DRAG TO LOOK <i /> WASD MOVE <i /> SPACE / SHIFT ALTITUDE</div>
    </div>
  );
}