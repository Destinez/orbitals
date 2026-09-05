/**
 * Synthesises the trailer's 20-second audio bed to
 * apps/trailer/public/telemetry.wav.
 *
 * Written offline rather than at render time so the asset is stable and
 * the render has no audio dependencies. Everything here is deterministic:
 * same script, same bytes.
 *
 * Design follows the guide, stretched to the 20s cut and locked to the
 * animation's phases (30 fps):
 *   0.0  - 5.3   reveal      slow sonar pings, long gaps, quiet
 *   5.3  - 15.7  sweep       pings tighten; sub-bass builds underneath
 *   15.7 - 18.0  completion  cadence peaks, an airy swell as the field
 *                            rushes in, one last ping on the lock
 *   18.0 - 20.0  hold        everything settles; sparse, quiet, sustained
 *
 * No cinematic impacts, no musical risers, no UI beeps. The swell is
 * filtered air, not a whoosh.
 *
 * Usage: npm run audio  (from apps/trailer)
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SAMPLE_RATE = 44100;
const DURATION_SECONDS = 20;
const TOTAL = SAMPLE_RATE * DURATION_SECONDS;

const PING_HZ = 360;
/** Direct sound plus three reflections — reads as a large empty space. */
const PING_TAPS = [
  [0, 1],
  [0.185, 0.3],
  [0.395, 0.14],
  [0.72, 0.06],
];

const SUB_START = 3;
const SUB_PEAK = 17.5;
const WARP_START = 10;
const WARP_PEAK = 17.8;

function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function smoothstep(v) {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
}

function smoother(v) {
  const t = clamp01(v);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/** Ping schedule: gaps shrink from ~1.9s to ~0.3s, then two quiet taps. */
function buildPingSchedule() {
  const pings = [];
  let t = 0.3;
  const last = 16.2;
  while (t < last) {
    const prog = clamp01((t - 0.3) / (last - 0.3));
    pings.push([t, 0.5 + 0.44 * prog]);
    t += 1.9 - 1.62 * smoothstep(prog);
  }
  pings.push([17.9, 0.98]); // the lock
  pings.push([18.95, 0.4]);
  pings.push([19.65, 0.3]);
  return pings;
}

const PINGS = buildPingSchedule();
const out = new Float64Array(TOTAL);

/** One sonar ping: fast attack, long decay, slight downward glide. */
function addPing(startSeconds, amplitude) {
  const tail = 1.6;
  for (const [delay, gain] of PING_TAPS) {
    const offset = Math.floor((startSeconds + delay) * SAMPLE_RATE);
    const length = Math.floor(tail * SAMPLE_RATE);
    for (let i = 0; i < length; i++) {
      const index = offset + i;
      if (index < 0) continue;
      if (index >= TOTAL) break;
      const t = i / SAMPLE_RATE;
      const env = Math.exp(-t / 0.3) * (1 - Math.exp(-t / 0.004));
      const glide = PING_HZ * (1 - 0.06 * (1 - Math.exp(-t / 0.18)));
      const tone =
        Math.sin(2 * Math.PI * glide * t) +
        0.26 * Math.sin(2 * Math.PI * glide * 1.5 * t) +
        0.07 * Math.sin(2 * Math.PI * glide * 2 * t);
      out[index] += amplitude * gain * env * tone * 0.32;
    }
  }
}

for (const [time, amplitude] of PINGS) addPing(time, amplitude);

/** Sub-bass: builds under the sweep, peaks on the lock, then settles. */
for (let i = 0; i < TOTAL; i++) {
  const t = i / SAMPLE_RATE;
  const build = smoother((t - SUB_START) / (SUB_PEAK - SUB_START));
  const settle = t > SUB_PEAK ? 1 - 0.2 * clamp01((t - SUB_PEAK) / 1.8) : 1;
  const breath = 1 + 0.06 * Math.sin(2 * Math.PI * 0.4 * t);
  const env = 0.55 * build * settle * breath;
  out[i] +=
    env *
    (0.8 * Math.sin(2 * Math.PI * 38 * t) +
      0.35 * Math.sin(2 * Math.PI * 19 * t) +
      0.07 * Math.sin(2 * Math.PI * 76 * t));
}

/**
 * Approach swell: low-passed noise that rises as the field rushes in and
 * falls away in the hold. Filtered air, deliberately not a riser.
 */
const air = mulberry32(0x0417);
let lpWarp = 0;
for (let i = 0; i < TOTAL; i++) {
  const t = i / SAMPLE_RATE;
  lpWarp += 0.06 * (air() * 2 - 1 - lpWarp);
  const rise = smoother((t - WARP_START) / (WARP_PEAK - WARP_START));
  const fall = t > WARP_PEAK ? 1 - 0.85 * clamp01((t - WARP_PEAK) / 1.6) : 1;
  out[i] += lpWarp * 0.16 * rise * fall;
}

/** Instrument hiss, low-passed so it sits behind everything. */
const noise = mulberry32(0x2317);
let lp = 0;
for (let i = 0; i < TOTAL; i++) {
  lp += 0.02 * (noise() * 2 - 1 - lp);
  out[i] += lp * 0.045;
}

/** Master: soft clip, top and tail, normalise. */
const fadeIn = Math.floor(0.04 * SAMPLE_RATE);
const fadeOut = Math.floor(0.6 * SAMPLE_RATE);
let peak = 0;
for (let i = 0; i < TOTAL; i++) {
  let v = Math.tanh(out[i] * 0.9);
  if (i < fadeIn) v *= i / fadeIn;
  if (i > TOTAL - fadeOut) v *= (TOTAL - i) / fadeOut;
  out[i] = v;
  const abs = Math.abs(v);
  if (abs > peak) peak = abs;
}
const gain = peak > 0 ? 0.89 / peak : 1;

const bytes = Buffer.alloc(44 + TOTAL * 2);
bytes.write('RIFF', 0);
bytes.writeUInt32LE(36 + TOTAL * 2, 4);
bytes.write('WAVE', 8);
bytes.write('fmt ', 12);
bytes.writeUInt32LE(16, 16);
bytes.writeUInt16LE(1, 20); // PCM
bytes.writeUInt16LE(1, 22); // mono
bytes.writeUInt32LE(SAMPLE_RATE, 24);
bytes.writeUInt32LE(SAMPLE_RATE * 2, 28);
bytes.writeUInt16LE(2, 32);
bytes.writeUInt16LE(16, 34);
bytes.write('data', 36);
bytes.writeUInt32LE(TOTAL * 2, 40);

for (let i = 0; i < TOTAL; i++) {
  const v = Math.max(-1, Math.min(1, out[i] * gain));
  bytes.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
}

const here = dirname(fileURLToPath(import.meta.url));
const target = join(here, '..', 'public', 'telemetry.wav');
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, bytes);

console.log(
  `telemetry.wav -> ${target} (${DURATION_SECONDS}s, ${SAMPLE_RATE} Hz mono, ${PINGS.length} pings)`,
);
