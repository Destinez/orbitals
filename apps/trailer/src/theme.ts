/**
 * Palette and type.
 *
 * Three values only, per the brief: pure black, white, and a restrained
 * cyan-green that reads as instrument light rather than neon. Fonts are
 * loaded through @remotion/google-fonts so the render waits for them:
 *
 *   IBM Plex Mono — engineering / archival telemetry (the instrument panel)
 *   Sora          — the elegant, widely-tracked display face (captions,
 *                   the ORBITALS title, and the subtitle)
 */

import { loadFont as loadMono } from '@remotion/google-fonts/IBMPlexMono';
import { loadFont as loadDisplay } from '@remotion/google-fonts/Sora';

export const { fontFamily: MONO_RAW } = loadMono('normal', {
  weights: ['300', '400', '500'],
  subsets: ['latin'],
});

export const { fontFamily: DISPLAY_RAW } = loadDisplay('normal', {
  weights: ['200', '300', '400', '600'],
  subsets: ['latin'],
});

export const MONO = `${MONO_RAW}, 'SFMono-Regular', Menlo, monospace`;
export const DISPLAY = `${DISPLAY_RAW}, 'Helvetica Neue', system-ui, sans-serif`;

export const BLACK = '#000000';
export const WHITE = '#ffffff';

/** Instrument cyan-green, and a near-white variant for luminous cores. */
export const CYAN = '#69f0cf';
export const CYAN_CORE = '#d6fff4';
export const CYAN_DIM = 'rgba(105, 240, 207, 0.55)';
export const CYAN_FAINT = 'rgba(105, 240, 207, 0.22)';

/** Three.js colours (linear-ish hexes are fine; the renderer manages it). */
export const CYAN_HEX = 0x69f0cf;
export const CYAN_CORE_HEX = 0xd6fff4;
export const PLANET_BODY_HEX = 0x04100d;
