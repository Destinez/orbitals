/**
 * The instrument drawing grammar.
 *
 * Everything the site renders behind the story — the station, planets,
 * debris — is drawn with these primitives rather than as illustration or
 * 3D geometry. The collection's plates are point plots: dotted paths,
 * rings, crosses, measurement ticks. Reusing that vocabulary is what
 * makes the space objects read as output from the same instrument that
 * produced the artwork, instead of stock scenery behind it.
 *
 * All coordinates are CSS pixels; the canvas context is pre-scaled for
 * device pixel ratio by useCanvasSize.
 */

import { rgbCss, type RGB } from '../../lib/palettes';

export interface Ctx2D extends CanvasRenderingContext2D {}

/** A path of discrete points rather than a continuous stroke. */
export function dottedPath(
  ctx: Ctx2D,
  pts: (t: number) => [number, number],
  count: number,
  color: RGB,
  opts: { alpha?: number; size?: number; alphaAt?: (t: number) => number } = {},
): void {
  const { alpha = 0.7, size = 1, alphaAt } = opts;
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const [x, y] = pts(t);
    const a = alpha * (alphaAt ? alphaAt(t) : 1);
    if (a <= 0.002) continue;
    ctx.fillStyle = rgbCss(color, a);
    ctx.fillRect(x - size / 2, y - size / 2, size, size);
  }
}

export function dottedArc(
  ctx: Ctx2D,
  cx: number,
  cy: number,
  r: number,
  from: number,
  to: number,
  color: RGB,
  opts: { alpha?: number; count?: number; size?: number; alphaAt?: (t: number) => number } = {},
): void {
  const count = opts.count ?? Math.max(24, Math.round(r * 1.6));
  dottedPath(
    ctx,
    (t) => {
      const a = from + (to - from) * t;
      return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
    },
    count,
    color,
    opts,
  );
}

export function dottedLine(
  ctx: Ctx2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: RGB,
  opts: { alpha?: number; count?: number; size?: number } = {},
): void {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const count = opts.count ?? Math.max(6, Math.round(len / 4));
  dottedPath(ctx, (t) => [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t], count, color, opts);
}

/** Soft additive glow blob. Cheap stand-in for the generator's bloom. */
export function glow(
  ctx: Ctx2D,
  x: number,
  y: number,
  r: number,
  color: RGB,
  alpha = 0.5,
): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgbCss(color, alpha));
  g.addColorStop(0.4, rgbCss(color, alpha * 0.25));
  g.addColorStop(1, rgbCss(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

/** Targeting reticle: corner ticks around a point, optionally with a ring. */
export function reticle(
  ctx: Ctx2D,
  x: number,
  y: number,
  r: number,
  color: RGB,
  opts: { alpha?: number; ring?: boolean; gap?: number; len?: number } = {},
): void {
  const { alpha = 0.5, ring = true, gap = 3, len = 6 } = opts;
  ctx.strokeStyle = rgbCss(color, alpha);
  ctx.lineWidth = 1;

  if (ring) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.setLineDash([2, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  const o = r + gap;
  ctx.beginPath();
  for (const [dx, dy] of [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ]) {
    ctx.moveTo(x + dx * o, y + dy * o);
    ctx.lineTo(x + dx * (o + len), y + dy * (o + len));
  }
  ctx.stroke();
}

/** Measurement ticks along a straight run, like a ruler edge. */
export function tickRun(
  ctx: Ctx2D,
  x: number,
  y: number,
  length: number,
  color: RGB,
  opts: { alpha?: number; spacing?: number; major?: number; vertical?: boolean } = {},
): void {
  const { alpha = 0.35, spacing = 12, major = 5, vertical = false } = opts;
  ctx.strokeStyle = rgbCss(color, alpha);
  ctx.lineWidth = 1;
  ctx.beginPath();
  const n = Math.floor(length / spacing);
  for (let i = 0; i <= n; i++) {
    const d = i * spacing;
    const h = i % major === 0 ? 6 : 3;
    if (vertical) {
      ctx.moveTo(x, y + d);
      ctx.lineTo(x + h, y + d);
    } else {
      ctx.moveTo(x + d, y);
      ctx.lineTo(x + d, y - h);
    }
  }
  ctx.stroke();
}

/** Small uppercase instrument label. */
export function label(
  ctx: Ctx2D,
  text: string,
  x: number,
  y: number,
  color: RGB,
  opts: { alpha?: number; size?: number; align?: CanvasTextAlign } = {},
): void {
  const { alpha = 0.55, size = 9, align = 'left' } = opts;
  ctx.save();
  ctx.font = `${size}px "IBM Plex Mono", ui-monospace, monospace`;
  ctx.fillStyle = rgbCss(color, alpha);
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  // Tracking has to be faked; Canvas2D has no letter-spacing in all engines.
  const tracked = text.split('').join('\u2009');
  ctx.fillText(tracked, x, y);
  ctx.restore();
}

/** Deterministic hash for placing debris without Math.random. */
export function hash2(i: number, salt = 0): number {
  let h = (i * 374761393 + salt * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
