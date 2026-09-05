/**
 * Port verification.
 *
 * Renders plates in the browser port and compares them, pixel for pixel,
 * against the reference PNGs the generator produced in
 * `artifacts/reference-render/images/`. Also cross-checks derived traits
 * against `manifest.json`.
 *
 * If this passes, the site can render any token from its seed alone and
 * be trusted to match the artwork. Run: npm run verify:render
 */

import { createServer } from 'vite';
import { PNG } from 'pngjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const harness = path.resolve(root, '..', '..', 'artifacts', 'reference-render');

const server = await createServer({
  root,
  configFile: false,
  server: { middlewareMode: true },
  optimizeDeps: { noDiscovery: true },
});

const { renderPlateRGBA, paramsFromSeed, curveFamilyDisplay, lockDisplay } =
  await server.ssrLoadModule('/src/lib/resonance.ts');

const manifest = JSON.parse(
  fs.readFileSync(path.join(harness, 'manifest.json'), 'utf8'),
);

let imgPass = 0;
let imgFail = 0;
let traitFail = 0;
const failures = [];

for (const token of manifest.tokens) {
  const { tokenId, seed } = token;
  const isSignalLost = tokenId === manifest.signalLostTokenId;

  // ── traits ──
  const p = paramsFromSeed(seed);
  const checks = [
    ['fx', p.fx, token.fx],
    ['fy', Number(p.fy.toFixed(10)), Number(token.fy.toFixed(10))],
    ['palette', p.paletteName, token.paletteName],
    ['coherent', p.isCoherent, token.isCoherent],
    ['binaryLock', p.isBinaryLock, token.isBinaryLock],
    ['deepField', p.isDeepField, token.isDeepField],
    ['spectralSplit', p.isSpectralSplit, token.isSpectralSplit],
    ['signalRes', p.signalResolution, token.signalResolution],
    ['drift', p.isInstrumentDrift, token.isInstrumentDrift],
    ['faded', p.isFaded, token.isFaded],
  ];
  // The Signal Lost token has no curve, so the manifest omits those fields.
  if (!isSignalLost) checks.push(['curveFamily', p.curveFamily, token.curveFamily]);

  for (const [name, got, want] of checks) {
    if (want === undefined) continue;
    if (got !== want) {
      traitFail++;
      failures.push(`token ${tokenId}: trait ${name} got ${got} want ${want}`);
    }
  }

  // ── pixels ──
  const refPath = path.join(harness, 'images', `${tokenId}.png`);
  if (!fs.existsSync(refPath)) continue;
  const ref = PNG.sync.read(fs.readFileSync(refPath));
  const { data, size } = renderPlateRGBA(seed, { isSignalLost });

  if (ref.width !== size || ref.height !== size) {
    imgFail++;
    failures.push(`token ${tokenId}: size ${ref.width}x${ref.height} vs ${size}`);
    continue;
  }

  let diffPixels = 0;
  let maxDelta = 0;
  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const d = Math.abs(data[i + c] - ref.data[i + c]);
      if (d > 0) {
        if (c === 0) diffPixels++;
        if (d > maxDelta) maxDelta = d;
      }
    }
  }

  if (diffPixels === 0 && maxDelta === 0) {
    imgPass++;
  } else {
    imgFail++;
    failures.push(
      `token ${tokenId} (${lockDisplay(p)}, ${p.paletteName}, ${
        isSignalLost ? 'signal-lost' : curveFamilyDisplay(p.curveFamily)
      }): ${diffPixels} px differ, max channel delta ${maxDelta}`,
    );
  }
}

await server.close();

console.log('\n─── Resonance port verification ───');
console.log(`tokens checked      ${manifest.tokens.length}`);
console.log(`pixel-exact plates  ${imgPass}`);
console.log(`plate mismatches    ${imgFail}`);
console.log(`trait mismatches    ${traitFail}`);

if (failures.length) {
  console.log('\nfailures:');
  for (const f of failures.slice(0, 40)) console.log('  ' + f);
  if (failures.length > 40) console.log(`  ...and ${failures.length - 40} more`);
  process.exit(1);
}

console.log('\nOK — browser port reproduces every plate exactly.\n');
