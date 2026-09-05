/**
 * Browser port of `packages/generator/src/orbitalPreview.js`.
 *
 * ── Why two rasterization paths ──────────────────────────────────────
 * `paramsFromSeed` and the curve evaluators below are byte-faithful
 * ports, so geometry and traits derived here match the minted plate for
 * any given seed. Rasterization is deliberately split in two:
 *
 *   renderPlateToImageData()  Faithful additive pixel blending + bloom,
 *                             identical output to the PNG. ~260k pixel
 *                             ops for the bloom pass alone, so it runs
 *                             once and gets cached — never per frame.
 *
 *   traceGeometry()           Emits the same curve as a flat point
 *                             array for GPU-accelerated Canvas2D
 *                             drawing. Used by the scroll-scrubbed hero
 *                             where we need 60fps and a partial draw.
 *
 * Same geometry, different rasterizer, chosen per use case.
 */

import { createPRNG, randFloat, randInt, type Rand } from './prng';
import { lutCos, lutSin, TWO_PI } from './trig';
import {
  BG_COLOR,
  NEON_PALETTES,
  PALETTES,
  PALETTE_NAMES,
  NEON_PALETTE_NAMES,
  SIGNAL_LOST_COLOR,
  fade,
  type AnyPaletteName,
  type RGB,
} from './palettes';

export const OUT_SIZE = 512;
export const STEPS = 4000;

export type CurveFamily = 'spirograph' | 'harmonograph';
export type SignalResolution = 'full' | 'high' | 'standard' | 'low';

export interface ResonanceParams {
  fx: number;
  /** integer fy plus a tiny detune — the reason traces never quite close */
  fy: number;
  fyInt: number;
  phase: number;
  damping: number;
  paletteName: AnyPaletteName;
  isCoherent: boolean;
  isBinaryLock: boolean;
  isDeepField: boolean;
  starCount: number;
  isSpectralSplit: boolean;
  splitAmount: number;
  signalResolution: SignalResolution;
  isInstrumentDrift: boolean;
  driftAmount: number;
  isFaded: boolean;
  curveFamily: CurveFamily;
  spiroR: number;
  spiroRatio: number;
  spiroD: number;
  /** the live PRNG, positioned exactly where the renderer expects it */
  rand: Rand;
}

/** Faithful port of paramsFromSeed(). PRNG draw order is load-bearing. */
export function paramsFromSeed(seed: string | number): ResonanceParams {
  const rand = createPRNG(seed);
  const fx = randInt(rand, 2, 7);
  const fyInt = randInt(rand, 2, 7);
  const detune = randFloat(rand, -0.004, 0.004);
  const phase = randFloat(rand, 0, TWO_PI);
  const damping = randFloat(rand, 0.00008, 0.0003);

  const curveFamily: CurveFamily =
    rand() < 0.45 ? 'spirograph' : 'harmonograph';
  // Drawn unconditionally (cheap) so the PRNG stream stays the same
  // length regardless of which family renders.
  const spiroR = randInt(rand, 3, 11);
  const spiroRatio = randInt(rand, 3, 8);
  const spiroD = randFloat(rand, 0.4, 1.3);

  const isCoherent = (fx === 2 && fyInt === 3) || (fx === 3 && fyInt === 2);
  const isBinaryLock = fx === fyInt && !isCoherent;

  let paletteName: AnyPaletteName;
  if (isCoherent) {
    paletteName = NEON_PALETTE_NAMES[
      Math.floor(rand() * NEON_PALETTE_NAMES.length)
    ];
  } else {
    paletteName = PALETTE_NAMES[Math.floor(rand() * PALETTE_NAMES.length)];
  }

  const starCount = randInt(rand, 80, 160);
  const isDeepField = starCount < 95;

  const isSpectralSplit = rand() < 0.12;
  const splitAmount = isSpectralSplit ? randInt(rand, 1, 3) : 0;

  const resRoll = rand();
  let signalResolution: SignalResolution;
  if (resRoll < 0.1) signalResolution = 'full';
  else if (resRoll < 0.35) signalResolution = 'high';
  else if (resRoll < 0.75) signalResolution = 'standard';
  else signalResolution = 'low';

  const isInstrumentDrift = rand() < 0.15;
  const driftAmount = isInstrumentDrift ? randFloat(rand, 0.5, 1.8) : 0;

  const isFaded = rand() < 0.1;

  return {
    fx,
    fy: fyInt + detune,
    fyInt,
    phase,
    damping,
    paletteName,
    isCoherent,
    isBinaryLock,
    isDeepField,
    starCount,
    isSpectralSplit,
    splitAmount,
    signalResolution,
    isInstrumentDrift,
    driftAmount,
    isFaded,
    curveFamily,
    spiroR,
    spiroRatio,
    spiroD,
    rand,
  };
}

export const RES_SPACING: Record<SignalResolution, number> = {
  full: 1,
  high: 2,
  standard: 3,
  low: 5,
};

/** Ink for a token, after the Faded transform. */
export function inkFor(p: ResonanceParams): RGB {
  const base = p.isCoherent
    ? NEON_PALETTES[p.paletteName as keyof typeof NEON_PALETTES]
    : PALETTES[p.paletteName as keyof typeof PALETTES];
  return p.isFaded ? fade(base) : base;
}

/**
 * Evaluate the curve at `step`. Exact formulas from the generator.
 * Deliberately allocation-free — writes into the passed tuple.
 */
export function curvePoint(
  p: ResonanceParams,
  step: number,
  cx: number,
  cy: number,
  radius: number,
  out: [number, number],
): [number, number] {
  const t = step * 0.035;
  const decay = Math.exp(-p.damping * step);

  if (p.curveFamily === 'spirograph') {
    // Hypotrochoid: small circle radius r rolling inside fixed circle R,
    // tracing a point at distance d. Same curve family as Ptolemaic
    // epicycles, which is why it sits inside the collection's lore.
    const rr = p.spiroR;
    const bigR = rr * p.spiroRatio;
    const diff = bigR - rr;
    const scale = (radius * decay) / bigR;
    out[0] =
      cx + scale * (diff * lutCos(t) + p.spiroD * rr * lutCos((diff / rr) * t + p.phase));
    out[1] =
      cy + scale * (diff * lutSin(t) - p.spiroD * rr * lutSin((diff / rr) * t + p.phase));
  } else {
    out[0] = cx + radius * decay * lutSin(p.fx * t + p.phase);
    out[1] = cy + radius * decay * lutCos(p.fy * t);
  }
  return out;
}

export interface TraceGeometry {
  /** interleaved x,y in a 0..size box */
  points: Float32Array;
  steps: number;
  size: number;
  params: ResonanceParams;
  ink: RGB;
  /** indices (into steps) that carry a glyph, given Signal Resolution */
  glyphSpacing: number;
}

/**
 * Flat point array for the fast Canvas2D path. Note this intentionally
 * does NOT apply Instrument Drift jitter, because drift consumes the
 * shared PRNG per-step and we need this callable without disturbing a
 * params object that may be reused. Drift is a sub-pixel effect that
 * reads as noise at display scale; the faithful path still applies it.
 */
export function traceGeometry(
  seed: string | number,
  size = OUT_SIZE,
  steps = STEPS,
): TraceGeometry {
  const params = paramsFromSeed(seed);
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.38;
  const points = new Float32Array(steps * 2);
  const tmp: [number, number] = [0, 0];

  for (let s = 0; s < steps; s++) {
    curvePoint(params, s, cx, cy, radius, tmp);
    points[s * 2] = tmp[0];
    points[s * 2 + 1] = tmp[1];
  }

  return {
    points,
    steps,
    size,
    params,
    ink: inkFor(params),
    glyphSpacing: RES_SPACING[params.signalResolution],
  };
}

/* ───────────────────────── faithful rasterizer ─────────────────────── */

interface Buf {
  width: number;
  height: number;
  data: Uint8ClampedArray<ArrayBuffer>;
}

function setBlend(
  buf: Buf,
  x: number,
  y: number,
  r: number,
  g: number,
  b: number,
  alpha: number,
): void {
  if (x < 0 || x >= buf.width || y < 0 || y >= buf.height) return;
  const idx = (y * buf.width + x) * 4;
  buf.data[idx] = Math.min(255, buf.data[idx] + r * alpha);
  buf.data[idx + 1] = Math.min(255, buf.data[idx + 1] + g * alpha);
  buf.data[idx + 2] = Math.min(255, buf.data[idx + 2] + b * alpha);
}

function drawStar(
  buf: Buf,
  cx: number,
  cy: number,
  color: RGB,
  size: number,
  alpha: number,
): void {
  const [r, g, b] = color;
  for (let i = -size; i <= size; i++) {
    const falloff = 1 - Math.abs(i) / (size + 1);
    for (let w = -1; w <= 1; w++) {
      setBlend(buf, cx + i, cy + w, r, g, b, alpha * falloff * (w === 0 ? 1 : 0.5));
      setBlend(buf, cx + w, cy + i, r, g, b, alpha * falloff * (w === 0 ? 1 : 0.5));
    }
  }
  const diag = Math.round(size * 0.45);
  for (let i = -diag; i <= diag; i++) {
    const falloff = (1 - Math.abs(i) / (diag + 1)) * 0.5;
    setBlend(buf, cx + i, cy + i, r, g, b, alpha * falloff);
    setBlend(buf, cx + i, cy - i, r, g, b, alpha * falloff);
  }
}

function drawRing(
  buf: Buf,
  cx: number,
  cy: number,
  color: RGB,
  radius: number,
  alpha: number,
): void {
  const [r, g, b] = color;
  const steps = 20;
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * TWO_PI;
    const x = Math.round(cx + radius * lutCos(t));
    const y = Math.round(cy + radius * lutSin(t));
    setBlend(buf, x, y, r, g, b, alpha);
    setBlend(buf, x + 1, y, r, g, b, alpha * 0.6);
    setBlend(buf, x, y + 1, r, g, b, alpha * 0.6);
  }
}

function drawDoubleRing(
  buf: Buf,
  cx: number,
  cy: number,
  color: RGB,
  alpha: number,
): void {
  drawRing(buf, cx, cy, color, 3, alpha);
  drawRing(buf, cx, cy, color, 6, alpha * 0.7);
}

function drawFigureEight(
  buf: Buf,
  cx: number,
  cy: number,
  color: RGB,
  alpha: number,
): void {
  const [r, g, b] = color;
  const steps = 24;
  const lobe = 5;
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * TWO_PI;
    const x1 = Math.round(cx + lobe * lutSin(t));
    const y1 = Math.round(cy + lobe * lutSin(t) * lutCos(t));
    setBlend(buf, x1, y1, r, g, b, alpha);
    setBlend(buf, x1 + 1, y1, r, g, b, alpha * 0.5);
  }
}

function drawCross(
  buf: Buf,
  cx: number,
  cy: number,
  color: RGB,
  alpha: number,
): void {
  const [r, g, b] = color;
  setBlend(buf, cx, cy, r, g, b, alpha);
  setBlend(buf, cx - 1, cy, r, g, b, alpha * 0.7);
  setBlend(buf, cx + 1, cy, r, g, b, alpha * 0.7);
  setBlend(buf, cx, cy - 1, r, g, b, alpha * 0.7);
  setBlend(buf, cx, cy + 1, r, g, b, alpha * 0.7);
  setBlend(buf, cx - 2, cy, r, g, b, alpha * 0.3);
  setBlend(buf, cx + 2, cy, r, g, b, alpha * 0.3);
  setBlend(buf, cx, cy - 2, r, g, b, alpha * 0.3);
  setBlend(buf, cx, cy + 2, r, g, b, alpha * 0.3);
}

function drawDot(
  buf: Buf,
  cx: number,
  cy: number,
  color: RGB,
  alpha: number,
): void {
  setBlend(buf, cx, cy, color[0], color[1], color[2], alpha);
}

function drawTrail(
  buf: Buf,
  px: number,
  py: number,
  color: RGB,
  alpha: number,
): void {
  const [r, g, b] = color;
  setBlend(buf, px, py, r, g, b, alpha);
  setBlend(buf, px + 1, py, r, g, b, alpha * 0.4);
  setBlend(buf, px, py + 1, r, g, b, alpha * 0.4);
}

function applyBloom(buf: Buf, bgColor: RGB, strength = 0.22): void {
  const w = buf.width;
  const h = buf.height;
  const blockSize = 4;
  const bw = Math.ceil(w / blockSize);
  const bh = Math.ceil(h / blockSize);
  const blurR = new Float64Array(bw * bh);
  const blurG = new Float64Array(bw * bh);
  const blurB = new Float64Array(bw * bh);

  for (let by = 0; by < bh; by++) {
    for (let bx = 0; bx < bw; bx++) {
      let sr = 0;
      let sg = 0;
      let sb = 0;
      let count = 0;
      for (let dy = 0; dy < blockSize; dy++) {
        for (let dx = 0; dx < blockSize; dx++) {
          const x = bx * blockSize + dx;
          const y = by * blockSize + dy;
          if (x >= w || y >= h) continue;
          const idx = (y * w + x) * 4;
          sr += buf.data[idx];
          sg += buf.data[idx + 1];
          sb += buf.data[idx + 2];
          count++;
        }
      }
      blurR[by * bw + bx] = sr / count;
      blurG[by * bw + bx] = sg / count;
      blurB[by * bw + bx] = sb / count;
    }
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const bx = Math.floor(x / blockSize);
      const by = Math.floor(y / blockSize);
      const idx = (y * w + x) * 4;
      const br = blurR[by * bw + bx];
      const bg = blurG[by * bw + bx];
      const bb = blurB[by * bw + bx];
      buf.data[idx] = Math.min(255, buf.data[idx] + Math.max(0, br - bgColor[0]) * strength);
      buf.data[idx + 1] = Math.min(255, buf.data[idx + 1] + Math.max(0, bg - bgColor[1]) * strength);
      buf.data[idx + 2] = Math.min(255, buf.data[idx + 2] + Math.max(0, bb - bgColor[2]) * strength);
    }
  }
}

/** Set alpha from pixel brightness so transparent overlays composite cleanly. */
function applyOverlayAlpha(buf: Buf): void {
  for (let i = 0; i < buf.data.length; i += 4) {
    const lum = Math.max(buf.data[i], buf.data[i + 1], buf.data[i + 2]);
    buf.data[i + 3] = lum > 6 ? Math.min(255, Math.round(lum * 1.08 + 12)) : 0;
  }
}

export interface PlateOptions {
  /** set to the collection's reserved 1/1 id to render the Signal Lost piece */
  isSignalLost?: boolean;
  size?: number;
  /** 0..1, limits the faithful renderer to this portion of the path */
  progress?: number;
  /** use another seed's ink without changing geometry or traits */
  colorSeed?: string | number;
  /** Omit the plate bg + starfield so the site void can show through. */
  background?: 'plate' | 'transparent';
}

/**
 * Faithful render. Returns raw RGBA suitable for `new ImageData(...)` in
 * the browser or PNG encoding in Node. Byte-identical to the minted
 * plate for the same seed at size 512.
 */
export function renderPlateRGBA(
  seed: string | number,
  opts: PlateOptions = {},
): { data: Uint8ClampedArray<ArrayBuffer>; size: number; params: ResonanceParams } {
  const size = opts.size ?? OUT_SIZE;
  const params = paramsFromSeed(seed);
  const {
    fx, fy, phase, damping, isCoherent, isBinaryLock, rand,
    isSpectralSplit, splitAmount, signalResolution,
    isInstrumentDrift, driftAmount, curveFamily, spiroR, spiroRatio, spiroD,
    starCount,
  } = params;

  const drawColor = opts.colorSeed === undefined
    ? inkFor(params)
    : inkFor(paramsFromSeed(opts.colorSeed));
  const buf: Buf = { width: size, height: size, data: new Uint8ClampedArray(size * size * 4) };
  const overlay = opts.background === 'transparent';
  for (let i = 0; i < buf.data.length; i += 4) {
    if (overlay) {
      buf.data[i + 3] = 0;
    } else {
      buf.data[i] = BG_COLOR[0];
      buf.data[i + 1] = BG_COLOR[1];
      buf.data[i + 2] = BG_COLOR[2];
      buf.data[i + 3] = 255;
    }
  }

  if (!overlay) {
    const starColor: RGB = [255, 255, 255];
    for (let i = 0; i < starCount; i++) {
      const x = Math.floor(rand() * size);
      const y = Math.floor(rand() * size);
      const dim = 0.15 + rand() * 0.35;
      drawDot(buf, x, y, starColor, dim);
    }
  }

  if (opts.isSignalLost) {
    // The one moment the signal briefly resolves — a short, dense,
    // bright fragment — before dissolving into unrelated static.
    const flash = SIGNAL_LOST_COLOR;
    const resolveSteps = 70;
    const fcx = size / 2;
    const fcy = size / 2;
    const fradius = size * 0.38;

    for (let step = 0; step < resolveSteps; step++) {
      const t = step * 0.035;
      const decay = Math.exp(-damping * step);
      const px = Math.round(fcx + fradius * decay * lutSin(fx * t + phase));
      const py = Math.round(fcy + fradius * decay * lutCos(fy * t));
      drawTrail(buf, px, py, flash, 1.0);
      drawTrail(buf, px + 1, py, flash, 0.7);
      drawTrail(buf, px, py + 1, flash, 0.7);
      drawTrail(buf, px - 1, py, flash, 0.5);
      drawTrail(buf, px, py - 1, flash, 0.5);
      if (step % 5 === 0) drawStar(buf, px, py, flash, 4, 0.9);
    }
    const cutStep = resolveSteps - 1;
    const cutT = cutStep * 0.035;
    const cutDecay = Math.exp(-damping * cutStep);
    const cutX = Math.round(fcx + fradius * cutDecay * lutSin(fx * cutT + phase));
    const cutY = Math.round(fcy + fradius * cutDecay * lutCos(fy * cutT));
    drawStar(buf, cutX, cutY, flash, 7, 1.0);
    drawRing(buf, cutX, cutY, flash, 8, 0.6);

    for (let i = 0; i < 25; i++) {
      const x = Math.floor(rand() * size);
      const y = Math.floor(rand() * size);
      drawDot(buf, x, y, flash, rand() * 0.25);
    }

    applyBloom(buf, BG_COLOR, 0.4);
    if (overlay) applyOverlayAlpha(buf);
    return { data: buf.data, size, params };
  }

  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.38;
  const resSpacing = RES_SPACING[signalResolution];

  const renderSteps = Math.max(0, Math.min(STEPS, Math.floor(STEPS * (opts.progress ?? 1))));
  for (let step = 0; step < renderSteps; step++) {
    const t = step * 0.035;
    const decay = Math.exp(-damping * step);
    let x: number;
    let y: number;

    if (curveFamily === 'spirograph') {
      const rr = spiroR;
      const bigR = rr * spiroRatio;
      const diff = bigR - rr;
      const scale = (radius * decay) / bigR;
      x = cx + scale * (diff * lutCos(t) + spiroD * rr * lutCos((diff / rr) * t + phase));
      y = cy + scale * (diff * lutSin(t) - spiroD * rr * lutSin((diff / rr) * t + phase));
    } else {
      x = cx + radius * decay * lutSin(fx * t + phase);
      y = cy + radius * decay * lutCos(fy * t);
    }

    if (isInstrumentDrift) {
      x += (rand() - 0.5) * driftAmount;
      y += (rand() - 0.5) * driftAmount;
    }

    const px = Math.round(x);
    const py = Math.round(y);

    drawTrail(buf, px, py, drawColor, 0.35);
    if (step % resSpacing !== 0) continue;

    const progress = step / STEPS;
    let glyphType: 'star' | 'ring' | 'cross' | 'dot';
    if (progress < 0.12 && step % 5 === 0) glyphType = 'star';
    else if (step % 55 === 0) glyphType = 'ring';
    else if (step % 23 === 0) glyphType = 'cross';
    else glyphType = 'dot';

    const lean = (ch: number): RGB =>
      drawColor.map((v, i) => (i === ch ? v : v * 0.35)) as unknown as RGB;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const withSplit = (fn: any, ...args: any[]): void => {
      if (isSpectralSplit) {
        fn(buf, px - splitAmount, py, lean(0), ...args);
        fn(buf, px, py, lean(1), ...args);
        fn(buf, px + splitAmount, py, lean(2), ...args);
      } else {
        fn(buf, px, py, drawColor, ...args);
      }
    };

    if (glyphType === 'star') {
      withSplit(drawStar, 5, 0.95 * (1 - progress * 3));
    } else if (glyphType === 'ring') {
      if (isCoherent) withSplit(drawDoubleRing, 0.75);
      else if (isBinaryLock) withSplit(drawFigureEight, 0.8);
      else withSplit(drawRing, 5, 0.65);
    } else if (glyphType === 'cross') {
      withSplit(drawCross, 0.7);
    } else {
      withSplit(drawDot, 0.5);
    }
  }

  applyBloom(buf, BG_COLOR);
  if (overlay) applyOverlayAlpha(buf);
  return { data: buf.data, size, params };
}

/** Display strings matching metadataBuilder.js, for the trait legend. */
export function curveFamilyDisplay(f: CurveFamily): string {
  return f === 'spirograph' ? 'Rosette' : 'Harmonic';
}

export function lockDisplay(p: ResonanceParams): string {
  if (p.isCoherent) return 'Coherent';
  if (p.isBinaryLock) return 'Binary Lock';
  return 'Drifting';
}
