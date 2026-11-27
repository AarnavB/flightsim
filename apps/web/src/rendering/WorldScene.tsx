import { useEffect, useMemo, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { LocalTangentFrame } from "@flightsim/geography";
import { ProceduralTerrainProvider } from "@flightsim/terrain";
import { WorldStreamer, type StreamerStats, type TileAsset } from "@flightsim/world-streaming";
import { CameraRig } from "../camera/CameraRig";
import { cameraMotion } from "../camera/camera-motion";
import type { GraphicsProfile } from "../settings/profiles";

const WORLD_ORIGIN = { latitude: 37.6213, longitude: -122.379, height: 0 };

export function WorldScene(props: {
  profile: GraphicsProfile;
  onStats: (stats: StreamerStats) => void;
}) {
  const { camera, gl } = useThree();
  const perspectiveCamera = camera as THREE.PerspectiveCamera;
  const [assets, setAssets] = useState<TileAsset[]>([]);
  const frame = useMemo(() => new LocalTangentFrame(WORLD_ORIGIN), []);
  const streamer = useMemo(
    () => new WorldStreamer(new ProceduralTerrainProvider(frame), frame, props.profile),
    [frame]
  );
  const material = useMemo(() => new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.96,
    metalness: 0,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1
  }), []);

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
    streamer.updateFrame(perspectiveCamera, cameraMotion);
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
      <CameraRig />
      <hemisphereLight args={["#d7e5e9", "#39463f", 1.35]} />
      <directionalLight
        position={[12_000, 18_000, 8_000]}
        intensity={2.1}
        color="#fff0d7"
        castShadow={props.profile.shadows}
      />
      <fog attach="fog" args={["#b7c8ca", props.profile.maxDistance * 0.55, props.profile.maxDistance * 1.3]} />
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