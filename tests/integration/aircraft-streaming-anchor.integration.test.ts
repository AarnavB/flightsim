import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { LocalTangentFrame } from "../../packages/geography/src/index";
import { buildTerrainPayload, type TerrainProvider } from "../../packages/terrain/src/index";
import { WorldStreamer, type StreamerProfile } from "../../packages/world-streaming/src/index";

describe("aircraft world-streaming anchor", () => {
  it("uses the aircraft's local ENU position for geographic streaming diagnostics", () => {
    const frame = new LocalTangentFrame({ latitude: 37.6213, longitude: -122.379, height: 0 });
    const provider: TerrainProvider = {
      generate: async (request) => buildTerrainPayload(request),
      activeWorkers: () => 0,
      dispose: () => undefined
    };
    const profile: StreamerProfile = {
      name: "Low", maxLod: 2, maxDistance: 130_000,
      maxResidentBytes: 32 * 1024 * 1024, terrainSegments: 4,
      selectionIntervalMs: 0, prefetchIntervalMs: 0
    };
    const streamer = new WorldStreamer(provider, frame, profile);
    const camera = new THREE.PerspectiveCamera(62, 1.6, 0.1, 200_000);
    camera.position.set(0, 150, 40);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    const aircraft = new THREE.Vector3(3_000, 80, -2_000);
    try {
      streamer.updateFrame(camera, { velocity: new THREE.Vector3(20, 0, -5) }, aircraft);
      const originStats = streamer.getStats();
      expect(originStats.geographicPosition).not.toBe("37.6213, -122.3790");
      expect(originStats.streamingAnchorAltitude).toBeGreaterThan(0);
      aircraft.set(-6_000, 120, 4_000);
      streamer.updateFrame(camera, { velocity: new THREE.Vector3(-10, 0, 10) }, aircraft);
      expect(streamer.getStats().geographicPosition).not.toBe(originStats.geographicPosition);
    } finally {
      streamer.dispose();
    }
  });
});
