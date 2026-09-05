/**
 * All timing, frame-based at 30 fps over 600 frames (20s). Phases follow
 * the brief:
 *
 *   0   – 120   (0–4s)    emergence; almost nothing, a faint fragment
 *   120 – 330   (4–11s)   the trace accelerates, depth builds
 *   330 – 450   (11–15s)  rapid completion — the orbit MUST finish here
 *   450 – 510   (15–17s)  the completed system settles, subtle pulse
 *   510 – 600   (17–20s)  dissolve to black; words resolve to ORBITALS
 *
 * The reveal is a piecewise cubic Hermite with tangents matched at the
 * joints so the trace never stalls. It reaches exactly 1.0 at frame 450
 * and holds — completion is guaranteed before the ending.
 */

import { FPS } from './config';

export const EMERGE_END = 120;
export const SWEEP_END = 330;
export const COMPLETE_END = 450;
export const SETTLE_END = 510;

/** Scene dissolve and ending. */
export const SCENE_FADE: [number, number] = [512, 566];
export const ENDING_FROM = 504;

const P_EMERGE = 0.05;
const P_SWEEP = 0.6;

// Matched tangents (per unit segment time):
//   0.142857/120 == 0.25/210   and   1.3/210 == 0.742857/120
// M_EMERGE_OUT is held <= 0.15 so the tiny emergence rise never dips
// below zero (a negative would read as the trace un-drawing).
const M_EMERGE_OUT = 0.142857;
const M_SWEEP_IN = 0.25;
const M_SWEEP_OUT = 1.3;
const M_COMPLETE_IN = 0.742857;

function hermite(u: number, p0: number, p1: number, m0: number, m1: number): number {
  const u2 = u * u;
  const u3 = u2 * u;
  return (
    (2 * u3 - 3 * u2 + 1) * p0 +
    (u3 - 2 * u2 + u) * m0 +
    (-2 * u3 + 3 * u2) * p1 +
    (u3 - u2) * m1
  );
}

/** 0..1 fraction of the primary orbit that exists at this frame. */
export function orbitProgress(frame: number): number {
  if (frame <= 0) return 0;
  if (frame >= COMPLETE_END) return 1;

  if (frame <= EMERGE_END) {
    return hermite(frame / EMERGE_END, 0, P_EMERGE, 0, M_EMERGE_OUT);
  }
  if (frame <= SWEEP_END) {
    const span = SWEEP_END - EMERGE_END;
    return hermite((frame - EMERGE_END) / span, P_EMERGE, P_SWEEP, M_SWEEP_IN, M_SWEEP_OUT);
  }
  const span = COMPLETE_END - SWEEP_END;
  return hermite((frame - SWEEP_END) / span, P_SWEEP, 1, M_COMPLETE_IN, 0);
}

/** Exact frame the trace reaches a given fraction — for marker timing. */
export function frameForProgress(target: number): number {
  if (target <= 0) return 0;
  if (target >= 1) return COMPLETE_END;
  let lo = 0;
  let hi = COMPLETE_END;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (orbitProgress(mid) < target) lo = mid + 1;
    else hi = mid;
  }
  const prev = Math.max(0, lo - 1);
  const a = orbitProgress(prev);
  const b = orbitProgress(lo);
  return b === a ? lo : prev + (target - a) / (b - a);
}

/** Slow luminosity pulse once the system is complete. */
export function settlePulse(frame: number): number {
  if (frame <= COMPLETE_END) return 1;
  const t = (frame - COMPLETE_END) / (FPS * 6);
  return 1 + 0.08 * Math.sin(t * Math.PI * 2);
}
