import * as THREE from "three";

/** Synthetic scenery props for the local game area; not a real airport layout. */
export function RunwayEnvironment() {
  const dashPositions = Array.from({ length: 17 }, (_, index) => 590 - index * 72);
  return (
    <group>
      <mesh position={[0, -0.95, 0]} receiveShadow>
        <boxGeometry args={[1_900, 0.9, 2_200]} />
        <meshStandardMaterial color="#647c69" roughness={1} />
      </mesh>
      <mesh position={[0, -0.18, 0]} receiveShadow>
        <boxGeometry args={[46, 0.38, 1_300]} />
        <meshStandardMaterial color="#313c43" roughness={0.94} />
      </mesh>
      {dashPositions.map((z) => (
        <mesh key={z} position={[0, 0.025, z]}>
          <boxGeometry args={[0.55, 0.035, 25]} />
          <meshStandardMaterial color="#e8e8dc" roughness={0.8} />
        </mesh>
      ))}
      {[-20.7, 20.7].map((x) => (
        <mesh key={x} position={[x, 0.03, 0]}>
          <boxGeometry args={[0.34, 0.04, 1_240]} />
          <meshStandardMaterial color="#e5e7df" roughness={0.85} />
        </mesh>
      ))}
      <mesh position={[75, -0.24, 420]} receiveShadow>
        <boxGeometry args={[95, 0.42, 110]} />
        <meshStandardMaterial color="#4a565b" roughness={0.95} />
      </mesh>
      <mesh position={[75, 0.01, 420]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[10, 10.6, 32]} />
        <meshBasicMaterial color="#d5e2d9" side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.04, 420]}>
        <boxGeometry args={[4.2, 0.04, 1.4]} />
        <meshStandardMaterial color="#e2e5dc" />
      </mesh>
    </group>
  );
}
