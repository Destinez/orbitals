/**
 * Palette table transcribed from `packages/generator/src/orbitalPreview.js`.
 * These RGB triplets are the collection's actual ink. Do not tweak them
 * to taste: the site's colour must match the plates it describes.
 */

export type RGB = readonly [number, number, number];

/** Standard palettes — the everyday look across the survey. */
export const PALETTES = {
  ion: [80, 200, 255],
  solar: [255, 160, 40],
  nebula: [220, 80, 255],
  emerald: [60, 255, 160],
} as const satisfies Record<string, RGB>;

/** Reserved for confirmed 2:3 / 3:2 "Coherent" lock tokens only. */
export const NEON_PALETTES = {
  laser_magenta: [255, 40, 220],
  electric_lime: [170, 255, 40],
  plasma_red: [255, 50, 60],
  ultraviolet: [140, 60, 255],
} as const satisfies Record<string, RGB>;

/** The 1/1 Signal Lost piece uses a reserved ice white, used nowhere else. */
export const SIGNAL_LOST_COLOR: RGB = [235, 245, 255];

/** Exact art background: rgb(4,5,10). Verified by pixel sample. */
export const BG_COLOR: RGB = [4, 5, 10];

export const PALETTE_NAMES = Object.keys(PALETTES) as PaletteName[];
export const NEON_PALETTE_NAMES = Object.keys(
  NEON_PALETTES,
) as NeonPaletteName[];

export type PaletteName = keyof typeof PALETTES;
export type NeonPaletteName = keyof typeof NEON_PALETTES;
export type AnyPaletteName = PaletteName | NeonPaletteName;

const ALL: Record<string, RGB> = { ...PALETTES, ...NEON_PALETTES };

export function paletteRGB(name: AnyPaletteName): RGB {
  return ALL[name] ?? PALETTES.ion;
}

/** Human-readable Spectral Class, matching metadataBuilder.js. */
export const PALETTE_DISPLAY: Record<string, string> = {
  ion: 'Ion',
  solar: 'Solar',
  nebula: 'Nebula',
  emerald: 'Emerald',
  laser_magenta: 'Laser Magenta',
  electric_lime: 'Electric Lime',
  plasma_red: 'Plasma Red',
  ultraviolet: 'Ultraviolet',
};

/** The `Faded / Archival` transform from the generator. */
export function fade(color: RGB): RGB {
  return color.map((v) => Math.round(v * 0.55 + 60)) as unknown as RGB;
}

export function rgbCss(c: RGB, alpha = 1): string {
  return alpha >= 1
    ? `rgb(${c[0]} ${c[1]} ${c[2]})`
    : `rgb(${c[0]} ${c[1]} ${c[2]} / ${alpha})`;
}

export function rgbHex(c: RGB): string {
  return (
    '#' +
    c.map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('')
  );
}

/**
 * Hue angle in degrees, used to drive the deep-field shader's uHueShift
 * so the global sky tracks the active chapter's spectral class.
 */
export function rgbHue(c: RGB): number {
  const r = c[0] / 255;
  const g = c[1] / 255;
  const b = c[2] / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 0;
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h *= 60;
  return h < 0 ? h + 360 : h;
}
