import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { ResourceManager } from "../../packages/world-streaming/src/index";

describe("resource residency", () => {
  it("disposes the oldest unreferenced geometry when over budget", () => {
    const manager = new ResourceManager(16 * 1024 * 1024);
    const geometryA = new THREE.BufferGeometry();
    const geometryB = new THREE.BufferGeometry();
    const disposedA = vi.fn();
    geometryA.addEventListener("dispose", disposedA);
    manager.track("a", geometryA, 9 * 1024 * 1024, 9 * 1024 * 1024);
    manager.track("b", geometryB, 9 * 1024 * 1024, 9 * 1024 * 1024);
    const evicted = manager.evictToBudget(new Set());
    expect(evicted).toHaveLength(1);
    expect(disposedA).toHaveBeenCalledTimes(1);
    manager.disposeAll();
  });
});