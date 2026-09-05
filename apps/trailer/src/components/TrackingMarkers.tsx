/**
 * Tracking markers — small observation reticles placed on the orbit.
 *
 * Each appears at the exact frame the trace reaches its position (the
 * draw curve is inverted for this), blooms briefly, then settles to a
 * quiet glow. Shapes stay in the collection's vocabulary — a ring, a
 * small four-point star, a plotted point — and read as logged
 * observations rather than UI. They are additive and depth-tested, so
 * the central body occludes any that sit behind it.
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import { CYAN_CORE_HEX, CYAN_HEX } from '../theme';
import { frameForProgress } from '../timing';
import type { OrbitMarker } from '../orbit';

const SIZE = 0.11;

function ease(age: number): { scale: number; opacity: number; halo: number } {
  if (age < 0) return { scale: 0, opacity: 0, halo: 0 };
  const appear = Math.min(1, age / 8);
  const settle = Math.min(1, Math.max(0, (age - 8) / 12));
  const opacity = appear * (1 - 0.5 * settle);
  const scale = 1.9 - 0.9 * Math.min(1, age / 9);
  const halo = Math.max(0, 1 - age / 16);
  return { scale, opacity, halo };
}

const BLEND = THREE.AdditiveBlending as THREE.Blending;

const Ring: React.FC<{ o: number }> = ({ o }) => (
  <mesh>
    <torusGeometry args={[SIZE, SIZE * 0.14, 8, 40]} />
    <meshBasicMaterial color={CYAN_HEX} transparent opacity={o} depthWrite={false} blending={BLEND} />
  </mesh>
);

const Star: React.FC<{ o: number }> = ({ o }) => {
  const arm = SIZE * 1.5;
  const w = SIZE * 0.09;
  return (
    <group>
      <mesh>
        <boxGeometry args={[arm * 2, w, w]} />
        <meshBasicMaterial color={CYAN_CORE_HEX} transparent opacity={o} depthWrite={false} blending={BLEND} />
      </mesh>
      <mesh>
        <boxGeometry args={[w, arm * 2, w]} />
        <meshBasicMaterial color={CYAN_CORE_HEX} transparent opacity={o} depthWrite={false} blending={BLEND} />
      </mesh>
    </group>
  );
};

const Point: React.FC<{ o: number }> = ({ o }) => (
  <group>
    <mesh>
      <sphereGeometry args={[SIZE * 0.28, 16, 16]} />
      <meshBasicMaterial color={CYAN_CORE_HEX} transparent opacity={o} depthWrite={false} blending={BLEND} />
    </mesh>
    <mesh>
      <torusGeometry args={[SIZE * 0.7, SIZE * 0.06, 6, 32]} />
      <meshBasicMaterial color={CYAN_HEX} transparent opacity={o * 0.8} depthWrite={false} blending={BLEND} />
    </mesh>
  </group>
);

interface Props {
  markers: OrbitMarker[];
  frame: number;
  emerge: number;
  pulse: number;
}

export const TrackingMarkers: React.FC<Props> = ({ markers, frame, emerge, pulse }) => {
  const crossings = useMemo(() => markers.map((m) => frameForProgress(m.at)), [markers]);

  return (
    <>
      {markers.map((m, i) => {
        const age = frame - crossings[i];
        const { scale, opacity, halo } = ease(age);
        if (opacity <= 0 && halo <= 0) return null;
        const o = opacity * emerge * pulse;
        return (
          <group key={i} position={m.position}>
            <group scale={scale}>
              {m.kind === 'ring' && <Ring o={o} />}
              {m.kind === 'star' && <Star o={o} />}
              {m.kind === 'point' && <Point o={o} />}
            </group>
            {halo > 0 && (
              <mesh scale={1 + (1 - halo) * 3.2}>
                <torusGeometry args={[SIZE * 0.9, SIZE * 0.05, 6, 40]} />
                <meshBasicMaterial color={CYAN_HEX} transparent opacity={halo * 0.5 * emerge} depthWrite={false} blending={BLEND} />
              </mesh>
            )}
          </group>
        );
      })}
    </>
  );
};
