'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { fork } = require('child_process');

/**
 * Full pre-mint pipeline for the orbital/Resonance collection:
 *   1. Render every token deterministically from its seed, across N
 *      worker processes (see orbitalRenderWorker.js).
 *   2. Write OpenSea-standard metadata JSON per token.
 *   3. Check for exact-duplicate image output (uniqueness floor).
 *   4. Tally trait distribution for a sanity-check rarity report.
 *   5. Produce a single commit hash over the whole manifest, to post
 *      on-chain before mint opens.
 *
 * Usage: node orbitalHarnessParallel.js <supply> [workerCount] [outDir] [signalLostId]
 *
 * signalLostId: which token id is the reserved 1-of-1 "Signal Lost"
 * piece. Defaults to the last token id in the supply if not given —
 * decide this deliberately before a real run, since it can't be
 * changed after the commit hash is posted.
 */
function runWorkerRange(startId, endId, imagesDir, metadataDir, seedPrefix, signalLostId) {
  return new Promise((resolve, reject) => {
    const worker = fork(path.join(__dirname, 'orbitalRenderWorker.js'));

    worker.on('message', (msg) => {
      if (msg.type === 'progress') {
        // lightweight progress ping
      } else if (msg.type === 'done') {
        resolve(msg.results);
      }
    });
    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`worker exited with code ${code} before completing its range`));
      }
    });

    worker.send({ type: 'render-range', startId, endId, imagesDir, metadataDir, seedPrefix, signalLostId });
  });
}

async function runOrbitalHarness(supply, workerCount, outDir, signalLostId) {
  const imagesDir = path.join(outDir, 'images');
  const metadataDir = path.join(outDir, 'metadata');
  fs.mkdirSync(imagesDir, { recursive: true });
  fs.mkdirSync(metadataDir, { recursive: true });

  const resolvedSignalLostId = signalLostId !== undefined ? signalLostId : supply - 1;

  const chunkSize = Math.ceil(supply / workerCount);
  const ranges = [];
  for (let i = 0; i < workerCount; i++) {
    const startId = i * chunkSize;
    const endId = Math.min(startId + chunkSize, supply);
    if (startId < endId) ranges.push([startId, endId]);
  }

  console.log(`Rendering ${supply} tokens across ${ranges.length} worker processes...`);
  console.log(`Signal Lost reserved for token id ${resolvedSignalLostId}`);
  const t0 = Date.now();

  const rangeResults = await Promise.all(
    ranges.map(([startId, endId]) =>
      runWorkerRange(startId, endId, imagesDir, metadataDir, undefined, resolvedSignalLostId))
  );

  const results = rangeResults.flat().sort((a, b) => a.tokenId - b.tokenId);
  const elapsedSec = (Date.now() - t0) / 1000;

  const seenHashes = new Map();
  for (const r of results) {
    if (seenHashes.has(r.pixelHash)) {
      console.warn(`WARNING: token ${r.tokenId} produced an identical image to token ${seenHashes.get(r.pixelHash)}`);
    } else {
      seenHashes.set(r.pixelHash, r.tokenId);
    }
  }

  // Trait tally — sanity check against the percentages worked out
  // earlier, on the REAL rendered set rather than a simulated one.
  const tally = {
    resonanceLock: {},
    spectralClass: {},
    deepField: 0,
    spectralSplit: 0,
    negativeExposure: 0,
    signalResolution: {},
    instrumentDrift: 0,
  };
  for (const r of results) {
    const lockKey = r.isSignalLost ? 'Signal Lost' : r.isCoherent ? 'Coherent' : r.isBinaryLock ? 'Binary Lock' : 'Drifting';
    tally.resonanceLock[lockKey] = (tally.resonanceLock[lockKey] || 0) + 1;
    tally.spectralClass[r.paletteName] = (tally.spectralClass[r.paletteName] || 0) + 1;
    if (r.isDeepField) tally.deepField++;
    if (r.isSpectralSplit) tally.spectralSplit++;
    if (r.isNegativeExposure) tally.negativeExposure++;
    tally.signalResolution[r.signalResolution] = (tally.signalResolution[r.signalResolution] || 0) + 1;
    if (r.isInstrumentDrift) tally.instrumentDrift++;
  }

  const manifest = {
    supply,
    generatedAt: new Date().toISOString(),
    workerCount: ranges.length,
    renderSeconds: elapsedSec,
    signalLostTokenId: resolvedSignalLostId,
    tally,
    tokens: results,
  };

  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  // Commit hash over the full manifest — post this on-chain before
  // mint opens, so the rarity/trait distribution can't be adjusted
  // after the fact.
  const manifestForHash = JSON.stringify({ supply, signalLostTokenId: resolvedSignalLostId, tally, tokens: results });
  const commitHash = crypto.createHash('sha256').update(manifestForHash).digest('hex');
  fs.writeFileSync(path.join(outDir, 'commit-hash.txt'), commitHash + '\n');

  console.log('\n--- Summary ---');
  console.log(`Rendered ${supply} tokens in ${elapsedSec.toFixed(1)}s using ${ranges.length} processes`);
  console.log('Resonance Lock distribution:', tally.resonanceLock);
  console.log('Duplicate images:', results.length - seenHashes.size);
  console.log('Commit hash:', commitHash);

  return { manifest, commitHash };
}

if (require.main === module) {
  const supply = parseInt(process.argv[2], 10) || 3232;
  const workerCount = parseInt(process.argv[3], 10) || os.cpus().length;
  const outDir = process.argv[4] || path.join(__dirname, '..', '..', '..', 'artifacts', 'generated');
  const signalLostId = process.argv[5] !== undefined ? parseInt(process.argv[5], 10) : undefined;
  runOrbitalHarness(supply, workerCount, outDir, signalLostId).catch((err) => {
    console.error('orbital harness failed:', err);
    process.exit(1);
  });
}

module.exports = { runOrbitalHarness };
