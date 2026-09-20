'use client';
import { memo, useEffect, useMemo } from 'react';
import { Instances, Instance } from '@react-three/drei';
import * as THREE from 'three';
import { sampleTerrain, getChunkTrees, getChunkProps, getChunkPonds } from '@eworld/game-core';
import { CHUNK_SIZE, Biome } from '@eworld/shared';
import { useNodeStateStore } from '@/store/nodeState.store';

const SEED = Number(process.env.NEXT_PUBLIC_WORLD_SEED ?? 420691337);
const RES = 24; // terrain vertices per chunk edge
const E = 0.6; // sample epsilon for finite-difference normals

function heightAt(x: number, z: number): number {
  return sampleTerrain(SEED, x, z).height;
}

/** Slope-aware, biome-aware vertex color for a natural look. */
function colorFor(out: THREE.Color, height: number, slope: number, biome: Biome): void {
  if (slope < 0.78) {
    out.setRGB(0.32, 0.29, 0.26); // exposed rock on steep faces
    return;
  }
  switch (biome) {
    case Biome.Snow:
      out.setRGB(0.92, 0.94, 0.98);
      break;
    case Biome.Desert:
      out.setRGB(0.83, 0.72, 0.45);
      break;
    case Biome.Beach:
      out.setRGB(0.86, 0.79, 0.57);
      break;
    case Biome.Swamp:
      out.setRGB(0.24, 0.31, 0.2);
      break;
    case Biome.Mountain:
      out.setRGB(0.42, 0.4, 0.36);
      break;
    default: {
      // Grass/forest — fade toward rock with altitude, brighter in valleys.
      const t = THREE.MathUtils.clamp(height / 130, 0, 1);
      out.setRGB(0.2 + t * 0.25, 0.42 - t * 0.12, 0.16 + t * 0.1);
    }
  }
  if (height > 150) out.lerp(new THREE.Color(0.92, 0.94, 0.98), Math.min(1, (height - 150) / 40));
}

function buildGeometry(cx: number, cz: number): THREE.BufferGeometry {
  const geom = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE, RES, RES);
  geom.rotateX(-Math.PI / 2);
  const pos = geom.attributes.position as THREE.BufferAttribute;
  const nrm = geom.attributes.normal as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const wx = cx * CHUNK_SIZE + pos.getX(i);
    const wz = cz * CHUNK_SIZE + pos.getZ(i);
    const s = sampleTerrain(SEED, wx, wz);
    pos.setY(i, s.height);

    // Finite-difference normal sampled in WORLD space → seamless across chunks.
    const nx = heightAt(wx - E, wz) - heightAt(wx + E, wz);
    const nz = heightAt(wx, wz - E) - heightAt(wx, wz + E);
    const inv = 1 / Math.hypot(nx, 2 * E, nz);
    nrm.setXYZ(i, nx * inv, 2 * E * inv, nz * inv);

    colorFor(c, s.height, 2 * E * inv, s.biome);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  pos.needsUpdate = true;
  nrm.needsUpdate = true;
  geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geom.computeBoundingSphere();
  return geom;
}

/**
 * One streamed world chunk: a terrain mesh plus instanced trees. Geometry is
 * generated once (memoized on cx/cz) and disposed when the chunk unloads. Tree
 * placement comes from the shared deterministic generator so what renders here
 * is exactly what blocks the player. Main-thread meshing for now; Phase 2 moves
 * it into a Web Worker.
 */
export const Chunk = memo(function Chunk({ cx, cz }: { cx: number; cz: number }) {
  const geom = useMemo(() => buildGeometry(cx, cz), [cx, cz]);
  const trees = useMemo(() => getChunkTrees(SEED, cx, cz), [cx, cz]);
  const props = useMemo(() => getChunkProps(SEED, cx, cz), [cx, cz]);
  const rocks = useMemo(() => props.filter((p) => p.kind === 'rock' || p.kind === 'stone'), [props]);
  const bushes = useMemo(() => props.filter((p) => p.kind === 'bush'), [props]);
  const ponds = useMemo(() => getChunkPonds(SEED, cx, cz), [cx, cz]);
  useEffect(() => () => geom.dispose(), [geom]);

  // React to harvest state, but ONLY re-render this chunk when one of ITS OWN
  // nodes changes — otherwise breaking a single object re-rendered every loaded
  // chunk (the freeze). The selector returns a signature of this chunk's broken
  // ids, so unaffected chunks see no change and don't re-render.
  const myIds = useMemo(() => {
    const s = new Set<string>();
    trees.forEach((t) => s.add(t.id));
    rocks.forEach((r) => s.add(r.id));
    bushes.forEach((b) => s.add(b.id));
    return s;
  }, [trees, rocks, bushes]);
  const brokenSig = useNodeStateStore((st) => {
    let sig = '';
    for (const id of myIds) if (st.broken[id]) sig += `${id};`;
    return sig;
  });
  const broken = useNodeStateStore.getState().broken;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fullTrees = useMemo(() => trees.filter((t) => !broken[t.id]), [trees, brokenSig]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stumpTrees = useMemo(() => trees.filter((t) => broken[t.id]), [trees, brokenSig]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const visRocks = useMemo(() => rocks.filter((r) => !broken[r.id]), [rocks, brokenSig]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const visBushes = useMemo(() => bushes.filter((b) => !broken[b.id]), [bushes, brokenSig]);

  const trunkColor = useMemo(() => new THREE.Color('#5b4636'), []);

  return (
    <group position={[cx * CHUNK_SIZE, 0, cz * CHUNK_SIZE]}>
      <mesh geometry={geom} receiveShadow castShadow>
        <meshStandardMaterial vertexColors roughness={0.96} metalness={0} />
      </mesh>

      {fullTrees.length > 0 && (
        <>
          <Instances key={`trunk-${fullTrees.length}`} limit={trees.length} castShadow>
            <cylinderGeometry args={[0.18, 0.32, 1, 6]} />
            <meshStandardMaterial color={trunkColor} roughness={1} />
            {fullTrees.map((t) => (
              <Instance
                key={t.id}
                position={[t.lx, t.y + t.trunkH / 2, t.lz]}
                scale={[1, t.trunkH, 1]}
                rotation={[0, t.rot, 0]}
              />
            ))}
          </Instances>

          <Instances key={`canopy-${fullTrees.length}`} limit={trees.length} castShadow>
            <icosahedronGeometry args={[1, 1]} />
            <meshStandardMaterial roughness={0.9} flatShading />
            {fullTrees.map((t) => (
              <Instance
                key={t.id}
                position={[t.lx, t.y + t.trunkH + t.canopyR * 0.6, t.lz]}
                scale={[t.canopyR, t.canopyR * 1.15, t.canopyR]}
                rotation={[0, t.rot, 0]}
                color={new THREE.Color().setHSL(t.hue, 0.5, 0.32)}
              />
            ))}
          </Instances>
        </>
      )}

      {/* Stumps for trees that have been chopped (until they regrow) */}
      {stumpTrees.length > 0 && (
        <Instances key={`stump-${stumpTrees.length}`} limit={trees.length} castShadow>
          <cylinderGeometry args={[0.26, 0.36, 1, 6]} />
          <meshStandardMaterial color="#4a3826" roughness={1} />
          {stumpTrees.map((t) => (
            <Instance key={t.id} position={[t.lx, t.y + 0.35, t.lz]} scale={[1, 0.7, 1]} />
          ))}
        </Instances>
      )}

      {/* Rocks & small stones (grey boulders, flat-shaded, squashed for a natural look) */}
      {visRocks.length > 0 && (
        <Instances key={`rock-${visRocks.length}`} limit={Math.max(1, rocks.length)} castShadow receiveShadow>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial roughness={0.95} flatShading />
          {visRocks.map((r) => (
            <Instance
              key={r.id}
              position={[r.lx, r.y + r.scale * 0.35, r.lz]}
              scale={[r.scale, r.scale * 0.75, r.scale]}
              rotation={[r.rot * 0.3, r.rot, r.rot * 0.2]}
              color={new THREE.Color().setHSL(0.08, 0.05, 0.42 + (r.scale % 0.2))}
            />
          ))}
        </Instances>
      )}

      {/* Ponds (flat translucent water discs on gentle ground) */}
      {ponds.map((p, i) => (
        <mesh key={`pond-${i}`} position={[p.lx, p.y + 0.06, p.lz]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[p.radius, 28]} />
          <meshStandardMaterial color="#2d6f9e" transparent opacity={0.82} roughness={0.15} metalness={0.2} />
        </mesh>
      ))}

      {/* Bushes (small leafy clusters) */}
      {visBushes.length > 0 && (
        <Instances key={`bush-${visBushes.length}`} limit={Math.max(1, bushes.length)} castShadow>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial roughness={0.9} flatShading />
          {visBushes.map((b) => (
            <Instance
              key={b.id}
              position={[b.lx, b.y + b.scale * 0.45, b.lz]}
              scale={[b.scale, b.scale * 0.7, b.scale]}
              rotation={[0, b.rot, 0]}
              color={new THREE.Color().setHSL(0.26, 0.45, 0.26)}
            />
          ))}
        </Instances>
      )}
    </group>
  );
});
