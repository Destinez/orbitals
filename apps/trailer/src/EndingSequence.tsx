/**
 * Ending — dissolve to black, resolve the wordmark, hold the title.
 *
 * A black backdrop fades in over the last of the orbital dissolve so the
 * scene falls cleanly into darkness with no hard cut. The word-shuffle
 * resolves to ORBITALS, then the subtitle settles beneath it. The final
 * frame is pure black with the title optically centred and generous
 * negative space — no orbital illustration behind it.
 */

import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { CYAN_DIM, DISPLAY, WHITE } from './theme';
import { TitleTransition } from './components/TitleTransition';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export const EndingSequence: React.FC<{ startFrame: number }> = ({ startFrame }) => {
  const frame = useCurrentFrame();
  const localFrame = Math.max(0, frame - startFrame);

  const backdrop = interpolate(localFrame, [0, 46], [0, 1], clamp);
  const subtitleOpacity = interpolate(localFrame, [66, 88], [0, 1], clamp);
  const subtitleY = interpolate(localFrame, [66, 88], [8, 0], { ...clamp, easing: (t) => 1 - Math.pow(1 - t, 3) });

  return (
    <AbsoluteFill style={{ backgroundColor: `rgba(0,0,0,${backdrop})` }}>
      <AbsoluteFill
  style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  }}>
        <TitleTransition frame={localFrame} />
        <div
          style={{
            marginTop: 30,
            opacity: subtitleOpacity,
            transform: `translateY(${subtitleY}px)`,
            fontFamily: DISPLAY,
            fontWeight: 300,
            fontSize: 22,
            letterSpacing: 6,
            color: WHITE,
          }}
        >
          <span style={{ opacity: 0.55 }}>Coming soon to </span>
          <span style={{ opacity: 0.85 }}>Robinhood</span>
        </div>
      </AbsoluteFill>

      {/* one faint registration hairline, extremely subtle */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          bottom: 96,
          width: 1,
          height: 28,
          transform: 'translateX(-50%)',
          background: CYAN_DIM,
          opacity: subtitleOpacity * 0.4,
        }}
      />
    </AbsoluteFill>
  );
};
