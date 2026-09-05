import assert from 'node:assert/strict';
import test from 'node:test';
import { loadConfig, normalizeWebOrigin } from '../src/config.js';
import { normalizeDatabaseUrl } from '../src/db.js';

test('production SameSite None upgrades http site origin to https', () => {
  const config = loadConfig({
    NODE_ENV: 'production',
    COOKIE_SAME_SITE: 'None',
    WEB_ORIGIN: 'http://orbitalsnft.xyz/',
    SESSION_SECRET: 'a-secret-that-is-long-enough-for-tests',
    DATABASE_URL: 'postgres://example',
  });
  assert.equal(config.webOrigin, 'https://orbitalsnft.xyz');
});

test('normalizeWebOrigin strips a trailing slash', () => {
  assert.equal(normalizeWebOrigin('https://orbitalsnft.xyz/'), 'https://orbitalsnft.xyz');
});

test('Neon channel_binding is stripped from DATABASE_URL', () => {
  const raw = 'postgresql://u:p@ep-x-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
  assert.equal(
    normalizeDatabaseUrl(raw),
    'postgresql://u:p@ep-x-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require',
  );
});
