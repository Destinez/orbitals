import { Composition } from 'remotion';
import { ResonanceTrailer } from './Composition';
import { TOTAL_FRAMES, FPS, HEIGHT, WIDTH } from './config';

/**
 * Seed 13 is Object 0417 — the coherent 3:2 lock, plasma red on its own
 * plate, and the object named in the station readout. Any other seed in
 * the collection renders here too; the geometry, star density, marker
 * count and marker glyphs all follow from it.
 */
const DEFAULT_SEED = '13';

export const Root = () => (
  <>
    <Composition
      id="ResonanceTrailer"
      component={ResonanceTrailer}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={{ seed: DEFAULT_SEED }}
    />
  </>
);
