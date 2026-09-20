'use client';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { useCampsStore, type Chest } from '@/store/camps.store';
import { usePlayerStore } from '@/store/player.store';
import { useInventoryStore } from '@/store/inventory.store';
import { useProgressStore } from '@/store/progress.store';
import { useGameplayStore } from '@/store/gameplay.store';
import { itemMeta } from './items';

/** Loot chests dropped by cleared camps. Walk up to auto-open (gold + items). */
export function Chests() {
  const chests = useCampsStore((s) => s.chests);

  useFrame(() => {
    const p = usePlayerStore.getState().position;
    for (const c of chests) {
      if (c.opened) continue;
      if ((c.x - p.x) ** 2 + (c.z - p.z) ** 2 < 2.5 * 2.5) {
        useCampsStore.getState().openChest(c.id);
        useProgressStore.getState().addCoins(c.gold);
        const inv = useInventoryStore.getState();
        const parts: string[] = [`+${c.gold}🪙`];
        for (const it of c.items) {
          inv.add(it.key, it.qty);
          parts.push(`+${it.qty} ${itemMeta(it.key).icon}`);
        }
        useGameplayStore.getState().pushToast(`📦 ${parts.join('  ')}`, performance.now());
      }
    }
  });

  return (
    <>
      {chests.map((c) => (
        <ChestMesh key={c.id} chest={c} />
      ))}
    </>
  );
}

function ChestMesh({ chest }: { chest: Chest }) {
  const lid = useRef<THREE.Group>(null);
  const glow = useRef<THREE.PointLight>(null);
  useFrame(() => {
    if (lid.current) lid.current.rotation.x = chest.opened ? -1.6 : 0;
    if (glow.current) glow.current.intensity = chest.opened ? 0 : 1.5 + Math.sin(performance.now() * 0.005) * 0.6;
  });
  return (
    <group position={[chest.x, chest.y, chest.z]}>
      {/* base */}
      <mesh position={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[0.9, 0.6, 0.6]} />
        <meshStandardMaterial color="#6b4a2b" roughness={0.9} />
      </mesh>
      {/* iron bands */}
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[0.94, 0.16, 0.64]} />
        <meshStandardMaterial color="#9aa3ad" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* lid (hinged at the back) */}
      <group ref={lid} position={[0, 0.6, -0.3]}>
        <mesh position={[0, 0.08, 0.3]} castShadow>
          <boxGeometry args={[0.9, 0.22, 0.6]} />
          <meshStandardMaterial color="#5a3d24" roughness={0.9} />
        </mesh>
      </group>
      {/* warm glow while unopened */}
      <pointLight ref={glow} position={[0, 0.6, 0]} color="#ffd66a" intensity={1.5} distance={5} />
    </group>
  );
}
