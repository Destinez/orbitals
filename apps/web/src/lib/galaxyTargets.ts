import { rgbHue, paletteRGB } from './palettes';
import type { Chapter, StageKind } from '../content/chapters';

/**
 * Uniform targets for the deep-field shader.
 *
 * Declared here rather than alongside the component so that App can read
 * the defaults without statically importing GalaxyField — which would
 * pull ogl into the entry chunk and defeat the lazy import.
 */
export interface GalaxyTargets {
  hueShift: number;
  saturation: number;
  density: number;
  glowIntensity: number;
  twinkleIntensity: number;
  starSpeed: number;
  rotationSpeed: number;
  speed: number;
}

export const DEFAULT_TARGETS: GalaxyTargets = {
  hueShift: 200,
  saturation: 0.15,
  density: 0.9,
  glowIntensity: 0.28,
  twinkleIntensity: 0.35,
  starSpeed: 0.16,
  rotationSpeed: 0.014,
  speed: 0.7,
};

/**
 * Sky tuning per record.
 *
 * One continuous sky whose character changes, rather than eight separate
 * backgrounds. Density is the storytelling dial: the field fills through
 * the survey, steps back as attention narrows onto the plot, blooms at the
 * predicted position, and empties almost completely below five sigma.
 *
 * Two constraints learned from looking at it on screen:
 *
 * Density is kept high and glow low. In this shader density sets the star
 * grid frequency, so a low value produces a handful of enormous flared
 * stars — impressive in isolation, but nothing like the collection's
 * plates, where the background is fine dim points. High density with low
 * glow gives the fine field the artwork actually has.
 *
 * Saturation is capped well below 1. Hue in this shader is derived
 * per-star, so pushing saturation up does not flood the frame with the
 * signal colour, it turns the field into a rainbow that fights the plot.
 * The colour event at the 3:2 lock is carried by a signal-coloured radial
 * wash in the stage instead, with the sky only tinting behind it.
 */

const BASE: Record<StageKind, Omit<GalaxyTargets, 'hueShift'>> = {
  boot: {
    density: 1.4,
    saturation: 0.03,
    glowIntensity: 0.11,
    twinkleIntensity: 0.22,
    starSpeed: 0.09,
    rotationSpeed: 0.005,
    speed: 0.45,
  },
  station: {
    density: 1.8,
    saturation: 0.08,
    glowIntensity: 0.12,
    twinkleIntensity: 0.26,
    starSpeed: 0.12,
    rotationSpeed: 0.008,
    speed: 0.55,
  },
  field: {
    // the survey — the fullest the sky gets
    density: 3,
    saturation: 0.18,
    glowIntensity: 0.16,
    twinkleIntensity: 0.34,
    starSpeed: 0.18,
    rotationSpeed: 0.013,
    speed: 0.75,
  },
  transit: {
    density: 2.4,
    saturation: 0.22,
    glowIntensity: 0.14,
    twinkleIntensity: 0.3,
    starSpeed: 0.15,
    rotationSpeed: 0.011,
    speed: 0.68,
  },
  trace: {
    // the field steps back so the plot carries the frame
    density: 1.7,
    saturation: 0.2,
    glowIntensity: 0.11,
    twinkleIntensity: 0.24,
    starSpeed: 0.11,
    rotationSpeed: 0.007,
    speed: 0.55,
  },
  lock: {
    density: 2.6,
    saturation: 0.45,
    glowIntensity: 0.26,
    twinkleIntensity: 0.4,
    starSpeed: 0.24,
    rotationSpeed: 0.02,
    speed: 1,
  },
  lost: {
    // deep field: this region of sky was unusually empty
    density: 0.7,
    saturation: 0,
    glowIntensity: 0.09,
    twinkleIntensity: 0.12,
    starSpeed: 0.05,
    rotationSpeed: 0.002,
    speed: 0.3,
  },
  archive: {
    density: 1.9,
    saturation: 0.18,
    glowIntensity: 0.12,
    twinkleIntensity: 0.26,
    starSpeed: 0.13,
    rotationSpeed: 0.008,
    speed: 0.6,
  },
};

/** Hue for records with no spectral class (cold open, signal lost). */
const NEUTRAL_HUE = 205;

export function galaxyTargetsFor(chapter: Chapter): GalaxyTargets {
  const base = BASE[chapter.stage];
  const hueShift = chapter.spectral
    ? rgbHue(paletteRGB(chapter.spectral))
    : NEUTRAL_HUE;
  return { ...base, hueShift };
}

/** Ink for a record's L1/L2 layers. Ice white where there is no class. */
export function inkForChapter(chapter: Chapter): readonly [number, number, number] {
  return chapter.spectral ? paletteRGB(chapter.spectral) : [235, 245, 255];
}
