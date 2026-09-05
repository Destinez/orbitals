import type { AnyPaletteName } from '../lib/palettes';

/**
 * FIELD NOTES — SURVEY LOG.
 *
 * Copy is data, never markup. The voice follows the project's writing
 * directive: flat, dated, specific, no metaphor, no manufactured
 * significance, conclusions left to the reader. Real citations are used
 * because the argument only works if the precedent is real — Laplace on
 * the Galilean moons, Kirkwood on the asteroid gaps, Le Verrier and Adams
 * on Neptune, Batygin and Brown on the ninth planet, and the five sigma
 * threshold from the 2012 Higgs confirmation.
 *
 * `lines` is also the transmission transcript. The terminal types it and
 * the voice reads it, so the caption and the audio are never out of sync
 * by construction.
 */

export type StageKind =
  | 'boot'
  | 'station'
  | 'field'
  | 'transit'
  | 'trace'
  | 'lock'
  | 'lost'
  | 'archive';

export interface Chapter {
  id: string;
  rec: string | null;
  title: string;
  /** canonical MET, DD:HH:MM:SS */
  met: string;
  /** pass number shown in the readout */
  plate: string | null;
  spectral: AnyPaletteName | null;
  /** scroll length in viewport heights — sets the pin duration */
  beats: number;
  stage: StageKind;
  /**
   * Seed of the plate this record renders live. Real tokens from the
   * verified batch:
   *   10 — emerald, harmonic, drifting
    *   13 — plasma red, coherent 3:2
   *   22 — the reserved 1/1, Signal Lost
   */
  plateSeed?: string;
  /** optional seed used only for the displayed ink colour */
  colorSeed?: string;
  /** signal strength across the record, 0..1 */
  signal: [number, number];
  slug?: string;
  align?: 'left' | 'center';
  lines: string[];
  /** set larger, in the signal colour */
  quote?: string;
  /** trailing readout printed under the copy, e.g. a measurement */
  readout?: [string, string][];
}

export const STATION = {
  designation: 'KX-19',
  name: 'SURVEY STATION',
  sector: 'SECTOR 44-VELA',
  commissioned: 'Y. 2231',
  object: '0417',
} as const;

export const CHAPTERS: Chapter[] = [
  {
    id: 'rec-00',
    rec: null,
    title: 'COLD OPEN',
    met: '00:00:00:00',
    plate: null,
    spectral: null,
    beats: 2.2,
    stage: 'boot',
    signal: [0, 0.06],
    lines: [],
  },
  {
    id: 'rec-01',
    rec: '01',
    title: 'RESONANCE',
    met: '00:00:00:00',
    plate: '0001',
    spectral: 'ion',
    beats: 3.2,
    stage: 'station',
    signal: [0.06, 0.14],
    slug: 'Field notes, entry 1',
    lines: [
      'Every planet with a moon eventually locks part of its system into resonance. Neptune and Pluto complete three orbits to two, a ratio stable enough that Pluto crosses Neptune’s path without ever colliding with it.',
      'Laplace worked out the mechanics in 1784. Io, Europa and Ganymede fall into a 1:2:4 pattern and hold it, each moon’s pull correcting the next.',
      'A resonance is not a coincidence of matching periods. It requires a driver: mass exchanging momentum with mass, one body correcting another every time the ratio starts to slip.',
    ],
  },
  {
    id: 'rec-02',
    rec: '02',
    title: 'PRECEDENT',
    met: '02:04:11:38',
    plate: '0912',
    spectral: 'solar',
    beats: 3.4,
    stage: 'field',
    signal: [0.14, 0.24],
    slug: 'Prior determinations',
    lines: [
      'Kirkwood noticed the same principle from the opposite direction in 1866. Asteroids at certain distances from the sun are systematically absent, swept clear by resonance with Jupiter.',
      'Resonance can announce a body’s presence or account for its absence. It does not occur without one.',
      'In 1846 Le Verrier and Adams used irregularities in Uranus’s orbit to calculate the position of a planet no one had seen. Neptune was found within a degree of the predicted coordinates. The orbit came first. The object came after.',
    ],
  },
  {
    id: 'rec-03',
    rec: '03',
    title: 'OBJECT 0417',
    met: '04:17:22:09',
    plate: '2140',
    spectral: 'emerald',
    beats: 3.4,
    stage: 'transit',
    signal: [0.24, 0.44],
    slug: 'First logged pass',
    lines: [
      'The method is still in use. In 2016 Batygin and Brown proposed a ninth planet in the outer solar system, inferred entirely from the clustering of several distant objects’ orbits, objects that behave as though something large is shepherding them.',
      'The planet has not been directly observed. The clustering has not gone away.',
      'Survey object 0417 was logged the same way.',
    ],
  },
  {
    id: 'rec-04',
    rec: '04',
    title: 'THE RATIO',
    met: '04:17:22:18',
    plate: '2141',
    spectral: 'nebula',
    beats: 4.2,
    stage: 'trace',
    plateSeed: '10',
    colorSeed: '7',
    signal: [0.44, 0.78],
    slug: 'Frequency plot, both axes',
    lines: [
      'The orbit of 0417 carries a 3:2 resonance. Clean, stable, consistent with a body of significant mass holding station nearby.',
      'Frequency was plotted on both axes, which is the oldest method in the instrument’s manual. Every pass returns the same figure.',
      'The ratio does not drift.',
    ],
    readout: [
      ['RATIO', '3:2'],
      ['DRIFT', 'NONE'],
      ['PASSES', '3,232'],
    ],
  },
  {
    id: 'rec-05',
    rec: '05',
    title: 'PREDICTED POSITION',
    met: '08:22:03:00',
    plate: '3061',
    spectral: 'plasma_red',
    beats: 3.6,
    stage: 'lock',
    plateSeed: '13',
    signal: [0.78, 1],
    slug: 'Calculated coordinate',
    lines: [
      'A resonance this clean requires a driver, and a driver has a position. That position was calculated to the same standard used for the 2016 proposal.',
      'The coordinate was then checked against every instrument the survey had.',
    ],
    readout: [
      ['METHOD', 'ORBITAL INFERENCE'],
      ['STANDARD', '2016 PROPOSAL'],
      ['INSTRUMENTS', 'ALL'],
    ],
  },
  {
    id: 'rec-06',
    rec: '06',
    title: 'BELOW FIVE SIGMA',
    met: '08:22:03:09',
    plate: '3062',
    spectral: null,
    beats: 4.2,
    stage: 'lost',
    plateSeed: '22',
    signal: [1, 0],
    slug: 'Result at predicted coordinate',
    align: 'center',
    quote: 'Nothing was there.',
    lines: [
      'Signal-to-noise at that coordinate came back below five sigma, the same threshold used to confirm the Higgs boson in 2012 and the same one used to rule out a false positive.',
      'Below five sigma, a detection is treated as absent, not merely faint.',
    ],
    readout: [
      ['S/N', '< 5σ'],
      ['CLASSIFICATION', 'ABSENT'],
    ],
  },
  {
    id: 'rec-07',
    rec: '07',
    title: 'THE ARCHIVE',
    met: '——:——:——:——',
    plate: null,
    spectral: 'emerald',
    beats: 3.6,
    stage: 'archive',
    signal: [0, 0.3],
    slug: 'Passes recorded to date',
    align: 'center',
    lines: [
      'The resonance has not decayed in the time since. A resonance without a driver should decay. This one hasn’t.',
      'The survey has continued logging every pass. Three thousand two hundred and thirty-two recorded to date. Each one shows the same lock, the same ratio, the same missing mass.',
      'No note has been added speculating on cause. None is warranted yet.',
    ],
  },
];

/** Boot lines for the cold open, printed one at a time. */
export const BOOT_LINES: Array<[string, string]> = [
  ['SURVEY STATION', `${STATION.designation}`],
  ['SECTOR', '44-VELA'],
  ['POWER', 'AUXILIARY'],
  ['CREW', '0'],
  ['ARCHIVE', '71% RECOVERABLE'],
  ['TRACKED OBJECT', STATION.object],
];

/**
 * Trait legend. Values and weightings are read off the generator, not
 * invented for the site.
 */
export const TRAIT_LEGEND: Array<{ trait: string; values: string }> = [
  {
    trait: 'Resonance Lock',
    values: 'Drifting · Binary Lock · Coherent · Signal Lost',
  },
  { trait: 'Curve Family', values: 'Harmonic · Rosette' },
  { trait: 'Spectral Class', values: 'Ion · Solar · Nebula · Emerald' },
  { trait: 'Signal Resolution', values: 'Full · High · Standard · Low' },
  { trait: 'Field Depth', values: 'Standard Field · Deep Field' },
  { trait: 'Spectral Split', values: 'None · Present' },
  { trait: 'Instrument Drift', values: 'None · Present' },
  { trait: 'Exposure Tone', values: 'Full Saturation · Faded' },
];

export const TOTAL_BEATS = CHAPTERS.reduce((n, c) => n + c.beats, 0);
export const TOTAL_RECS = CHAPTERS.filter((c) => c.rec).length;
