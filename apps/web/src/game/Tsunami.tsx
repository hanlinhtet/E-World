'use client';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { surfaceHeight } from '@eworld/game-core';
import { useWavesStore, type Wave } from '@/store/waves.store';
import { useAnimalsStore } from '@/store/animals.store';
import { useMonstersStore } from '@/store/monsters.store';
import { useDamageStore } from '@/store/damage.store';

const SEED = Number(process.env.NEXT_PUBLIC_WORLD_SEED ?? 420691337);

/** Advancing water walls: sweep forward, damaging + shoving + soaking foes. */
export function Tsunami() {
  const waves = useWavesStore((s) => s.waves);
  return (
    <>
      {waves.map((w) => (
        <WaveMesh key={w.id} wave={w} />
      ))}
    </>
  );
}

function WaveMesh({ wave }: { wave: Wave }) {
  const group = useRef<THREE.Group>(null);

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const now = performance.now();
    const elapsed = (now - wave.start) / 1000;
    const dist = wave.speed * elapsed;
    if (dist > wave.length) {
      useWavesStore.getState().remove(wave.id);
      return;
    }
    // Position the wall at the current front, on the ground, facing travel dir.
    const fx = wave.ox + wave.dx * dist;
    const fz = wave.oz + wave.dz * dist;
    g.position.set(fx, surfaceHeight(SEED, fx, fz), fz);
    g.rotation.y = Math.atan2(wave.dx, wave.dz);
    const fade = 1 - dist / wave.length;
    g.children.forEach((c) => {
      const mat = (c as THREE.Mesh).material as THREE.MeshBasicMaterial;
      if (mat) mat.opacity = 0.7 * fade;
    });

    // Sweep entities near the front (each hit once).
    const halfW = wave.width / 2;
    const sweep = (
      e: { x: number; z: number; hp: number; knockX: number; knockZ: number; knockVY: number; knockUntil: number; slowUntil: number; flashUntil: number },
      id: string,
      ey: number,
      size: number,
    ) => {
      if (wave.hit.has(id)) return;
      const rx = e.x - wave.ox;
      const rz = e.z - wave.oz;
      const along = rx * wave.dx + rz * wave.dz;
      const perp = Math.abs(rx * -wave.dz + rz * wave.dx);
      if (along > 0 && Math.abs(along - dist) < 2.2 && perp < halfW) {
        wave.hit.add(id);
        e.hp -= wave.damage;
        e.flashUntil = now + 160;
        e.knockX = wave.dx * wave.knock;
        e.knockZ = wave.dz * wave.knock;
        e.knockVY = 5;
        e.knockUntil = now + 500;
        e.slowUntil = now + wave.slow;
        useDamageStore.getState().add(e.x, ey + size, e.z, wave.damage, true, now);
      }
    };
    for (const a of useAnimalsStore.getState().animals) if (!a.dead) sweep(a, a.id, a.y + a.size, a.size);
    for (const m of useMonstersStore.getState().monsters) if (!m.dead) sweep(m, m.id, m.y + m.size * 1.7, m.size);
  });

  return (
    <group ref={group}>
      <mesh position={[0, 1.4, 0]}>
        <boxGeometry args={[wave.width, 2.8, 0.8]} />
        <meshBasicMaterial color={wave.color} transparent opacity={0.7} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, 2.7, 0]}>
        <boxGeometry args={[wave.width, 0.6, 1.0]} />
        <meshBasicMaterial color="#eaf6ff" transparent opacity={0.7} depthWrite={false} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 2, 0]} color={wave.color} intensity={2} distance={wave.width} />
    </group>
  );
}
