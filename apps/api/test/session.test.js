import assert from 'node:assert/strict';
import test from 'node:test';
import { createSession, readSession, sessionCookie } from '../src/session.js';

const secret = 'a-secret-that-is-long-enough-for-tests';

test('signed sessions round trip through a cookie', () => {
  const value = { type: 'user', userId: '42', expiresAt: Date.now() + 1_000 };
  const token = createSession(value, secret);
  assert.deepEqual(readSession(sessionCookie(token, false), secret), value);
});

test('tampered and expired sessions are rejected', () => {
  const token = createSession({ expiresAt: Date.now() - 1 }, secret);
  assert.equal(readSession(`orbitals_session=${token}`, secret), null);
  assert.equal(readSession(`orbitals_session=${token}x`, secret), null);
});
