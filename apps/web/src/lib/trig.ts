/**
 * Faithful port of `packages/generator/src/trig.js`.
 *
 * The collection's renderer does NOT use Math.sin directly. Native
 * Math.sin/cos are IEEE-754 in result *type* but not guaranteed
 * bit-identical across JS engines (V8 vs JavaScriptCore vs different
 * V8 versions can differ in the last 1-2 bits). The generator therefore
 * reads from a fixed-size lookup table and interpolates using only
 * +,-,*,/ — operations IEEE-754 does pin exactly.
 *
 * This port exists so the browser reproduces a token's geometry the
 * same way the minted PNG was produced. If we used Math.sin here, a
 * live-rendered trace could drift from its own plate.
 */

const TABLE_SIZE = 65536; // 2^16 — precision to ~0.0001 radians
const TWO_PI = 6.283185307179586;

const SIN_TABLE = new Float64Array(TABLE_SIZE);
for (let i = 0; i < TABLE_SIZE; i++) {
  SIN_TABLE[i] = Math.sin((i / TABLE_SIZE) * TWO_PI);
}

function wrapIndex(t: number): number {
  let normalized = (t % TWO_PI) / TWO_PI;
  if (normalized < 0) normalized += 1;
  return normalized * TABLE_SIZE;
}

export function lutSin(t: number): number {
  const idx = wrapIndex(t);
  const i0 = Math.floor(idx) % TABLE_SIZE;
  const i1 = (i0 + 1) % TABLE_SIZE;
  const frac = idx - Math.floor(idx);
  // linear interpolation — only +,-,*,/ (IEEE-754 pinned)
  return SIN_TABLE[i0] * (1 - frac) + SIN_TABLE[i1] * frac;
}

export function lutCos(t: number): number {
  return lutSin(t + Math.PI / 2);
}

export { TWO_PI };
