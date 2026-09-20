'use client';
import { useFrame, useThree } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';
import { useEffect, useRef } from 'react';
import { useWorldStore } from '@/store/world.store';

/**
 * Drives the scene's sky color, fog, sun light + shadows, and stars from the
 * shared sky model — computed from the player's LOCAL timezone in world.store.
 * The sun is a directional light whose shadow camera follows the player so the
 * world casts real shadows around wherever they are.
 */
export function SkyDome() {
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const { scene, camera } = useThree();

  // The directional light aims at its `target`; add it to the scene so it updates.
  useEffect(() => {
    const sun = sunRef.current;
    if (!sun) return;
    scene.add(sun.target);
    return () => {
      scene.remove(sun.target);
    };
  }, [scene]);

  useFrame(() => {
    // Re-derive sky from the wall clock each frame (cheap; pure function).
    useWorldStore.getState().tickTime(new Date());
    const sky = useWorldStore.getState().sky;

    scene.background = new THREE.Color(...sky.skyColor);
    if (!scene.fog) scene.fog = new THREE.FogExp2(0xffffff, sky.fogDensity);
    const fog = scene.fog as THREE.FogExp2;
    fog.color.setRGB(...sky.fogColor);
    fog.density = sky.fogDensity;

    const sun = sunRef.current;
    if (sun) {
      // Keep the sun (and thus its shadow frustum) positioned over the player.
      sun.position.set(
        camera.position.x + sky.sunDirection.x * 140,
        camera.position.y + Math.max(40, sky.sunDirection.y * 140),
        camera.position.z + sky.sunDirection.z * 140,
      );
      sun.target.position.set(camera.position.x, camera.position.y, camera.position.z);
      sun.target.updateMatrixWorld();
      sun.intensity = Math.max(0, sky.sunIntensity);
    }
  });

  const starIntensity = useWorldStore((s) => s.sky.starIntensity);

  return (
    <>
      <ambientLight intensity={0.3} />
      <hemisphereLight args={['#bcd7ff', '#4a4034', 0.5]} />
      <directionalLight
        ref={sunRef}
        castShadow
        color={0xfff2d6}
        intensity={2.4}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.5}
        shadow-camera-far={400}
        shadow-camera-left={-70}
        shadow-camera-right={70}
        shadow-camera-top={70}
        shadow-camera-bottom={-70}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      {starIntensity > 0.05 && (
        <Stars radius={300} depth={60} count={4000} factor={4} fade speed={0.5} />
      )}
    </>
  );
}
