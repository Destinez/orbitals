/**
 * Word-shuffle resolve to ORBITALS.
 *
 * Eight slots settle left-to-right. Before a slot locks it cycles
 * through a curated pool of letters; on lock it eases to its final glyph
 * as blur and vertical jitter resolve to zero. The staggered locking
 * reads as controlled typographic permutation, not a terminal glitch.
 * Deterministic: the shown letter is a pure function of the frame.
 */

import React from 'react';
import { useCurrentFrame } from 'remotion';
import { CYAN, DISPLAY, WHITE } from '../theme';

const TARGET = 'ORBITALS';
const POOL = 'ORBITALSNVEHCUMDGPXKF';

const APPEAR = 8;
const LOCK0 = 24;
const STAGGER = 5;
const SETTLE = 7;

function slotState(i: number, frame: number) {
  const lockAt = LOCK0 + i * STAGGER;
  const appearAt = APPEAR + i * 2;
  const locked = frame >= lockAt;

  let letter: string;
  if (locked) {
    letter = TARGET[i];
  } else {
    const step = Math.floor(frame / 2) + i * 3;
    letter = POOL[(step * 7 + i * 13) % POOL.length];
  }

  const appear = clamp01((frame - appearAt) / 10);
  const sinceLock = frame - lockAt;
  const settle = clamp01(sinceLock / SETTLE);
  const blur = locked ? (1 - settle) * 5 : 5;
  const jitter = locked ? (1 - settle) * 4 * Math.sin(frame + i) : 3.2 * Math.sin(frame * 0.8 + i * 2);
  const opacity = locked ? 0.35 + 0.65 * settle : appear * 0.55;

  return { letter, blur, jitter, opacity };
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export const TitleTransition: React.FC<{ size?: number; frame?: number }> = ({ size = 104, frame: frameProp }) => {
  const currentFrame = useCurrentFrame();
  const frame = frameProp ?? currentFrame;
  const allLockedAt = LOCK0 + (TARGET.length - 1) * STAGGER + SETTLE;
  const settleScale = 1.03 - 0.03 * clamp01(frame / allLockedAt);

  return (
    <div
      style={{
        display: 'flex',
        transform: `scale(${settleScale})`,
        fontFamily: DISPLAY,
        fontWeight: 300,
        fontSize: size,
        letterSpacing: '0.02em',
        color: WHITE,
      }}
    >
      {TARGET.split('').map((_, i) => {
        const { letter, blur, jitter, opacity } = slotState(i, frame);
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              width: size * 0.72,
              textAlign: 'center',
              opacity,
              filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : 'none',
              transform: `translateY(${jitter.toFixed(2)}px)`,
              textShadow: `0 0 18px rgba(105,240,207,0.35), 0 0 42px rgba(105,240,207,0.15)`,
              color: frame >= LOCK0 + i * STAGGER ? WHITE : CYAN,
            }}
          >
            {letter}
          </span>
        );
      })}
    </div>
  );
};
