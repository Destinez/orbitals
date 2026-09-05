/**
 * 3D space debris: a small deterministic set of faceted bodies on the
 * same depth scale as the orbital system. Their motion is generated from
 * the frame, not accumulated state, so Remotion's parallel frame renders
 * remain reproducible.
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import { useCurrentFrame } from 'remotion';
import { makeField, depthAt, depthAlpha, Z_FAR, Z_NEAR, type Mote } from '../warp';
import { CYAN_HEX } from '../theme';

export const Debris3D: React.FC<{ seed: string; opacity: number }> = ({ seed, opacity }) => {
  const frame = useCurrentFrame();
  const debris = useMemo<Mote[]>(() => makeField(`${seed}:3d-debris`, {
    count: 34,
    minRadius: 0.025,
    maxRadius: 0.12,
    rocky: true,
    colors: 1,
  }), [seed]);

  return (
    <>
      {debris.map((m, i) => {
        const z = depthAt(m.z0, frame);
        if (z <= Z_NEAR + 0.002) return null;
        // The camera is at +Z. Mapping the depth shell into scene Z keeps
        // these as actual 3D bodies: near rocks grow through perspective,
        // pass the camera, and re-enter from the far plane.
        const sceneZ = Z_FAR - z;
        const alpha = opacity * depthAlpha(z) * 0.7;
        return (
          <group key={i} position={[m.worldX, m.worldY, sceneZ]} rotation={[0.1 * i, 0.2 * i, m.spin * frame * 0.5]}>
            <mesh>
              <icosahedronGeometry args={[m.radius, 1]} />
              <meshStandardMaterial color={0x121a1a} roughness={0.92} metalness={0.08} transparent opacity={alpha} fog />
            </mesh>
            <mesh scale={1.025}>
              <icosahedronGeometry args={[m.radius, 1]} />
              <meshBasicMaterial color={CYAN_HEX} wireframe transparent opacity={alpha * 0.3} blending={THREE.AdditiveBlending} depthWrite={false} />
            </mesh>
          </group>
        );
      })}
    </>
  );
};
