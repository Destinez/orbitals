import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';
import { createApp } from '../src/app.js';

const config = {
  webOrigin: 'http://localhost:5173',
  sessionSecret: 'a-secret-that-is-long-enough-for-tests',
  campaignPostUrl: 'https://x.com/orbitals/status/1',
  orbitalsAccountUrl: 'https://x.com/orbitals',
  secureCookies: false,
};

test('public API exposes health and anonymous campaign state', async () => {
  const store = { get: async () => null };
  const server = createServer(createApp({ config, store }));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  try {
    const health = await fetch(`http://127.0.0.1:${address.port}/api/health`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { ok: true });

    const me = await fetch(`http://127.0.0.1:${address.port}/api/me`);
    assert.equal(me.status, 200);
    assert.deepEqual(await me.json(), {
      registered: false,
      username: '',
      quoteUrl: '',
      walletAddress: '',
      campaign: {
        postUrl: 'https://x.com/orbitals/status/1',
        accountUrl: 'https://x.com/orbitals',
      },
    });
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
