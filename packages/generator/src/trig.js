'use strict';

/**
 * Lookup-table trig.
 *
 * Native Math.sin/cos/exp/pow are IEEE-754 in *result type* but NOT
 * guaranteed bit-identical across JS engines (V8 vs JavaScriptCore vs
 * different Node/V8 versions can differ in the last 1-2 bits). A
 * reaction-diffusion sim integrates that error over thousands of steps,
 * so two "identical" renders on different machines can visibly diverge.
 *
 * Fix: precompute a fixed-size table ONCE, with values baked in as
 * plain numbers (committed alongside algoCommitHash), and interpolate
 * with only +,-,*,/ — which IEEE-754 does pin exactly.
 */

const TABLE_SIZE = 65536; // 2^16 — precision to ~0.0001 radians
const TWO_PI = 6.283185307179586;

// Table is generated once at module load, from a fixed formula, and
// then treated as immutable committed data — in production this table
// itself should be embedded as a literal array (or a hash of it
// checked) rather than recomputed via Math.sin, since recomputing it
// via Math.sin makes the *table itself* only toolchain-reproducible.
// For this reference implementation we generate it once and note that
// the shipped version should freeze these exact values into the repo
// (e.g. as a JSON/binary asset) so nothing calls Math.sin at render time.
const SIN_TABLE = new Float64Array(TABLE_SIZE);
for (let i = 0; i < TABLE_SIZE; i++) {
  SIN_TABLE[i] = Math.sin((i / TABLE_SIZE) * TWO_PI);
}

function wrapIndex(t) {
  // t in radians -> [0, TABLE_SIZE)
  let normalized = (t % TWO_PI) / TWO_PI;
  if (normalized < 0) normalized += 1;
  return normalized * TABLE_SIZE;
}

function lutSin(t) {
  const idx = wrapIndex(t);
  const i0 = Math.floor(idx) % TABLE_SIZE;
  const i1 = (i0 + 1) % TABLE_SIZE;
  const frac = idx - Math.floor(idx);
  // linear interpolation — only +,-,*,/ (IEEE-754 pinned)
  return SIN_TABLE[i0] * (1 - frac) + SIN_TABLE[i1] * frac;
}

function lutCos(t) {
  return lutSin(t + Math.PI / 2);
}

module.exports = { lutSin, lutCos, TABLE_SIZE, SIN_TABLE };
