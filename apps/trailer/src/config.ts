/**
 * Tunable parameters for the whole piece. Everything a director would
 * want to adjust lives here: duration, camera, orbital scale and
 * inclination, glow, star density, and the trace dynamics.
 */

export const FPS = 30;
export const TOTAL_FRAMES = 600; // 20s
export const WIDTH = 1920;
export const HEIGHT = 1080;

/* ── Camera (locked off) ─────────────────────────────────────────── */
export const CAMERA_FOV = 34;
export const CAMERA_POSITION: [number, number, number] = [0, 1.98, 6.5];
export const CAMERA_TARGET: [number, number, number] = [0, 0, 0];

/* ── Orbital system ──────────────────────────────────────────────── */
/** Semi-major axis of the primary orbit, in world units. */
/** Reduced slightly to preserve clear lower-left instrumentation space. */
export const ORBIT_SEMI_MAJOR = 2.65;
/** Semi-minor as a fraction of semi-major — the elongation. */
export const ORBIT_ELONGATION = 0.54;
export const INCLINATION_MIN_DEG = 16;
export const INCLINATION_MAX_DEG = 23;
export const PLANET_RADIUS = 0.92;

/** Bright core tube and its wider volumetric glow, in world units. */
export const TUBE_CORE_RADIUS = 0.02;
export const TUBE_GLOW_RADIUS = 0.09;
export const GLOW_STRENGTH = 1;

/** Layered context rings as fractions of the primary semi-major. */
export const RING_FACTORS = [0.46, 0.68, 1.0];

/** A barely-there yaw drift, total radians across the whole piece. It
 *  is not a camera move — the system itself turns a few degrees so the
 *  depth reads as parallax rather than a flat plate. */
export const SLOW_YAW = 0.12;

/* ── Space ───────────────────────────────────────────────────────── */
/** Sparse enough to preserve the black-space negative space. */
export const STAR_COUNT = 220;

/* ── Determinism ─────────────────────────────────────────────────── */
/** Object 0417 — rec-05, the coherent 3:2 lock the survey is built on. */
export const SEED = '13';
