/**
 * The orbital system, in real 3D.
 *
 * The primary orbit is a volumetric tube (not a flat line) revealed by
 * advancing the geometry's draw range along its length, so it genuinely
 * sweeps through space — passing in front of and behind the central
 * body, which occludes it via the depth buffer. A thin bright core tube
 * sits inside a wider faint glow tube for luminous depth without any
 * post-processing.
 *
 * The central body is a dark sphere with a fresnel rim and a soft
 * additive atmosphere, lit by a single fixed instrument-cyan source.
 *
 * Layered context rings share the primary's inclination at other radii,
 * giving the whole thing a ring-system depth. Scene fog quietly darkens
 * the far side for one more depth cue. The camera never moves; a few
 * degrees of yaw on the system itself supplies the parallax.
 */

import { useLayoutEffect, useMemo } from 'react';
import { useCurrentFrame } from 'remotion';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  GLOW_STRENGTH,
  ORBIT_SEMI_MAJOR,
  SLOW_YAW,
  TOTAL_FRAMES,
  TUBE_CORE_RADIUS,
  TUBE_GLOW_RADIUS,
} from '../config';
import { CYAN_CORE_HEX, CYAN_HEX } from '../theme';
import { orbitProgress, settlePulse } from '../timing';
import type { Orbit3D } from '../orbit';
import { TrackingMarkers } from './TrackingMarkers';

function useTube(points: THREE.Vector3[], radius: number, segments: number) {
  return useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.5);
    return new THREE.TubeGeometry(curve, segments, radius, 12, true);
  }, [points, radius, segments]);
}

/** Reveal a closed tube from its start, snapped to whole rings. */
function revealTube(geo: THREE.TubeGeometry, progress: number): void {
  const index = geo.index;
  if (!index) return;
  const radial = 12;
  const perRing = radial * 6;
  const totalRings = index.count / perRing;
  const rings = Math.max(0, Math.min(totalRings, Math.floor(progress * totalRings)));
  geo.setDrawRange(0, rings * perRing);
}

const CameraRig: React.FC = () => {
  const camera = useThree((s) => s.camera);
  useLayoutEffect(() => {
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera]);
  return null;
};

export const OrbitalSystem3D: React.FC<{ orbit: Orbit3D }> = ({ orbit }) => {
  const frame = useCurrentFrame();
  const progress = orbitProgress(frame);
  const pulse = settlePulse(frame);

  const emerge = clamp01((frame - 24) / 120);
  const yaw = (frame / TOTAL_FRAMES) * SLOW_YAW - SLOW_YAW * 0.35;

  const primaryPts = useMemo(
    () => orbit.primary.map((p) => new THREE.Vector3(p[0], p[1], p[2])),
    [orbit],
  );
  const coreGeo = useTube(primaryPts, TUBE_CORE_RADIUS, 512);
  const glowGeo = useTube(primaryPts, TUBE_GLOW_RADIUS, 512);
  revealTube(coreGeo, progress);
  revealTube(glowGeo, progress);

  const ringData = useMemo(
    () =>
      orbit.rings.map((r) => ({
        core: new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(
            r.points.map((p) => new THREE.Vector3(p[0], p[1], p[2])),
            true,
            'catmullrom',
            0.5,
          ),
          320,
          TUBE_CORE_RADIUS * 0.7,
          10,
          true,
        ),
        radius: r.radius,
      })),
    [orbit],
  );

  const coreOpacity = 0.95 * emerge;
  const glowOpacity = 0.11 * GLOW_STRENGTH * emerge * pulse;
  const ringOpacity = 0.13 * clamp01((frame - 90) / 180);

  return (
    <>
      <CameraRig />
      <fog attach="fog" args={[0x000000, 5.6, 11.5]} />

      <group rotation={[0, yaw, 0]}>
        <ambientLight intensity={0.06} color={CYAN_HEX} />
        <pointLight position={[-3.8, 3.4, 4.8]} intensity={1.25} distance={12} color={CYAN_HEX} />

        {/* layered context rings */}
        {ringData.map((r, i) => (
          <mesh
            key={i}
            geometry={r.core}
            rotation={[0, (frame / TOTAL_FRAMES) * (0.12 + i * 0.08) * (i % 2 ? -1 : 1), (frame / TOTAL_FRAMES) * (0.16 + i * 0.06)]}
          >
            <meshBasicMaterial
              color={CYAN_HEX}
              transparent
              opacity={ringOpacity * (i === 1 ? 1.15 : 0.8)}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              fog
            />
          </mesh>
        ))}

        {/* primary orbit — glow then bright core */}
        <mesh geometry={glowGeo}>
          <meshBasicMaterial
            color={CYAN_HEX}
            transparent
            opacity={glowOpacity}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            fog
          />
        </mesh>
        <mesh geometry={coreGeo}>
          <meshBasicMaterial
            color={CYAN_CORE_HEX}
            transparent
            opacity={coreOpacity}
            /* The core writes depth; the body therefore hides the far arc. */
            depthWrite
            depthTest
            blending={THREE.AdditiveBlending}
            fog
          />
        </mesh>

        {/* Two compact inner tracks move at different angular rates. They
            are deliberately dimmer than the primary path, like secondary
            bodies or a resonant debris system, not decorative outlines. */}
        {[0.32, 0.58].map((factor, i) => (
          <mesh
            key={`inner-${i}`}
            rotation={[0, (frame / TOTAL_FRAMES) * (i ? -0.22 : 0.16), (i ? 1 : -1) * 0.08]}
            scale={factor}
          >
            <torusGeometry args={[ORBIT_SEMI_MAJOR, TUBE_CORE_RADIUS * 0.42, 8, 160]} />
            <meshBasicMaterial
              color={CYAN_HEX}
              transparent
              opacity={0.16 * emerge * pulse}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        ))}

        {/* The trace is already complete before the dissolve. Its last
            low-opacity remnant stays physically in the scene for the
            first part of the title transition instead of cutting away. */}
        {frame >= 450 && frame <= 570 && (
          <mesh geometry={coreGeo} rotation={[0, 0, 0]}>
            <meshBasicMaterial
              color={CYAN_HEX}
              transparent
              opacity={0.08 * clamp01(1 - (frame - 510) / 60)}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              fog
            />
          </mesh>
        )}

        <TrackingMarkers markers={orbit.markers} frame={frame} emerge={emerge} pulse={pulse} />
      </group>
    </>
  );
};

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
