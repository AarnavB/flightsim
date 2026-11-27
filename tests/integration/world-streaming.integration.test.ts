import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { LocalTangentFrame } from "../../packages/geography/src/index";
import {
  buildTerrainPayload,
  type TerrainProvider
} from "../../packages/terrain/src/index";
import {
  WorldStreamer,
  type StreamerProfile
} from "../../packages/world-streaming/src/index";

const waitFor = async (predicate: () => boolean, timeoutMs = 3_000) => {
  const started = Date.now();
  while (!predicate()) {
    if (Date.now() - started > timeoutMs) throw new Error("Timed out waiting for streamed terrain.");
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
};

describe("world streaming integration", () => {
  it("loads selected terrain and updates the geographic camera as it moves", async () => {
    const frame = new LocalTangentFrame({
      latitude: 37.6213,
      longitude: -122.379,
      height: 0
    });
    const provider: TerrainProvider = {
      generate: async (request, signal) => {
        await new Promise((resolve) => setTimeout(resolve, 0));
        if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
        return buildTerrainPayload(request);
      },
      activeWorkers: () => 0,
      dispose: () => undefined
    };
    const profile: StreamerProfile = {
      name: "Low",
      maxLod: 2,
      maxDistance: 8_000_000,
      maxResidentBytes: 256 * 1024 * 1024,
      terrainSegments: 4,
      selectionIntervalMs: 0,
      prefetchIntervalMs: 0
    };
    const streamer = new WorldStreamer(provider, frame, profile);
    const camera = new THREE.PerspectiveCamera(62, 1.6, 1, 9_000_000);
    camera.position.set(0, 3_000, 6_000);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert();

    try {
      streamer.updateFrame(camera, { velocity: new THREE.Vector3() });
      expect(streamer.getStats().visibleTileCount).toBeGreaterThan(0);

      await waitFor(() => streamer.getStats().cachedTileCount > 0);
      expect(streamer.getRenderableAssets().length).toBeGreaterThan(0);

      const initialPosition = streamer.getStats().geographicPosition;
      camera.position.x += 5_000;
      camera.lookAt(5_000, 0, 0);
      camera.updateMatrixWorld(true);
      camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
      streamer.updateFrame(camera, { velocity: new THREE.Vector3(500, 0, 0) });

      const movedPosition = streamer.getStats().geographicPosition;
      expect(movedPosition).not.toBe(initialPosition);
      expect(streamer.getStats().pendingRequests).toBeGreaterThanOrEqual(0);
    } finally {
      streamer.dispose();
    }
  }, 10_000);
});
