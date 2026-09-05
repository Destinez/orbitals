/**
 * Faithful port of `packages/generator/src/prng.js`.
 *
 * Same seed -> same output sequence, on any machine, forever.
 * Never use Math.random() for anything that affects token geometry.
 */

export type Rand = () => number;

/** sfc32 — small, fast, deterministic PRNG. */
function sfc32(a: number, b: number, c: number, d: number): Rand {
  return function next(): number {
    a |= 0;
    b |= 0;
    c |= 0;
    d |= 0;
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

/** Derive 4 uint32 seed words from a single integer or string seed. */
function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function (): number {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

/** Create a deterministic PRNG instance from a token seed. */
export function createPRNG(seed: string | number): Rand {
  const seedStr = String(seed);
  const gen = xmur3(seedStr);
  const a = gen();
  const b = gen();
  const c = gen();
  const d = gen();
  const rand = sfc32(a, b, c, d);
  // warm up — first few outputs of many PRNGs are weakly distributed
  for (let i = 0; i < 15; i++) rand();
  return rand;
}

/** Integer in [min, max] inclusive. */
export function randInt(rand: Rand, min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

/** Float in [min, max). */
export function randFloat(rand: Rand, min: number, max: number): number {
  return rand() * (max - min) + min;
}
