/**
 * Audio bed.
 *
 * The waveform is synthesised offline by `scripts/make-audio.mjs` and
 * committed as a static asset, so the render has no runtime audio
 * dependency and every render is bit-identical. Regenerate with
 * `npm run audio`.
 *
 * Content: a slow sonar ping that tightens as the trace accelerates, a
 * sub-bass tone building underneath it, both settling into a sustained
 * presence for the hold.
 */

import { Audio, interpolate, staticFile, useCurrentFrame } from 'remotion';

export const AUDIO_FILE = 'telemetry.wav';

export const AudioBed: React.FC = () => {
  const frame = useCurrentFrame();
  const volume = interpolate(frame, [504, 570, 600], [1, 0.12, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return <Audio src={staticFile(AUDIO_FILE)} volume={volume} />;
};
