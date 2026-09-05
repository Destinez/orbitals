import { useEffect, useMemo, useRef } from 'react';
import { type MotionValue } from 'motion/react';
import { traceGeometry, RES_SPACING, type TraceGeometry } from '../../lib/resonance';
import { rgbCss, type RGB } from '../../lib/palettes';
import { useCanvasSize } from '../../lib/hooks/useCanvasSize';
import { useRafLoop } from '../../lib/hooks/useRafLoop';

/**
 * L2 — the hero. The actual collection renderer, plotting live.
 *
 * Geometry comes from `traceGeometry`, which is the verified port, so the
 * shape on screen is the shape of the real plate for that seed. What
 * changes here is only the rasterizer: instead of the faithful additive
 * pixel loop (~260k pixel ops for its bloom pass alone, far too slow for
 * 60fps), this draws with Canvas2D primitives under `lighter` compositing
 * and fakes bloom with a wide low-alpha under-stroke.
 *
 * Glyphs are pre-rendered once into small offscreen sprites and blitted
 * with drawImage. Stamping ~1300 sprites is roughly 2ms; building those
 * same marks with per-glyph arc() calls every frame is not.
 *
 * The whole frame is redrawn each tick rather than accumulated, so
 * scrolling backwards unplots the trace correctly — the signal has to be
 * able to retreat, which is the entire point of SIGNAL LOST.
 */

type SpriteSet = {
  dot: HTMLCanvasElement;
  ring: HTMLCanvasElement;
  doubleRing: HTMLCanvasElement;
  figureEight: HTMLCanvasElement;
  cross: HTMLCanvasElement;
  star: HTMLCanvasElement;
};

function makeSprite(
  size: number,
  draw: (ctx: CanvasRenderingContext2D, c: number) => void,
): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = size;
  cv.height = size;
  const ctx = cv.getContext('2d')!;
  draw(ctx, size / 2);
  return cv;
}

function buildSprites(ink: RGB, scale: number): SpriteSet {
  const c = rgbCss(ink);
  const soft = rgbCss(ink, 0.55);

  const dot = makeSprite(Math.ceil(6 * scale), (ctx, m) => {
    const g = ctx.createRadialGradient(m, m, 0, m, m, m);
    g.addColorStop(0, rgbCss(ink, 0.95));
    g.addColorStop(0.45, rgbCss(ink, 0.4));
    g.addColorStop(1, rgbCss(ink, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, m * 2, m * 2);
  });

  const ring = makeSprite(Math.ceil(16 * scale), (ctx, m) => {
    ctx.strokeStyle = c;
    ctx.lineWidth = Math.max(1, 1.1 * scale);
    ctx.beginPath();
    ctx.arc(m, m, 4.6 * scale, 0, Math.PI * 2);
    ctx.stroke();
  });

  const doubleRing = makeSprite(Math.ceil(20 * scale), (ctx, m) => {
    ctx.strokeStyle = c;
    ctx.lineWidth = Math.max(1, 1.1 * scale);
    ctx.beginPath();
    ctx.arc(m, m, 3 * scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = soft;
    ctx.beginPath();
    ctx.arc(m, m, 6.4 * scale, 0, Math.PI * 2);
    ctx.stroke();
  });

  const figureEight = makeSprite(Math.ceil(20 * scale), (ctx, m) => {
    ctx.strokeStyle = c;
    ctx.lineWidth = Math.max(1, 1.1 * scale);
    ctx.beginPath();
    for (let i = 0; i <= 24; i++) {
      const t = (i / 24) * Math.PI * 2;
      const x = m + 5 * scale * Math.sin(t);
      const y = m + 5 * scale * Math.sin(t) * Math.cos(t);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  });

  const cross = makeSprite(Math.ceil(12 * scale), (ctx, m) => {
    ctx.strokeStyle = c;
    ctx.lineWidth = Math.max(1, 1 * scale);
    const a = 3.4 * scale;
    ctx.beginPath();
    ctx.moveTo(m - a, m);
    ctx.lineTo(m + a, m);
    ctx.moveTo(m, m - a);
    ctx.lineTo(m, m + a);
    ctx.stroke();
  });

  const star = makeSprite(Math.ceil(26 * scale), (ctx, m) => {
    const g = ctx.createRadialGradient(m, m, 0, m, m, m);
    g.addColorStop(0, rgbCss(ink, 0.9));
    g.addColorStop(0.3, rgbCss(ink, 0.18));
    g.addColorStop(1, rgbCss(ink, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, m * 2, m * 2);
    ctx.strokeStyle = rgbCss(ink, 0.95);
    ctx.lineWidth = Math.max(1, 1.1 * scale);
    const a = m * 0.85;
    ctx.beginPath();
    ctx.moveTo(m - a, m);
    ctx.lineTo(m + a, m);
    ctx.moveTo(m, m - a);
    ctx.lineTo(m, m + a);
    ctx.stroke();
    ctx.strokeStyle = rgbCss(ink, 0.4);
    const d = a * 0.45;
    ctx.beginPath();
    ctx.moveTo(m - d, m - d);
    ctx.lineTo(m + d, m + d);
    ctx.moveTo(m + d, m - d);
    ctx.lineTo(m - d, m + d);
    ctx.stroke();
  });

  return { dot, ring, doubleRing, figureEight, cross, star };
}

interface Props {
  seed: string;
  colorSeed?: string;
  /** 0..1, how much of the curve is plotted */
  progress: MotionValue<number>;
  /** extra multiplier on overall opacity, for fades */
  opacity?: MotionValue<number>;
  /** draw the ice-white 1/1 fragment instead of the full curve */
  signalLost?: boolean;
  /** slow continuous rotation of the whole plot */
  rotate?: boolean;
  className?: string;
  active?: boolean;
}

export default function OrbitalTrace({
  seed,
  colorSeed,
  progress,
  opacity,
  signalLost = false,
  rotate = true,
  className,
  active = true,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const size = useCanvasSize(canvasRef);
  const spritesRef = useRef<{ set: SpriteSet; scale: number } | null>(null);
  const spinRef = useRef(0);

  const geo: TraceGeometry = useMemo(() => traceGeometry(seed, 1000), [seed]);
  const colorGeo: TraceGeometry | null = useMemo(
    () => colorSeed ? traceGeometry(colorSeed, 1000) : null,
    [colorSeed],
  );

  // Ice white for the 1/1, the token's own ink otherwise.
  const ink: RGB = signalLost ? [235, 245, 255] : (colorGeo?.ink ?? geo.ink);

  useEffect(() => {
    spritesRef.current = null;
  }, [ink]);

  useRafLoop((_, dt) => {
    const canvas = canvasRef.current;
    const ctx = contextRef.current ?? canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    contextRef.current = ctx;

    const { w, h } = size.current;
    if (!w || !h) return;

    const p = Math.max(0, Math.min(1, progress.get()));
    const alpha = opacity ? Math.max(0, Math.min(1, opacity.get())) : 1;

    ctx.clearRect(0, 0, w, h);
    if (alpha <= 0.001 || p <= 0.0005) return;

    // Fit the 1000-unit plot box into the shorter viewport axis, leaving
    // margin so glyph bloom never clips against the frame.
    const box = Math.min(w, h) * (w < 640 ? 0.86 : 0.74);
    const s = box / geo.size;
    const scale = Math.max(0.6, Math.min(1.6, s * 1.5));

    if (!spritesRef.current || spritesRef.current.scale !== scale) {
      spritesRef.current = { set: buildSprites(ink, scale), scale };
    }
    const sprites = spritesRef.current.set;

    if (rotate) spinRef.current += dt * 0.000018;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(w / 2, h / 2);
    if (rotate) ctx.rotate(spinRef.current);
    ctx.scale(s, s);
    ctx.translate(-geo.size / 2, -geo.size / 2);
    ctx.globalCompositeOperation = 'lighter';

    const { points } = geo;
    const total = signalLost ? 70 : geo.steps;
    const upTo = Math.max(2, Math.floor(total * p));

    // ── the continuous trail ──
    // Drawn twice: a wide, very low alpha pass for bloom, then a tight
    // bright pass on top. Cheaper and softer than shadowBlur.
    const trailPasses: Array<[number, number]> = signalLost
      ? [
          [7 / s, 0.1],
          [2.4 / s, 0.5],
          [1 / s, 1],
        ]
      : [
          [5 / s, 0.055],
          [1.6 / s, 0.16],
          [0.7 / s, 0.4],
        ];

    for (const [lw, a] of trailPasses) {
      ctx.lineWidth = lw;
      ctx.strokeStyle = rgbCss(ink, a);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(points[0], points[1]);
      for (let i = 1; i < upTo; i++) {
        ctx.lineTo(points[i * 2], points[i * 2 + 1]);
      }
      ctx.stroke();
    }

    // ── glyphs ──
    const spacing = signalLost ? 5 : RES_SPACING[geo.params.signalResolution];
    const stamp = (sprite: HTMLCanvasElement, x: number, y: number, a: number): void => {
      const sw = sprite.width / scale;
      const sh = sprite.height / scale;
      ctx.globalAlpha = alpha * a;
      ctx.drawImage(sprite, x - sw / 2, y - sh / 2, sw, sh);
    };

    for (let step = 0; step < upTo; step += spacing) {
      const x = points[step * 2];
      const y = points[step * 2 + 1];
      const prog = step / total;

      if (signalLost) {
        if (step % 5 === 0) stamp(sprites.star, x, y, 0.9);
        continue;
      }

      if (prog < 0.12 && step % 5 === 0) {
        stamp(sprites.star, x, y, Math.max(0, 0.95 * (1 - prog * 3)));
      } else if (step % 55 === 0) {
        stamp(
          geo.params.isCoherent
            ? sprites.doubleRing
            : geo.params.isBinaryLock
              ? sprites.figureEight
              : sprites.ring,
          x,
          y,
          geo.params.isCoherent ? 0.78 : 0.62,
        );
      } else if (step % 23 === 0) {
        stamp(sprites.cross, x, y, 0.68);
      } else {
        stamp(sprites.dot, x, y, 0.5);
      }
    }

    // The bright burst marking exactly where the 1/1 cuts off.
    if (signalLost && p > 0.985) {
      const i = total - 1;
      stamp(sprites.star, points[i * 2], points[i * 2 + 1], 1);
      stamp(sprites.doubleRing, points[i * 2], points[i * 2 + 1], 0.7);
    }

    ctx.restore();
  }, active);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className}
      style={{ width: '100%', height: '100%' }}
    />
  );
}
