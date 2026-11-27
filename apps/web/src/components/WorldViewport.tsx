import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import type { GraphicsProfile } from "../settings/profiles";
import type { StreamerStats } from "@flightsim/world-streaming";
import type { ArcadeSnapshot } from "../simulation/arcade-flight";
import type { CameraMode } from "./ArcadeCameraRig";
import { WorldScene } from "../rendering/WorldScene";

export function WorldViewport(props: {
  profile: GraphicsProfile;
  snapshot: ArcadeSnapshot | null;
  cameraMode: CameraMode;
  onStats: (stats: StreamerStats) => void;
  onRendererReady: (ready: boolean) => void;
}) {
  return (
    <div className="world-viewport">
      <Canvas
        dpr={[0.8, props.profile.pixelRatio]}
        shadows={props.profile.shadows}
        camera={{ fov: 62, near: 0.1, far: props.profile.maxDistance * 1.5, position: [0, 14, 35] }}
        gl={{ antialias: props.profile.pixelRatio >= 1, powerPreference: "high-performance", alpha: false }}
        onCreated={({ gl, scene }) => {
          gl.domElement.tabIndex = 0;
          gl.domElement.setAttribute("aria-label", "3D flight-simulator viewport. Drag to look, use W A S D to move.");
          scene.background = new THREE.Color("#9ab4c3");
          props.onRendererReady(gl.capabilities.isWebGL2);
        }}
      >
        <WorldScene
          profile={props.profile}
          snapshot={props.snapshot}
          cameraMode={props.cameraMode}
          onStats={props.onStats}
        />
      </Canvas>
      <div className="viewport-reticle" aria-hidden="true"><span /></div>
      <div className="viewport-hint">ARROWS / A D TO FLY <i /> W S POWER <i /> V CAMERA</div>
    </div>
  );
}
