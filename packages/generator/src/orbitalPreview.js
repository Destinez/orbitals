'use strict';

/**
 * BOOSTED VARIANT — same trait system and determinism guarantees as
 * orbitalPreview.js, but tuned for casual-collector shelf appeal:
 * thicker strokes, a soft glow/bloom pass, a continuous connecting
 * line along the actual curve (not just isolated glyphs), higher
 * base point density, and bolder default saturation. Muted tones are
 * now reserved for a "Faded/Archival" trait rather than being the
 * default look for ~75% of the collection.
 */

const path = require('path');
const { createPRNG, randFloat, randInt } = require('./prng');
const { lutSin, lutCos } = require('./trig');
const { PixelBuffer } = require('./buffer');

const OUT_SIZE = 512;
const STEPS = 4000;

// Bolder default saturation — these are now the everyday look, not
// a reserved rare tier, so they need to compete visually with the
// neon Coherent palette rather than reading as "washed out" next to it.
const PALETTES = {
  ion: [80, 200, 255],
  solar: [255, 160, 40],
  nebula: [220, 80, 255],
  emerald: [60, 255, 160],
};
const PALETTE_NAMES = Object.keys(PALETTES);

// Reserved for confirmed 2:3 / 3:2 lock tokens only — saturated neon,
// distinct from the four standard palettes above rather than a tinted
// variant of them, so a "Coherent" token reads as unmistakably
// different at a glance, not just a rarer roll of the same look.
const NEON_PALETTES = {
  laser_magenta: [255, 40, 220],
  electric_lime: [170, 255, 40],
  plasma_red: [255, 50, 60],
  ultraviolet: [140, 60, 255],
};
const NEON_PALETTE_NAMES = Object.keys(NEON_PALETTES);

function paramsFromSeed(seed) {
  const rand = createPRNG(seed);
  const fx = randInt(rand, 2, 7);
  const fy = randInt(rand, 2, 7);
  const detune = randFloat(rand, -0.004, 0.004);
  const phase = randFloat(rand, 0, 6.283185307179586);
  const damping = randFloat(rand, 0.00008, 0.0003);

  // Curve family: harmonograph (X/bowtie/ellipse/spiral family, the
  // original renderer) or hypotrochoid/spirograph (rose/flower/star
  // family) — genuinely different topologies, not just a re-palette
  // of the same shape. Hypotrochoids are historically the same family
  // of curve used to model epicycles in pre-Copernican orbital
  // tracking, so it still sits inside the collection's lore. ~45%
  // spirograph so it reads as a real second family, not a rare gimmick.
  const curveFamily = rand() < 0.45 ? 'spirograph' : 'harmonograph';
  // Spirograph-specific params — generated unconditionally (cheap) so
  // the PRNG stream stays identical in length regardless of which
  // family renders, keeping every other trait's odds unaffected.
  const spiroR = randInt(rand, 3, 11);
  const spiroRatio = randInt(rand, 3, 8); // R:r ratio — small integers give clean rose/star petal counts; ratio=2 is excluded, it degenerates the hypotrochoid to a near-straight line (diff/rr collapses to 1, matching the outer term's frequency)
  const spiroD = randFloat(rand, 0.4, 1.3);

  // "Coherent" tier: the token's ratio is exactly the namesake 2:3 /
  // 3:2 lock (checked pre-detune, on the integer ratio itself — a
  // token this rare should be identifiable from its raw parameters,
  // not from how much drift the jitter happened to add).
  const isCoherent = (fx === 2 && fy === 3) || (fx === 3 && fy === 2);
  // "Binary Lock": equal frequencies — a different real curve family
  // (figure-eight rather than X/bowtie/ellipse), gets its own glyph.
  const isBinaryLock = fx === fy && !isCoherent;

  let paletteName;
  if (isCoherent) {
    paletteName = NEON_PALETTE_NAMES[Math.floor(rand() * NEON_PALETTE_NAMES.length)];
  } else {
    paletteName = PALETTE_NAMES[Math.floor(rand() * PALETTE_NAMES.length)];
  }

  const starCount = randInt(rand, 80, 160);
  // "Deep Field": the rare tail of the starfield-density roll — very
  // few background stars recorded. Purely a threshold on the same
  // roll, not a separate mechanic, so it stays cheap and still reads
  // as "this region of sky was unusually empty."
  const isDeepField = starCount < 95;

  // --- Independent trait axes (each its own draw, freely stackable
  // with everything above and with each other — same principle as
  // NTRPY's Palette x Resolution x Prismatic combining independently) ---

  // Spectral Split ("Prismatic" equivalent): glyphs render with a
  // slight per-channel offset, like a prism splitting light / a
  // mis-collimated instrument. ~12% of supply.
  const isSpectralSplit = rand() < 0.12;
  const splitAmount = isSpectralSplit ? randInt(rand, 1, 3) : 0;

  // Negative Exposure ("inverted background" equivalent): frame reads
  // as an overexposed capture — pale background, dark glyph strokes.
  // A real photographic/instrumentation failure mode, not decoration.
  // ~8% of supply.
  // Negative Exposure trait removed — pale-background inversion read
  // as broken rather than intentional, and didn't fit the deep-space
  // aesthetic. Background is now always the dark starfield tone.

  // Signal Resolution ("Resolution" equivalent): controls how many
  // curve points actually get a glyph — literally how much of the
  // signal was captured. Four bands, uneven weighting so "Full" is
  // the rare end rather than the default.
  const resRoll = rand();
  let signalResolution;
  if (resRoll < 0.10) signalResolution = 'full';       // dense, rare
  else if (resRoll < 0.35) signalResolution = 'high';
  else if (resRoll < 0.75) signalResolution = 'standard';
  else signalResolution = 'low';                        // sparse, common

  // Instrument Drift: small jitter applied to glyph placement,
  // simulating tracking imprecision — ties to the anomaly's own line
  // "the instrument moves, I don't." ~15% of supply.
  const isInstrumentDrift = rand() < 0.15;
  const driftAmount = isInstrumentDrift ? randFloat(rand, 0.5, 1.8) : 0;

  // Faded / Archival: repurposes the old muted-tone look as an
  // intentional rare variant rather than the default — a token that
  // looks like an old, degraded capture. ~10% of supply.
  const isFaded = rand() < 0.10;

  return {
    fx, fy: fy + detune, phase, damping, paletteName,
    isCoherent, isBinaryLock, isDeepField, starCount, rand,
    isSpectralSplit, splitAmount,
    signalResolution, isInstrumentDrift, driftAmount, isFaded,
    curveFamily, spiroR, spiroRatio, spiroD,
  };
}

/**
 * SIGNAL LOST — the collection's single 1-of-1. Reserved for exactly
 * one token id, set by the harness/mint config (not derivable from a
 * public seed alone, so it can't be sniped by guessing). Full damping
 * collapse: no curve survives, only the starfield remains.
 */
function isSignalLostTokenId(tokenId, signalLostId) {
  return signalLostId !== undefined && String(tokenId) === String(signalLostId);
}

function setBlend(buf, x, y, r, g, b, alpha) {
  if (x < 0 || x >= buf.width || y < 0 || y >= buf.height) return;
  const idx = (y * buf.width + x) * 4;
  buf.data[idx] = Math.min(255, buf.data[idx] + r * alpha);
  buf.data[idx + 1] = Math.min(255, buf.data[idx + 1] + g * alpha);
  buf.data[idx + 2] = Math.min(255, buf.data[idx + 2] + b * alpha);
}

/** Four-point star burst — thicker, brighter than the original. */
function drawStar(buf, cx, cy, color, size, alpha) {
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

/** Small ring — thicker (double-stroke) so it holds up at thumbnail size. */
function drawRing(buf, cx, cy, color, radius, alpha) {
  const [r, g, b] = color;
  const steps = 20;
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * 6.283185307179586;
    const x = Math.round(cx + radius * lutCos(t));
    const y = Math.round(cy + radius * lutSin(t));
    setBlend(buf, x, y, r, g, b, alpha);
    setBlend(buf, x + 1, y, r, g, b, alpha * 0.6);
    setBlend(buf, x, y + 1, r, g, b, alpha * 0.6);
  }
}

/** Double ring — reserved for confirmed 2:3/3:2 "Coherent" lock tokens. */
function drawDoubleRing(buf, cx, cy, color, alpha) {
  drawRing(buf, cx, cy, color, 3, alpha);
  drawRing(buf, cx, cy, color, 6, alpha * 0.7);
}

/** Overlapping figure-eight — reserved for "Binary Lock" (fx === fy) tokens. */
function drawFigureEight(buf, cx, cy, color, alpha) {
  const [r, g, b] = color;
  const steps = 24;
  const lobe = 5;
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * 6.283185307179586;
    const x1 = Math.round(cx + lobe * lutSin(t));
    const y1 = Math.round(cy + lobe * lutSin(t) * lutCos(t));
    setBlend(buf, x1, y1, r, g, b, alpha);
    setBlend(buf, x1 + 1, y1, r, g, b, alpha * 0.5);
  }
}

/** Tiny cross — slightly larger than the original for thumbnail legibility. */
function drawCross(buf, cx, cy, color, alpha) {
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

/** Single dim pixel — distant background star. */
function drawDot(buf, cx, cy, color, alpha) {
  const [r, g, b] = color;
  setBlend(buf, cx, cy, r, g, b, alpha);
}

/** Faint 2px connecting stroke along the curve path itself — gives
 *  every token an instantly legible silhouette even before glyphs
 *  are considered, rather than relying on isolated points alone. */
function drawTrail(buf, px, py, color, alpha) {
  const [r, g, b] = color;
  setBlend(buf, px, py, r, g, b, alpha);
  setBlend(buf, px + 1, py, r, g, b, alpha * 0.4);
  setBlend(buf, px, py + 1, r, g, b, alpha * 0.4);
}

async function renderOrbital(seed, outPath, opts = {}) {
  const { tokenId, signalLostId } = opts;
  const params = paramsFromSeed(seed);
  const {
    fx, fy, phase, damping, paletteName, isCoherent, isBinaryLock, isDeepField,
    starCount, rand, isSpectralSplit, splitAmount,
    signalResolution, isInstrumentDrift, driftAmount, isFaded,
    curveFamily, spiroR, spiroRatio, spiroD,
  } = params;
  let color = isCoherent ? NEON_PALETTES[paletteName] : PALETTES[paletteName];
  if (isFaded) {
    // Muted variant, now an intentional rare look rather than default.
    color = color.map((v) => Math.round(v * 0.55 + 60));
  }
  const isSignalLost = tokenId !== undefined && isSignalLostTokenId(tokenId, signalLostId);

  const bgColor = [4, 5, 10];
  const buf = new PixelBuffer(OUT_SIZE, OUT_SIZE);
  for (let i = 0; i < buf.data.length; i += 4) {
    buf.data[i] = bgColor[0]; buf.data[i + 1] = bgColor[1]; buf.data[i + 2] = bgColor[2]; buf.data[i + 3] = 255;
  }
  const drawColor = color;
  const starColor = [255, 255, 255];

  for (let i = 0; i < starCount; i++) {
    const x = Math.floor(rand() * OUT_SIZE);
    const y = Math.floor(rand() * OUT_SIZE);
    const dim = 0.15 + rand() * 0.35;
    drawDot(buf, x, y, starColor, dim);
  }

  if (isSignalLost) {
    // Redesigned: no longer "nothing at all" — that read as broken
    // rather than special. Instead this is the one moment the signal
    // briefly resolves — a short, dense, bright fragment of real
    // curve and glyphs — before dissolving into unrelated scattered
    // static for the rest of the frame. Rare in substance, not just
    // in emptiness. Reserved pure-white/ice color, not used anywhere
    // else in the collection.
    const flashColor = [235, 245, 255];
    const resolveSteps = 70;
    const fcx = OUT_SIZE / 2;
    const fcy = OUT_SIZE / 2;
    const fradius = OUT_SIZE * 0.38;

    for (let step = 0; step < resolveSteps; step++) {
      const t = step * 0.035;
      const decay = Math.exp(-damping * step);
      const x = fcx + fradius * decay * lutSin(fx * t + phase);
      const y = fcy + fradius * decay * lutCos(fy * t);
      const px = Math.round(x);
      const py = Math.round(y);

      drawTrail(buf, px, py, flashColor, 1.0);
      drawTrail(buf, px + 1, py, flashColor, 0.7);
      drawTrail(buf, px, py + 1, flashColor, 0.7);
      drawTrail(buf, px - 1, py, flashColor, 0.5);
      drawTrail(buf, px, py - 1, flashColor, 0.5);

      if (step % 5 === 0) {
        drawStar(buf, px, py, flashColor, 4, 0.9);
      }
    }
    // A brighter burst marking exactly where the signal cuts off.
    const cutStep = resolveSteps - 1;
    const cutT = cutStep * 0.035;
    const cutDecay = Math.exp(-damping * cutStep);
    const cutX = Math.round(fcx + fradius * cutDecay * lutSin(fx * cutT + phase));
    const cutY = Math.round(fcy + fradius * cutDecay * lutCos(fy * cutT));
    drawStar(buf, cutX, cutY, flashColor, 7, 1.0);
    drawRing(buf, cutX, cutY, flashColor, 8, 0.6);

    // The rest of the frame: sparse, unrelated static — no curve
    // structure, nothing connecting these points to the fragment above.
    const staticCount = 25;
    for (let i = 0; i < staticCount; i++) {
      const x = Math.floor(rand() * OUT_SIZE);
      const y = Math.floor(rand() * OUT_SIZE);
      const fade = rand() * 0.25;
      drawDot(buf, x, y, flashColor, fade);
    }

    applyBloom(buf, bgColor, 0.4);
    await buf.toPNGFile(outPath);
    return { fx, fy, paletteName, isCoherent, isBinaryLock, isDeepField, isSignalLost };
  }

  const cx = OUT_SIZE / 2;
  const cy = OUT_SIZE / 2;
  const radius = OUT_SIZE * 0.38;

  // Boosted base density: "standard" and "low" tiers are noticeably
  // denser than the original tuning, so the common ~65% of the
  // collection (standard+low combined) doesn't read as empty.
  const resSpacing = { full: 1, high: 2, standard: 3, low: 5 }[signalResolution];

  for (let step = 0; step < STEPS; step++) {
    const t = step * 0.035;
    const decay = Math.exp(-damping * step);
    let x, y;

    if (curveFamily === 'spirograph') {
      // Hypotrochoid: a small circle of radius r rolling inside a
      // fixed circle of radius R, tracing a point at distance d from
      // the small circle's center. R:r ratio sets the petal/lobe
      // count — a genuinely different topology (rose/flower/star
      // shapes) from the harmonograph's X/bowtie/ellipse family.
      // Same historical lineage as orbital tracking: this is the
      // same curve family behind Ptolemaic epicycles.
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

    // Continuous trail drawn on every step regardless of resolution
    // spacing — gives every token a legible silhouette even before
    // any glyph is placed on top of it.
    drawTrail(buf, px, py, drawColor, 0.35);

    if (step % resSpacing !== 0) continue;

    const progress = step / STEPS;
    let glyphType;
    if (progress < 0.12 && step % 5 === 0) {
      glyphType = 'star';
    } else if (step % 55 === 0) {
      glyphType = 'ring';
    } else if (step % 23 === 0) {
      glyphType = 'cross';
    } else {
      glyphType = 'dot';
    }

    const drawWithSplit = (drawFn, ...args) => {
      if (isSpectralSplit) {
        const lean = (ch) => drawColor.map((v, i) => (i === ch ? v : v * 0.35));
        drawFn(buf, px - splitAmount, py, lean(0), ...args);
        drawFn(buf, px, py, lean(1), ...args);
        drawFn(buf, px + splitAmount, py, lean(2), ...args);
      } else {
        drawFn(buf, px, py, drawColor, ...args);
      }
    };

    if (glyphType === 'star') {
      drawWithSplit(drawStar, 5, 0.95 * (1 - progress * 3));
    } else if (glyphType === 'ring') {
      if (isCoherent) {
        drawWithSplit(drawDoubleRing, 0.75);
      } else if (isBinaryLock) {
        drawWithSplit(drawFigureEight, 0.8);
      } else {
        drawWithSplit(drawRing, 5, 0.65);
      }
    } else if (glyphType === 'cross') {
      drawWithSplit(drawCross, 0.7);
    } else if (glyphType === 'dot') {
      drawWithSplit(drawDot, 0.5);
    }
  }

  // Soft glow/bloom pass: a cheap box-blur of the bright pixels,
  // blended back underneath the sharp originals. Pure +,-,*,/ over
  // the existing buffer, so still deterministic and engine-agnostic.
  applyBloom(buf, bgColor);

  await buf.toPNGFile(outPath);
  return {
    fx, fy, paletteName, isCoherent, isBinaryLock, isDeepField, isSignalLost,
    isSpectralSplit, signalResolution, isInstrumentDrift, isFaded, curveFamily,
  };
}

/** Cheap deterministic bloom: downsample-blur the bright pixels into
 *  a low-res buffer, then additively blend back at low opacity.
 *  strength defaults to the standard pass; Signal Lost uses a
 *  stronger one since its only content is dim, isolated star pixels
 *  that a subtle bloom barely touches. */
function applyBloom(buf, bgColor, strength = 0.22) {
  const w = buf.width, h = buf.height;
  const blockSize = 4;
  const bw = Math.ceil(w / blockSize);
  const bh = Math.ceil(h / blockSize);
  const blurR = new Float64Array(bw * bh);
  const blurG = new Float64Array(bw * bh);
  const blurB = new Float64Array(bw * bh);

  for (let by = 0; by < bh; by++) {
    for (let bx = 0; bx < bw; bx++) {
      let sr = 0, sg = 0, sb = 0, count = 0;
      for (let dy = 0; dy < blockSize; dy++) {
        for (let dx = 0; dx < blockSize; dx++) {
          const x = bx * blockSize + dx, y = by * blockSize + dy;
          if (x >= w || y >= h) continue;
          const idx = (y * w + x) * 4;
          sr += buf.data[idx]; sg += buf.data[idx + 1]; sb += buf.data[idx + 2];
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
      const br = blurR[by * bw + bx], bg = blurG[by * bw + bx], bb = blurB[by * bw + bx];
      const excessR = Math.max(0, br - bgColor[0]);
      const excessG = Math.max(0, bg - bgColor[1]);
      const excessB = Math.max(0, bb - bgColor[2]);
      buf.data[idx] = Math.min(255, buf.data[idx] + excessR * strength);
      buf.data[idx + 1] = Math.min(255, buf.data[idx + 1] + excessG * strength);
      buf.data[idx + 2] = Math.min(255, buf.data[idx + 2] + excessB * strength);
    }
  }
}

if (require.main === module) {
  const seed = process.argv[2] || '1';
  const outPath = process.argv[3] || path.join(__dirname, '..', 'output', 'orbital.png');
  const tokenId = process.argv[4];
  const signalLostId = process.argv[5];
  renderOrbital(seed, outPath, { tokenId, signalLostId }).then((meta) => {
    console.log(`orbital (seed=${seed}) -> ${outPath}`);
    console.log(`  fx=${meta.fx} fy=${(meta.fy||0).toFixed ? meta.fy.toFixed(4) : meta.fy} palette=${meta.paletteName} coherent=${meta.isCoherent} binaryLock=${meta.isBinaryLock} deepField=${meta.isDeepField} signalLost=${meta.isSignalLost}`);
  });
}

module.exports = { renderOrbital };
