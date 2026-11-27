import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { LocalTangentFrame } from "@flightsim/geography";
import { ProceduralTerrainProvider } from "@flightsim/terrain";
import { WorldStreamer, type StreamerStats, type TileAsset } from "@flightsim/world-streaming";
import { ArcadeCameraRig, type CameraMode } from "../components/ArcadeCameraRig";
import { ArcadeAircraft } from "../components/ArcadeAircraft";
import { RunwayEnvironment } from "../components/RunwayEnvironment";
import type { ArcadeSnapshot } from "../simulation/arcade-flight";
import type { GraphicsProfile } from "../settings/profiles";

const WORLD_ORIGIN = { latitude: 37.6213, longitude: -122.379, height: 0 };

export function WorldScene(props: {
  profile: GraphicsProfile;
  snapshot: ArcadeSnapshot | null;
  cameraMode: CameraMode;
  onStats: (stats: StreamerStats) => void;
}) {
  const { camera, gl } = useThree();
  const perspectiveCamera = camera as THREE.PerspectiveCamera;
  const [assets, setAssets] = useState<TileAsset[]>([]);
  const snapshotRef = useRef(props.snapshot);
  const frame = useMemo(() => new LocalTangentFrame(WORLD_ORIGIN), []);
  const streamer = useMemo(
    () => new WorldStreamer(new ProceduralTerrainProvider(frame), frame, props.profile),
    [frame]
  );
  const anchor = useMemo(() => new THREE.Vector3(), []);
  const worldVelocity = useMemo(() => new THREE.Vector3(), []);
  const material = useMemo(() => new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.96,
    metalness: 0,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1
  }), []);

  useEffect(() => { snapshotRef.current = props.snapshot; }, [props.snapshot]);

  useEffect(() => {
    const unsubscribe = streamer.subscribe(() => setAssets(streamer.getRenderableAssets()));
    setAssets(streamer.getRenderableAssets());
    return () => {
      unsubscribe();
      streamer.dispose();
      material.dispose();
    };
  }, [streamer, material]);

  useEffect(() => {
    streamer.setProfile(props.profile);
    perspectiveCamera.far = props.profile.maxDistance * 1.5;
    perspectiveCamera.updateProjectionMatrix();
  }, [streamer, props.profile, perspectiveCamera]);

  const sampling = useMemo(() => ({ elapsed: 0, frames: 0 }), []);
  useFrame((_, delta) => {
    const snapshot = snapshotRef.current;
    if (snapshot) {
      anchor.set(snapshot.position.x, snapshot.position.y, snapshot.position.z);
      const heading = THREE.MathUtils.degToRad(snapshot.headingDeg);
      worldVelocity.set(
        Math.sin(heading) * snapshot.speed,
        snapshot.climbRate,
        -Math.cos(heading) * snapshot.speed
      );
      // Stage 1 retains its frustum / LOD / scheduler / cache. Its selection
      // distance anchor follows the game aircraft in the existing local ENU frame.
      streamer.updateFrame(perspectiveCamera, { velocity: worldVelocity }, anchor);
    } else {
      streamer.updateFrame(perspectiveCamera, { velocity: new THREE.Vector3() });
    }

    sampling.frames += 1;
    sampling.elapsed += delta;
    if (sampling.elapsed >= 0.5) {
      const fps = sampling.frames / sampling.elapsed;
      sampling.elapsed = 0;
      sampling.frames = 0;
      props.onStats(streamer.getStats(fps, gl.info.render));
    }
  });

  return (
    <>
      <ArcadeCameraRig snapshot={props.snapshot} mode={props.cameraMode} />
      <hemisphereLight args={["#d7e5e9", "#39463f", 1.35]} />
      <directionalLight
        position={[12_000, 18_000, 8_000]}
        intensity={2.1}
        color="#fff0d7"
        castShadow={props.profile.shadows}
      />
      <fog attach="fog" args={["#b7c8ca", props.profile.maxDistance * 0.55, props.profile.maxDistance * 1.3]} />
      <RunwayEnvironment />
      <ArcadeAircraft snapshot={props.snapshot} />
      {assets.map((asset) => (
        <mesh
          key={asset.id}
          geometry={asset.geometry}
          material={material}
          renderOrder={asset.level}
          frustumCulled
          receiveShadow={props.profile.shadows}
          dispose={null}
        />
      ))}
    </>
  );
}
