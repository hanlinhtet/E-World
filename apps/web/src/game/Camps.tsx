'use client';
import { useMemo } from 'react';
import { surfaceHeight } from '@eworld/game-core';
import { useCampsStore, type Camp } from '@/store/camps.store';

const SEED = Number(process.env.NEXT_PUBLIC_WORLD_SEED ?? 420691337);

/** Decorations for an enemy camp: teepee tents, a fire pit, and supply crates
 *  around the rest area. They vanish when the camp is cleared (the chest stays). */
export function Camps() {
  const camps = useCampsStore((s) => s.camps);
  return (
    <>
      {camps.map((c) => (
        <CampProps key={c.id} camp={c} />
      ))}
    </>
  );
}

function CampProps({ camp }: { camp: Camp }) {
  const items = useMemo(() => {
    const tents = [
      { dx: -3, dz: -2, rot: 0.4 },
      { dx: 3.2, dz: -1.5, rot: -0.6 },
      { dx: 0.5, dz: 3.3, rot: 1.2 },
    ];
    const crates = [
      { dx: -1.5, dz: 1.8 },
      { dx: 2, dz: 1.5 },
      { dx: -2.6, dz: 0.6 },
    ];
    return { tents, crates };
  }, []);

  const y = (dx: number, dz: number) => surfaceHeight(SEED, camp.x + dx, camp.z + dz);

  return (
    <group>
      {/* central fire pit (stone ring + dark logs) */}
      <group position={[camp.x, y(0, 0), camp.z]}>
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const a = (i / 6) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.5, 0.1, Math.sin(a) * 0.5]} castShadow>
              <icosahedronGeometry args={[0.15, 0]} />
              <meshStandardMaterial color="#7d7a73" roughness={1} />
            </mesh>
          );
        })}
        <mesh position={[0, 0.12, 0]} rotation={[0, 0.5, Math.PI / 2.1]} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 0.7, 6]} />
          <meshStandardMaterial color="#3a2a18" roughness={1} />
        </mesh>
      </group>

      {/* teepee tents */}
      {items.tents.map((t, i) => (
        <group key={i} position={[camp.x + t.dx, y(t.dx, t.dz), camp.z + t.dz]} rotation={[0, t.rot, 0]}>
          <mesh position={[0, 0.9, 0]} castShadow>
            <coneGeometry args={[1.1, 1.8, 6]} />
            <meshStandardMaterial color="#6b5436" roughness={0.95} />
          </mesh>
          {/* doorway */}
          <mesh position={[0, 0.5, 1.0]}>
            <boxGeometry args={[0.5, 0.9, 0.1]} />
            <meshStandardMaterial color="#22190f" roughness={1} />
          </mesh>
        </group>
      ))}

      {/* supply crates */}
      {items.crates.map((c, i) => (
        <mesh key={i} position={[camp.x + c.dx, y(c.dx, c.dz) + 0.25, camp.z + c.dz]} rotation={[0, i, 0]} castShadow>
          <boxGeometry args={[0.5, 0.5, 0.5]} />
          <meshStandardMaterial color="#5a3d24" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}
