'use strict';

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { renderOrbital } = require('./orbitalPreview');
const { buildMetadata } = require('./metadataBuilder');

// Independent worker process — each renders a disjoint slice of token
// ids, fully sequentially within itself. Mirrors renderWorker.js's
// pattern but targets the orbital renderer instead of the old RD one.

process.on('message', async (msg) => {
  if (msg.type !== 'render-range') return;
  const { startId, endId, imagesDir, metadataDir, seedPrefix, signalLostId } = msg;

  const results = [];
  for (let tokenId = startId; tokenId < endId; tokenId++) {
    const seed = seedPrefix ? `${seedPrefix}${tokenId}` : String(tokenId);
    const outPath = path.join(imagesDir, `${tokenId}.png`);

    const meta = await renderOrbital(seed, outPath, { tokenId, signalLostId });

    // Hash the actual written PNG bytes for the uniqueness check —
    // orbitalPreview doesn't expose a raw float field the way the RD
    // renderer did, but the final image bytes are just as valid a
    // fingerprint since rendering is fully deterministic.
    const pngBytes = fs.readFileSync(outPath);
    const pixelHash = crypto.createHash('sha256').update(pngBytes).digest('hex');

    const metadata = buildMetadata(tokenId, meta);
    fs.writeFileSync(path.join(metadataDir, `${tokenId}.json`), JSON.stringify(metadata, null, 2));

    results.push({
      tokenId,
      seed,
      ...meta,
      pixelHash,
    });

    process.send({ type: 'progress', tokenId });
  }

  process.send({ type: 'done', results });
  process.exit(0);
});
