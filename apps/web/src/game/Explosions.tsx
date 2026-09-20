'use client';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { useExplosionsStore, type Explosion } from '@/store/explosions.store';

const LIFE = 700; // ms

/** Expanding blasts + spinning updraft vortexes. */
export function Explosions() {
  const explosions = useExplosionsStore((s) => s.explosions);
  useFrame(() => useExplosionsStore.getState().prune(performance.now()));
  return (
    <>
      {explosions.map((e) =>
        e.kind === 'vortex' ? (
          <Vortex key={e.id} e={e} />
        ) : e.kind === 'geyser' ? (
          <Geyser key={e.id} e={e} />
        ) : (
          <Blast key={e.id} e={e} />
        ),
      )}
    </>
  );
}

function Blast({ e }: { e: Explosion }) {
  const mesh = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.PointLight>(null);
  useFrame(() => {
    const m = mesh.current;
    if (!m) return;
    const t = Math.min(1, (performance.now() - e.start) / LIFE);
    const eased = 1 - (1 - t) * (1 - t);
    m.scale.setScalar(0.3 + eased * e.radius);
    const mat = m.material as THREE.MeshStandardMaterial;
    mat.opacity = 0.85 * (1 - t);
    if (light.current) light.current.intensity = 8 * (1 - t);
  });
  return (
    <group position={[e.x, e.y + 0.4, e.z]}>
      <mesh ref={mesh}>
        <sphereGeometry args={[1, 18, 16]} />
        <meshStandardMaterial color={e.color} emissive={e.color} emissiveIntensity={2.5} transparent opacity={0.85} toneMapped={false} />
      </mesh>
      <pointLight ref={light} color={e.color} intensity={8} distance={e.radius * 5} />
    </group>
  );
}

/** A column of water that erupts upward then settles (Geyser). */
function Geyser({ e }: { e: Explosion }) {
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const t = Math.min(1, (performance.now() - e.start) / LIFE);
    const up = Math.sin(Math.min(1, t * 1.3) * Math.PI); // shoot up then fall
    g.scale.set(e.radius * (0.5 + t * 0.6), 0.6 + up * 2.4, e.radius * (0.5 + t * 0.6));
    g.children.forEach((c) => {
      const mat = (c as THREE.Mesh).material as THREE.MeshBasicMaterial;
      if (mat) mat.opacity = 0.7 * (1 - t);
    });
  });
  return (
    <group ref={group} position={[e.x, e.y, e.z]}>
      <mesh position={[0, 2, 0]}>
        <cylinderGeometry args={[0.7, 1.1, 4, 12, 1, true]} />
        <meshBasicMaterial color={e.color} transparent opacity={0.7} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.3, 0.8, 3, 12, 1, true]} />
        <meshBasicMaterial color="#dff3ff" transparent opacity={0.6} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 2, 0]} color={e.color} intensity={3} distance={e.radius * 4} />
    </group>
  );
}

/** A tall spinning wind column that bursts upward (Updraft). */
function Vortex({ e }: { e: Explosion }) {
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const t = Math.min(1, (performance.now() - e.start) / LIFE);
    g.rotation.y = t * 14;
    const grow = 0.4 + t * 1.0;
    g.scale.set(e.radius * grow, 1 + t * 1.2, e.radius * grow);
    g.children.forEach((c) => {
      const mat = (c as THREE.Mesh).material as THREE.MeshBasicMaterial;
      if (mat) mat.opacity = 0.6 * (1 - t);
    });
  });
  return (
    <group ref={group} position={[e.x, e.y, e.z]}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, 2 + i * 1.6, 0]} rotation={[0, i * 1.2, 0]}>
          <coneGeometry args={[1 - i * 0.18, 3, 8, 1, true]} />
          <meshBasicMaterial color={e.color} transparent opacity={0.6} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}
