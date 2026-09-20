'use client';
import { useMemo } from 'react';
import { Billboard, Text } from '@react-three/drei';
import { surfaceHeight } from '@eworld/game-core';
import { NPCS, type NpcDef } from './npcs';

const SEED = Number(process.env.NEXT_PUBLIC_WORLD_SEED ?? 420691337);

const KIND_ICON: Record<string, string> = {
  spellmaster: '✨',
  trainer: '💨',
  merchant: '🪙',
};

/** Renders the village NPCs as simple robed figures with a floating name tag. */
export function Npcs() {
  return (
    <>
      {NPCS.map((n) => (
        <NpcAvatar key={n.id} def={n} />
      ))}
    </>
  );
}

function NpcAvatar({ def }: { def: NpcDef }) {
  const y = useMemo(() => surfaceHeight(SEED, def.x, def.z), [def.x, def.z]);
  return (
    <group position={[def.x, y, def.z]}>
      {/* robe */}
      <mesh position={[0, 0.7, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.46, 1.4, 10]} />
        <meshStandardMaterial color={def.color} roughness={0.85} />
      </mesh>
      {/* head */}
      <mesh position={[0, 1.62, 0]} castShadow>
        <sphereGeometry args={[0.19, 16, 14]} />
        <meshStandardMaterial color="#c69472" roughness={0.7} />
      </mesh>
      {/* spellmasters wear a pointed hat */}
      {def.kind === 'spellmaster' && (
        <mesh position={[0, 1.95, 0]} castShadow>
          <coneGeometry args={[0.24, 0.5, 12]} />
          <meshStandardMaterial color={def.color} roughness={0.8} />
        </mesh>
      )}

      {/* floating name tag */}
      <Billboard position={[0, 2.5, 0]}>
        <Text fontSize={0.26} color="#ffffff" anchorX="center" outlineWidth={0.02} outlineColor="#000000">
          {`${KIND_ICON[def.kind] ?? ''} ${def.name}`}
        </Text>
        <Text position={[0, -0.28, 0]} fontSize={0.16} color="#cbd5e1" anchorX="center" outlineWidth={0.015} outlineColor="#000000">
          {def.title}
        </Text>
      </Billboard>
    </group>
  );
}
