'use client';
import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { World } from './World';
import { SkyDome } from './SkyDome';
import { FpsController } from './FpsController';
import { PlayerAvatar } from './PlayerAvatar';
import { Interaction } from './Interaction';
import { DynamicStones } from './DynamicStones';
import { HitEffects } from './HitEffects';
import { Npcs } from './Npcs';
import { NpcInteraction } from './NpcInteraction';
import { Animals } from './Animals';
import { Projectiles } from './Projectiles';
import { Combat } from './Combat';
import { ChargeOrb } from './ChargeOrb';
import { DamageNumbers } from './DamageNumbers';
import { Monsters } from './Monsters';
import { TargetMarker } from './TargetMarker';
import { BreathMarker } from './BreathMarker';
import { DragonBreath } from './DragonBreath';
import { Tornado } from './Tornado';
import { Tsunami } from './Tsunami';
import { Storm } from './Storm';
import { Bolts } from './Bolts';
import { Explosions } from './Explosions';
import { Campfires } from './Campfires';
import { Chests } from './Chests';
import { Camps } from './Camps';

/**
 * Root R3F canvas. FPS camera only. Shadows + tone mapping on; DPR capped for
 * the 60 FPS budget. The world streams infinitely via <World>; heavier systems
 * (worker meshing, post-fx, instanced rocks/grass) layer in during later phases.
 */
export function GameCanvas() {
  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ fov: 75, near: 0.1, far: 1200, position: [0, 80, 0] }}
    >
      <Suspense fallback={null}>
        <SkyDome />
        <World />
        <DynamicStones />
        <HitEffects />
        <Npcs />
        <Campfires />
        <Camps />
        <Chests />
        <Animals />
        <Monsters />
        <Projectiles />
        <ChargeOrb />
        <TargetMarker />
        <BreathMarker />
        <DragonBreath />
        <Tornado />
        <Tsunami />
        <Storm />
        <Bolts />
        <Explosions />
        <DamageNumbers />
        <PlayerAvatar />
        <FpsController />
        <Interaction />
        <NpcInteraction />
        <Combat />
      </Suspense>
    </Canvas>
  );
}
