'use strict';

/**
 * Converts the raw trait flags returned by renderOrbital() into a
 * standard OpenSea-style metadata object:
 *   { name, description, image, attributes: [{trait_type, value}] }
 *
 * This is the actual tokenURI-facing shape marketplaces expect — the
 * missing piece between "we have a renderer" and "we have a mintable
 * collection."
 */

function buildAttributes(meta) {
  const attributes = [];

  // Resonance Lock — the collection's namesake trait.
  let lockValue;
  if (meta.isSignalLost) lockValue = 'Signal Lost';
  else if (meta.isCoherent) lockValue = 'Coherent';
  else if (meta.isBinaryLock) lockValue = 'Binary Lock';
  else lockValue = 'Drifting';
  attributes.push({ trait_type: 'Resonance Lock', value: lockValue });

  // Frequency ratio, as a display string — skipped entirely for the
  // Signal Lost piece, since it has no curve/ratio at all.
  if (!meta.isSignalLost) {
    const fxInt = meta.fx;
    const fyInt = typeof meta.fy === 'number' ? Math.round(meta.fy) : meta.fy;
    attributes.push({ trait_type: 'Frequency Ratio', value: `${fxInt}:${fyInt}` });
    attributes.push({
      trait_type: 'Curve Family',
      value: meta.curveFamily === 'spirograph' ? 'Rosette' : 'Harmonic',
    });
  }

  // Spectral Class — palette name, human-readable.
  const paletteDisplay = {
    ion: 'Ion', solar: 'Solar', nebula: 'Nebula', emerald: 'Emerald',
    laser_magenta: 'Laser Magenta', electric_lime: 'Electric Lime',
    plasma_red: 'Plasma Red', ultraviolet: 'Ultraviolet',
  };
  if (!meta.isSignalLost) {
    attributes.push({
      trait_type: 'Spectral Class',
      value: paletteDisplay[meta.paletteName] || meta.paletteName,
    });
  }

  attributes.push({ trait_type: 'Field Depth', value: meta.isDeepField ? 'Deep Field' : 'Standard Field' });

  if (!meta.isSignalLost) {
    attributes.push({ trait_type: 'Spectral Split', value: meta.isSpectralSplit ? 'Present' : 'None' });
    const resDisplay = { full: 'Full', high: 'High', standard: 'Standard', low: 'Low' };
    attributes.push({ trait_type: 'Signal Resolution', value: resDisplay[meta.signalResolution] || meta.signalResolution });
    attributes.push({ trait_type: 'Instrument Drift', value: meta.isInstrumentDrift ? 'Present' : 'None' });
    attributes.push({ trait_type: 'Exposure Tone', value: meta.isFaded ? 'Faded' : 'Full Saturation' });
  }

  return attributes;
}

function buildMetadata(tokenId, meta, opts = {}) {
  const { imageBaseURI = 'ipfs://REPLACE_WITH_CID/', collectionName = 'Resonance' } = opts;

  const name = meta.isSignalLost
    ? `${collectionName} — Signal Lost`
    : `${collectionName} #${tokenId}`;

  const description = meta.isSignalLost
    ? 'The signal resolved once, briefly, before it was lost. This is what came through in that window — and what didn\'t.'
    : `A tracked instance of the resonance. Lock state: ${meta.isCoherent ? 'confirmed 3:2' : meta.isBinaryLock ? 'binary' : 'drifting'}.`;

  return {
    name,
    description,
    image: `${imageBaseURI}${tokenId}.png`,
    attributes: buildAttributes(meta),
  };
}

module.exports = { buildMetadata, buildAttributes };
