'use strict';

/**
 * sfc32 — small, fast, deterministic PRNG.
 * Same seed -> same output sequence, on any machine, forever.
 * NEVER use Math.random() anywhere in this project instead of this.
 */
function sfc32(a, b, c, d) {
  return function next() {
    a |= 0; b |= 0; c |= 0; d |= 0;
    let t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

/**
 * Derive 4 uint32 seed words from a single integer or string seed
 * using a simple deterministic string hash (xmur3). This lets a
 * token's on-chain `seed` (a single number/string) expand into the
 * internal state sfc32 needs, reproducibly.
 */
function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

/**
 * Create a deterministic PRNG instance from a token seed.
 * @param {string|number} seed - the on-chain seed for this token
 * @returns {() => number} function returning floats in [0, 1)
 */
function createPRNG(seed) {
  const seedStr = String(seed);
  const gen = xmur3(seedStr);
  const a = gen(), b = gen(), c = gen(), d = gen();
  const rand = sfc32(a, b, c, d);
  // warm up — first few outputs of many PRNGs are weakly distributed
  for (let i = 0; i < 15; i++) rand();
  return rand;
}

/** Integer in [min, max] inclusive, deterministic given rand(). */
function randInt(rand, min, max) {
  return Math.floor(rand() * (max - min + 1)) + min;
}

/** Float in [min, max), deterministic given rand(). */
function randFloat(rand, min, max) {
  return rand() * (max - min) + min;
}

module.exports = { createPRNG, randInt, randFloat, sfc32, xmur3 };
