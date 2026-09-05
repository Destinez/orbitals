/**
 * Deterministic 3D orbital geometry.
 *
 * Not a drawn ellipse — a parametric orbital system generated from the
 * token seed. `paramsFromSeed` ties the configuration to the actual
 * archive object (seed 13 / Object 0417, the coherent 3:2 lock), and a
 * dedicated PRNG stream fixes the spatial parameters so every render is
 * identical.
 *
 * The primary orbit is an elongated, inclined ellipse. Layered context
 * rings share its inclination at different radii, giving the system a
 * Saturn-like ring depth. Everything is returned as plain number tuples;
 * the components lift them into three.js curves.
 */

import { createPRNG, randFloat } from '../../web/src/lib/prng';
import { paramsFromSeed } from '../../web/src/lib/resonance';
import {
  INCLINATION_MAX_DEG,
  INCLINATION_MIN_DEG,
  ORBIT_ELONGATION,
  ORBIT_SEMI_MAJOR,
  RING_FACTORS,
} from './config';

export type Vec3 = [number, number, number];
export type MarkerKind = 'ring' | 'star' | 'point';

export interface OrbitMarker {
  position: Vec3;
  kind: MarkerKind;
  /** fraction along the primary orbit, 0..1 */
  at: number;
}

export interface OrbitRing {
  points: Vec3[];
  /** semi-major of this ring, world units */
  radius: number;
}

export interface Orbit3D {
  primary: Vec3[];
  rings: OrbitRing[];
  markers: OrbitMarker[];
  inclinationDeg: number;
  ratioLabel: string;
  /** the resolved geometry parameters, for the interface readouts */
  eccentricity: number;
}

const PRIMARY_SEGMENTS = 512;
const RING_SEGMENTS = 320;

function ellipse(
  segments: number,
  a: number,
  b: number,
  inclRad: number,
  yaw: number,
  phase: number,
): Vec3[] {
  const cosI = Math.cos(inclRad);
  const sinI = Math.sin(inclRad);
  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);
  const pts: Vec3[] = new Array(segments + 1);

  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2 + phase;
    const ex = a * Math.cos(t);
    const ez = b * Math.sin(t);
    // incline about X: the near arc dips toward the camera
    const y = -ez * sinI;
    const z = ez * cosI;
    // small yaw about Y so the long axis isn't perfectly horizontal
    const x = ex * cosY - z * sinY;
    const zz = ex * sinY + z * cosY;
    pts[i] = [x, y, zz];
  }
  return pts;
}

export function buildOrbit3D(seed: string): Orbit3D {
  const params = paramsFromSeed(seed);
  const rand = createPRNG(`${seed}:orbit3d`);

  const inclinationDeg =
    INCLINATION_MIN_DEG + rand() * (INCLINATION_MAX_DEG - INCLINATION_MIN_DEG);
  const inclRad = (inclinationDeg * Math.PI) / 180;
  const yaw = (rand() - 0.5) * 0.42;
  const phase = rand() * Math.PI * 2;

  const a = ORBIT_SEMI_MAJOR;
  const b = a * (ORBIT_ELONGATION + (rand() - 0.5) * 0.05);
  const eccentricity = Math.sqrt(Math.max(0, 1 - (b * b) / (a * a)));

  const primary = ellipse(PRIMARY_SEGMENTS, a, b, inclRad, yaw, phase);

  const rings: OrbitRing[] = RING_FACTORS.map((f, i) => {
    const ra = a * f;
    const rb = ra * (b / a);
    const wobble = ((i % 2 === 0 ? 1 : -1) * (2 + rand() * 2) * Math.PI) / 180;
    return {
      points: ellipse(RING_SEGMENTS, ra, rb, inclRad + wobble, yaw, phase),
      radius: ra,
    };
  });

  const ratioLabel = params.isCoherent
    ? `${params.fx}:${params.fyInt}`
    : `${params.fx}:${params.fyInt}`;

  const markerFractions = [0.13, 0.37, 0.62, 0.85];
  const kinds: MarkerKind[] = ['ring', 'star', 'point', 'ring'];
  const markers: OrbitMarker[] = markerFractions.map((frac, i) => {
    const at = Math.min(0.97, Math.max(0.03, frac + randFloat(rand, -0.03, 0.03)));
    const idx = Math.round(at * PRIMARY_SEGMENTS);
    return { position: primary[idx], kind: kinds[i], at };
  });

  return { primary, rings, markers, inclinationDeg, ratioLabel, eccentricity };
}
