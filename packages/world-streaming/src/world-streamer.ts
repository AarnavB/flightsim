import * as THREE from "three";
import type { TileMetadata } from "@flightsim/shared-types";
import type { LocalTangentFrame } from "@flightsim/geography";
import { boundsCenter, parentTileId, tileBounds } from "@flightsim/geography";
import type { TerrainPayload, TerrainProvider } from "@flightsim/terrain";
import { LruCache } from "./cache/lru-cache";
import { TileTree } from "./quadtree/tile-tree";
import { TileLifecycle, type TileState } from "./lifecycle/state";
import { PriorityScheduler } from "./scheduler/priority-scheduler";
import { ResourceManager } from "./residency/resource-manager";
import { TileSelector } from "./selection/tile-selector";
import { PrefetchPredictor } from "./prefetch/predictor";

export interface StreamerProfile {
  name: "Low" | "Medium" | "High" | "Ultra";
  maxLod: number;
  maxDistance: number;
  maxResidentBytes: number;
  terrainSegments: number;
  selectionIntervalMs: number;
  prefetchIntervalMs: number;
}

export interface TileAsset {
  id: string;
  level: number;
  geometry: THREE.BufferGeometry;
}

export interface StreamerStats {
  fps: number;
  frameTimeMs: number;
  geographicPosition: string;
  cameraDirection: string;
  cameraAltitude: number;
  activeTileCount: number;
  visibleTileCount: number;
  prefetchedTileCount: number;
  cachedTileCount: number;
  pendingRequests: number;
  failedRequests: number;
  activeWorkers: number;
  geometryMemoryBytes: number;
  cpuMemoryBytes: number;
  textureMemoryBytes: number;
  memoryBudgetMiB: number;
  memoryUsagePercent: number;
  drawCalls: number;
  triangles: number;
  lodSummary: string;
}

export interface MotionLike {
  velocity: THREE.Vector3;
  speed?: number;
  yawRate?: number;
  pitchRate?: number;
}

export interface RendererCounters {
  calls: number;
  triangles: number;
}

const MIN_RENDERABLE_LEVEL = 2;
const RETENTION_MS = 45_000;

export class WorldStreamer {
  private readonly tree = new TileTree();
  private readonly lifecycle = new TileLifecycle();
  private readonly cache = new LruCache<TileAsset>();
  private readonly resources: ResourceManager;
  private readonly scheduler = new PriorityScheduler(3);
  private readonly selector: TileSelector;
  private readonly predictor: PrefetchPredictor;
  private readonly projectionView = new THREE.Matrix4();
  private readonly renderDirection = new THREE.Vector3();
  private visibleIds: string[] = [];
  private prefetchIds: string[] = [];
  private requestedIds = new Set<string>();
  private camera: THREE.PerspectiveCamera | null = null;
  private frustum = new THREE.Frustum();
  private lastSelection = 0;
  private lastPrefetch = 0;
  private lastBudget = 0;
  private lastPublishKey = "";
  private disposed = false;
  private profile: StreamerProfile;
  private readonly listeners = new Set<() => void>();

  constructor(
    private readonly provider: TerrainProvider,
    private readonly frame: LocalTangentFrame,
    profile: StreamerProfile
  ) {
    this.profile = profile;
    this.resources = new ResourceManager(profile.maxResidentBytes);
    this.selector = new TileSelector(this.tree, frame);
    this.predictor = new PrefetchPredictor(frame, this.tree);
  }

  setProfile(profile: StreamerProfile): void {
    this.profile = profile;
    this.resources.setBudget(profile.maxResidentBytes);
    this.scheduler.setConcurrency(profile.name === "Low" ? 2 : profile.name === "Ultra" ? 4 : 3);
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private publish(): void {
    const assets = this.getRenderableAssets();
    const key = assets.map((asset) => asset.id).sort().join("|");
    if (key === this.lastPublishKey) return;
    this.lastPublishKey = key;
    for (const listener of this.listeners) listener();
  }

  /** Cheap transform/frustum refresh every frame; detailed work is throttled by profile. */
  updateFrame(camera: THREE.PerspectiveCamera, motion: MotionLike): void {
    if (this.disposed) return;
    this.camera = camera;
    camera.updateMatrixWorld();
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
    this.projectionView.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.projectionView);

    const now = performance.now();
    if (now - this.lastSelection >= this.profile.selectionIntervalMs) {
      this.lastSelection = now;
      this.selectAndSchedule(camera);
    }
    if (now - this.lastPrefetch >= this.profile.prefetchIntervalMs) {
      this.lastPrefetch = now;
      this.updatePrefetch(camera, motion);
    }
    if (now - this.lastBudget >= 1_000) {
      this.lastBudget = now;
      this.evaluateResidency(now);
    }
  }

  private selectAndSchedule(camera: THREE.PerspectiveCamera): void {
    const selected = this.selector.select(camera, this.frustum, {
      maxLod: this.profile.maxLod,
      maxDistance: this.profile.maxDistance,
      maxTiles: this.profile.name === "Low" ? 54 : 96,
      targetScreenError: this.profile.name === "Low" ? 4 : 2.8
    });

    const nextVisible = selected.map((node) => node.id);
    const nextSet = new Set(nextVisible);
    for (const previous of this.visibleIds) {
      if (!nextSet.has(previous) && this.lifecycle.get(previous) === "Visible") {
        this.lifecycle.transition(previous, "Retained");
        this.tree.setState(previous, "Retained");
      }
    }
    this.visibleIds = nextVisible;

    const baseDesired = new Set<string>(this.visibleIds);
    for (const node of selected) {
      this.queueTile(node, 1000 - this.distanceTo(node));

      // Keep a coarse fallback resident while more detailed descendants are generated.
      let ancestor = parentTileId(node.id);
      while (ancestor) {
        const ancestorNode = this.tree.get(ancestor);
        if (ancestorNode.level < MIN_RENDERABLE_LEVEL) break;
        baseDesired.add(ancestor);
        this.queueTile(ancestorNode, 650 - ancestorNode.level * 12);
        ancestor = parentTileId(ancestor);
      }
    }

    const desired = new Set([...baseDesired, ...this.prefetchIds]);
    this.cancelUnwanted(desired);
    this.requestedIds = baseDesired;
    this.publish();
  }

  private updatePrefetch(camera: THREE.PerspectiveCamera, motion: MotionLike): void {
    this.prefetchIds = this.predictor.predict(
      camera,
      motion.velocity,
      this.profile.maxLod
    ).filter((id) => !this.visibleIds.includes(id) && !this.cache.has(id));

    for (const id of this.prefetchIds) {
      this.queueTile(this.tree.get(id), 250 - this.distanceTo(this.tree.get(id)) * 0.0001);
    }

    const desired = new Set([...this.requestedIds, ...this.prefetchIds]);
    this.cancelUnwanted(desired);
  }

  private cancelUnwanted(desired: ReadonlySet<string>): void {
    const cancelledQueued = this.scheduler.cancelWhere(desired);
    for (const id of cancelledQueued) {
      if (this.lifecycle.get(id) === "Queued") {
        this.lifecycle.transition(id, "Unloaded");
        this.tree.setState(id, "Unloaded");
      }
    }
  }

  private distanceTo(node: TileMetadata): number {
    if (!this.camera) return 0;
    const point = this.frame.toRender(boundsCenter(node.bounds));
    return this.camera.position.distanceTo(new THREE.Vector3(...point));
  }

  private queueTile(node: TileMetadata, priority: number): void {
    if (this.cache.has(node.id) || this.disposed) return;

    const state = this.lifecycle.get(node.id);
    if (
      state === "Queued" || state === "Loading" || state === "Decoding" ||
      state === "Resident" || state === "Visible" || state === "Retained"
    ) return;
    if (state === "Failed" && this.lifecycle.failureCount(node.id) > 2) return;
    if (state !== "Unloaded" && state !== "Failed") return;

    try {
      this.lifecycle.transition(node.id, "Queued");
    } catch {
      return;
    }
    this.tree.setState(node.id, "Queued");

    const queued = this.scheduler.enqueue(node.id, priority, async (signal) => {
      try {
        this.lifecycle.transition(node.id, "Loading");
        this.tree.setState(node.id, "Loading");

        const payload = await this.provider.generate({
          tileId: node.id,
          bounds: tileBounds(node.id),
          origin: this.frame.origin,
          segments: Math.min(this.profile.terrainSegments, 8 + node.level * 2)
        }, signal);

        if (signal.aborted || this.disposed) {
          this.transitionToUnloadedIfActive(node.id);
          return;
        }

        this.validatePayload(payload);
        this.lifecycle.transition(node.id, "Decoding");
        this.tree.setState(node.id, "Decoding");

        const geometry = this.createGeometry(payload);
        const bytes = this.geometryBytes(geometry);
        const asset: TileAsset = { id: node.id, level: node.level, geometry };
        this.resources.track(node.id, geometry, bytes, bytes);
        this.cache.set(node.id, asset, bytes);
        this.lifecycle.transition(node.id, "Ready");
        this.lifecycle.transition(node.id, "Resident");
        this.tree.setState(node.id, "Resident");
        this.publish();
      } catch (error) {
        if (signal.aborted || this.disposed) {
          this.transitionToUnloadedIfActive(node.id);
          return;
        }

        const current = this.lifecycle.get(node.id);
        if (current !== "Failed" && current !== "Unloaded") {
          this.lifecycle.transition(node.id, "Failed");
        }
        this.tree.setState(node.id, "Failed");
        console.warn("Terrain tile failed: " + node.id, error);
        this.publish();
      }
    });

    if (!queued && this.lifecycle.get(node.id) === "Queued") {
      this.lifecycle.transition(node.id, "Unloaded");
      this.tree.setState(node.id, "Unloaded");
    }
  }

  private transitionToUnloadedIfActive(id: string): void {
    const current = this.lifecycle.get(id);
    if (current === "Queued" || current === "Loading" || current === "Decoding") {
      this.lifecycle.transition(id, "Unloaded");
      this.tree.setState(id, "Unloaded");
    }
  }

  private validatePayload(payload: TerrainPayload): void {
    if (
      !(payload.positions instanceof Float32Array) ||
      !(payload.uvs instanceof Float32Array) ||
      !(payload.indices instanceof Uint32Array) ||
      payload.positions.length % 3 !== 0 ||
      payload.uvs.length / 2 !== payload.positions.length / 3
    ) {
      throw new Error("Terrain provider returned malformed typed-array geometry.");
    }
    for (const value of payload.positions) {
      if (!Number.isFinite(value)) throw new Error("Terrain provider returned a non-finite vertex.");
    }
  }

  private createGeometry(payload: TerrainPayload): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(payload.positions, 3));
    geometry.setAttribute("uv", new THREE.BufferAttribute(payload.uvs, 2));
    geometry.setIndex(new THREE.BufferAttribute(payload.indices, 1));
    geometry.computeVertexNormals();

    const positions = geometry.getAttribute("position") as THREE.BufferAttribute;
    const colors = new Float32Array(positions.count * 3);
    const color = new THREE.Color();
    for (let i = 0; i < positions.count; i += 1) {
      const elevation = positions.getY(i);
      const shade = THREE.MathUtils.clamp((elevation + 1_200) / 2_800, 0, 1);
      color.setHSL(0.30 - shade * 0.11, 0.25 + shade * 0.12, 0.28 + shade * 0.18);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.computeBoundingSphere();
    return geometry;
  }

  private geometryBytes(geometry: THREE.BufferGeometry): number {
    let bytes = geometry.index?.array.byteLength ?? 0;
    for (const attribute of Object.values(geometry.attributes)) {
      bytes += attribute.array.byteLength;
    }
    return bytes;
  }

  /** Returns visible leaves, substituting the closest cached ancestor when a child is late or failed. */
  getRenderableAssets(): TileAsset[] {
    const result = new Map<string, TileAsset>();
    for (const id of this.visibleIds) {
      let candidate: string | null = id;
      while (candidate) {
        const asset = this.cache.get(candidate);
        if (asset) {
          result.set(candidate, asset);
          this.resources.touch(candidate);
          break;
        }
        const parent = parentTileId(candidate);
        if (!parent || Number(parent.split("/")[0]) < MIN_RENDERABLE_LEVEL) break;
        candidate = parent;
      }
    }

    this.resources.setReferences(new Set(result.keys()));
    return [...result.values()].sort((a, b) => a.level - b.level);
  }

  private evaluateResidency(now: number): void {
    const protectedIds = new Set([...this.visibleIds, ...this.prefetchIds]);
    const evicted = [
      ...this.resources.evictToBudget(protectedIds),
      ...this.resources.evictOlderThan(now - RETENTION_MS, protectedIds)
    ];

    for (const id of evicted) {
      this.cache.delete(id);
      const state = this.lifecycle.get(id);
      if (state === "Visible") this.lifecycle.transition(id, "Retained");
      if (["Resident", "Ready", "Retained", "Visible"].includes(this.lifecycle.get(id))) {
        this.lifecycle.transition(id, "Evicting");
        this.lifecycle.transition(id, "Unloaded");
      }
      this.tree.setState(id, "Unloaded");
    }

    for (const id of this.visibleIds) {
      const state = this.lifecycle.get(id);
      if (state === "Resident" || state === "Retained") {
        this.lifecycle.transition(id, "Visible");
        this.tree.setState(id, "Visible");
      }
    }

    this.publish();
  }

  getStats(fps = 0, renderer?: RendererCounters): StreamerStats {
    const position = this.camera
      ? this.frame.fromRender(this.camera.position.x, this.camera.position.y, this.camera.position.z)
      : this.frame.origin;
    const levels = new Map<number, number>();

    for (const id of this.visibleIds) {
      const level = Number(id.split("/")[0]);
      levels.set(level, (levels.get(level) ?? 0) + 1);
    }

    if (this.camera) this.camera.getWorldDirection(this.renderDirection);
    const usage = this.resources.geometryMemoryBytes;

    return {
      fps,
      frameTimeMs: fps > 0 ? 1000 / fps : 0,
      geographicPosition: position.latitude.toFixed(4) + ", " + position.longitude.toFixed(4),
      cameraDirection: this.renderDirection.toArray().map((value) => value.toFixed(2)).join(", "),
      cameraAltitude: position.height,
      activeTileCount: this.resources.count,
      visibleTileCount: this.visibleIds.length,
      prefetchedTileCount: this.prefetchIds.length,
      cachedTileCount: this.cache.size,
      pendingRequests: this.scheduler.pendingCount,
      failedRequests: [...this.lifecycle.entries()].filter((entry: [string, TileState]) => entry[1] === "Failed").length,
      activeWorkers: this.provider.activeWorkers(),
      geometryMemoryBytes: usage,
      cpuMemoryBytes: this.resources.cpuMemoryBytes,
      textureMemoryBytes: this.resources.textureMemoryBytes,
      memoryBudgetMiB: Math.round(this.resources.memoryBudgetBytes / (1024 * 1024)),
      memoryUsagePercent: usage / this.resources.memoryBudgetBytes * 100,
      drawCalls: renderer?.calls ?? 0,
      triangles: renderer?.triangles ?? 0,
      lodSummary: [...levels.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([level, count]) => "L" + level + ":" + count)
        .join("  ")
    };
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.scheduler.dispose();
    this.provider.dispose();
    this.resources.disposeAll();
    this.cache.clear();
    this.tree.clear();
    this.listeners.clear();
  }
}