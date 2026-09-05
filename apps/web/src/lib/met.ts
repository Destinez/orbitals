/**
 * Mission Elapsed Time formatting, and the scramble that runs when the
 * log jumps from one record to the next.
 *
 * MET reads DDD:HH:MM:SS — days since commission, which is how a station
 * that has been logging for eleven thousand days would count.
 */

const GLYPHS = '0123456789';

export interface MET {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

/** Parse the canonical `DD:HH:MM:SS` strings used in the chapter registry. */
export function parseMET(s: string): MET {
  const [days = 0, hours = 0, minutes = 0, seconds = 0] = s
    .split(':')
    .map((n) => Number.parseInt(n, 10) || 0);
  return { days, hours, minutes, seconds };
}

export function metToSeconds(m: MET): number {
  return m.days * 86400 + m.hours * 3600 + m.minutes * 60 + m.seconds;
}

export function secondsToMET(total: number): MET {
  const t = Math.max(0, Math.floor(total));
  return {
    days: Math.floor(t / 86400),
    hours: Math.floor((t % 86400) / 3600),
    minutes: Math.floor((t % 3600) / 60),
    seconds: t % 60,
  };
}

const pad = (n: number, w = 2): string => String(n).padStart(w, '0');

export function formatMET(m: MET): string {
  return `${pad(m.days)}:${pad(m.hours)}:${pad(m.minutes)}:${pad(m.seconds)}`;
}

export function formatSeconds(total: number): string {
  return formatMET(secondsToMET(total));
}

/**
 * Scramble `target` by progress: 0 = fully scrambled, 1 = settled.
 * Digits resolve left to right, so the readout looks like an instrument
 * locking on rather than a random flicker.
 */
export function scramble(target: string, progress: number, seed = 0): string {
  const p = Math.max(0, Math.min(1, progress));
  const digits = target.split('');
  const digitIdx: number[] = [];
  for (let i = 0; i < digits.length; i++) {
    if (digits[i] >= '0' && digits[i] <= '9') digitIdx.push(i);
  }
  const settled = Math.floor(p * digitIdx.length);
  for (let k = settled; k < digitIdx.length; k++) {
    const i = digitIdx[k];
    // Deterministic per-frame pick — no Math.random, so a paused frame
    // is stable rather than jittering in place.
    const n = (i * 7 + seed * 13 + k * 31) % GLYPHS.length;
    digits[i] = GLYPHS[n];
  }
  return digits.join('');
}

/** `SIG ███████░░░` style meter. */
export function meter(value: number, width = 10): string {
  const filled = Math.round(Math.max(0, Math.min(1, value)) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}
