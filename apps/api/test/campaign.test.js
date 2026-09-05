import assert from 'node:assert/strict';
import test from 'node:test';
import { campaignPayload, isPostLive, parsePostUrl } from '../src/campaign.js';

test('only numeric X status URLs count as live', () => {
  assert.equal(parsePostUrl('https://x.com/orbitals_nft/status/1234567890123456789'), 'https://x.com/orbitals_nft/status/1234567890123456789');
  assert.equal(isPostLive('https://x.com/orbitals_nft/status/1234567890123456789'), true);
  assert.equal(isPostLive(''), false);
  assert.equal(isPostLive('https://x.com/orbitals_nft/status/REPLACE_WITH_POST_ID'), false);
  assert.equal(isPostLive('https://x.com/orbitals_nft/status/000rer'), false);
});

test('campaign payload falls back to config when the row is empty', () => {
  const config = {
    campaignPostUrl: '',
    orbitalsAccountUrl: 'https://x.com/orbitals_nft',
  };
  assert.deepEqual(campaignPayload(null, config), {
    postUrl: '',
    accountUrl: 'https://x.com/orbitals_nft',
    postLive: false,
  });
});
