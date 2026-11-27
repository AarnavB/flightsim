import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { cameraMotion, RESET_CAMERA_EVENT } from "./camera-motion";

const START_POSITION = new THREE.Vector3(0, 6_500, 15_000);

export function CameraRig() {
  const { camera, gl } = useThree();
  const keys = useRef(new Set<string>());
  const yaw = useRef(0);
  const pitch = useRef(-0.22);
  const previousRotation = useRef({ yaw: 0, pitch: -0.22 });
  const pointer = useRef<{ id: number; x: number; y: number } | null>(null);
  const speedScale = useRef(1);
  const previousPosition = useRef(new THREE.Vector3());
  const forward = useRef(new THREE.Vector3());
  const right = useRef(new THREE.Vector3());
  const movement = useRef(new THREE.Vector3());

  useEffect(() => {
    camera.position.copy(START_POSITION);
    camera.rotation.order = "YXZ";
    camera.rotation.set(pitch.current, yaw.current, 0);
    previousPosition.current.copy(camera.position);
    const element = gl.domElement;
    element.tabIndex = 0;
    element.setAttribute("aria-label", "3D flight-simulator viewport. Drag to look, use W A S D to move.");

    const down = (event: PointerEvent) => {
      if (event.button !== 0) return;
      pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
      element.setPointerCapture?.(event.pointerId);
    };
    const move = (event: PointerEvent) => {
      const current = pointer.current;
      if (!current || current.id !== event.pointerId) return;
      const dx = event.clientX - current.x;
      const dy = event.clientY - current.y;
      current.x = event.clientX;
      current.y = event.clientY;
      yaw.current -= dx * 0.0025 * cameraMotion.sensitivity;
      pitch.current = THREE.MathUtils.clamp(
        pitch.current - dy * 0.0022 * cameraMotion.sensitivity,
        -1.48,
        1.48
      );
    };
    const up = (event: PointerEvent) => {
      if (pointer.current?.id === event.pointerId) pointer.current = null;
    };
    const wheel = (event: WheelEvent) => {
      speedScale.current = THREE.MathUtils.clamp(
        speedScale.current * Math.exp(-event.deltaY * 0.001),
        0.2,
        8
      );
    };
    const keyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(target.tagName)) return;
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)) event.preventDefault();
      if (event.key.toLowerCase() === "r") window.dispatchEvent(new CustomEvent(RESET_CAMERA_EVENT));
      keys.current.add(event.key.toLowerCase());
    };
    const keyUp = (event: KeyboardEvent) => keys.current.delete(event.key.toLowerCase());
    const reset = () => {
      camera.position.copy(START_POSITION);
      yaw.current = 0;
      pitch.current = -0.22;
      camera.rotation.set(pitch.current, yaw.current, 0);
      cameraMotion.velocity.set(0, 0, 0);
      speedScale.current = 1;
      previousPosition.current.copy(camera.position);
    };
    const blur = () => keys.current.clear();

    element.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    element.addEventListener("wheel", wheel, { passive: true });
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    window.addEventListener("blur", blur);
    window.addEventListener(RESET_CAMERA_EVENT, reset);
    return () => {
      element.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      element.removeEventListener("wheel", wheel);
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      window.removeEventListener("blur", blur);
      window.removeEventListener(RESET_CAMERA_EVENT, reset);
    };
  }, [camera, gl]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const keySet = keys.current;
    const sensitivity = cameraMotion.sensitivity;
    if (keySet.has("arrowleft")) yaw.current += dt * 0.8 * sensitivity;
    if (keySet.has("arrowright")) yaw.current -= dt * 0.8 * sensitivity;
    if (keySet.has("arrowup")) pitch.current = THREE.MathUtils.clamp(
      pitch.current + dt * 0.6 * sensitivity, -1.48, 1.48
    );
    if (keySet.has("arrowdown")) pitch.current = THREE.MathUtils.clamp(
      pitch.current - dt * 0.6 * sensitivity, -1.48, 1.48
    );

    camera.rotation.order = "YXZ";
    camera.rotation.set(pitch.current, yaw.current, 0);
    camera.getWorldDirection(forward.current);
    right.current.crossVectors(forward.current, camera.up).normalize().negate();
    movement.current.set(0, 0, 0);
    if (keySet.has("w")) movement.current.add(forward.current);
    if (keySet.has("s")) movement.current.sub(forward.current);
    if (keySet.has("d")) movement.current.add(right.current);
    if (keySet.has("a")) movement.current.sub(right.current);
    if (keySet.has(" ")) movement.current.y += 1;
    if (keySet.has("shift")) movement.current.y -= 1;
    if (movement.current.lengthSq() > 0) {
      movement.current.normalize().multiplyScalar(
        cameraMotion.speed * sensitivity * speedScale.current * dt
      );
      camera.position.add(movement.current);
    }

    if (dt > 0) {
      cameraMotion.velocity.subVectors(camera.position, previousPosition.current).multiplyScalar(1 / dt);
    }
    previousPosition.current.copy(camera.position);
    cameraMotion.yawRate = (yaw.current - previousRotation.current.yaw) / Math.max(dt, 0.001);
    cameraMotion.pitchRate = (pitch.current - previousRotation.current.pitch) / Math.max(dt, 0.001);
    previousRotation.current = { yaw: yaw.current, pitch: pitch.current };
  });

  return null;
}