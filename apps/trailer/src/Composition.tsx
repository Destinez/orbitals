/**
 * Active 20-second orbital observation composition.
 *
 * The scene is split into a deterministic WebGL orbital system and DOM
 * instrumentation. ThreeCanvas advances one exact frame at a time for
 * Remotion, allowing the orbital tubes, sphere, debris and stars to use
 * the depth buffer while the camera remains fixed.
 */

import React, { useMemo } from 'react';
import { ThreeCanvas } from '@remotion/three';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { buildOrbit3D } from './orbit';
import {
  CAMERA_FOV,
  CAMERA_POSITION,
  CAMERA_TARGET,
  HEIGHT,
  WIDTH,
} from './config';
import {
  COMPLETE_END,
  ENDING_FROM,
  SCENE_FADE,
  SETTLE_END,
  settlePulse,
  orbitProgress,
} from './timing';
import { BLACK } from './theme';
import { AudioBed } from './components/AudioBed';
import { Debris3D } from './components/Debris3D';
import { EndingSequence } from './EndingSequence';
import { OrbitalSystem3D } from './components/OrbitalSystem3D';
import { SpaceField } from './components/SpaceField';
import { StationInterface } from './components/StationInterface';
import { TelemetryText } from './components/TelemetryText';

export type TrailerProps = { seed: string };

export function ResonanceTrailer({ seed }: TrailerProps) {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const orbit = useMemo(() => buildOrbit3D(seed), [seed]);
  const progress = orbitProgress(frame);
  const pulse = settlePulse(frame);

  const sceneOpacity = interpolate(frame, SCENE_FADE, [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const interfaceOpacity = interpolate(frame, [24, 90, 500, 540], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const fieldOpacity = interpolate(frame, [0, 70, 470, 540], [0.35, 1, 1, 0.3], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const debrisOpacity = interpolate(frame, [90, 250, 450, 540], [0, 0.18, 0.62, 0.12], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor: BLACK, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, opacity: sceneOpacity }}>
        <ThreeCanvas
          width={width || WIDTH}
          height={height || HEIGHT}
          camera={{
            fov: CAMERA_FOV,
            position: CAMERA_POSITION,
            near: 0.1,
            far: 50,
          }}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          onCreated={({ camera }) => camera.lookAt(...CAMERA_TARGET)}
          style={{ position: 'absolute', inset: 0 }}
        >
          <color attach="background" args={['#000000']} />
          <SpaceField seed={seed} opacity={fieldOpacity} />
          <Debris3D seed={seed} opacity={debrisOpacity} />
          <OrbitalSystem3D orbit={orbit} />
        </ThreeCanvas>

        <StationInterface
          opacity={interfaceOpacity}
          frame={frame}
          progress={progress}
          inclinationDeg={orbit.inclinationDeg}
          ratioLabel={orbit.ratioLabel}
          eccentricity={orbit.eccentricity}
        />
        <TelemetryText opacity={interfaceOpacity * 0.72} frame={frame} progress={progress} />
      </div>

      <EndingSequence startFrame={ENDING_FROM} />
      <AudioBed />
    </AbsoluteFill>
  );
}
