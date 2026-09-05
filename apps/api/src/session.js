import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE_NAME = 'orbitals_session';

const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');

export function createSession(value, secret) {
  const payload = encode(value);
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function readSession(cookieHeader, secret) {
  if (!cookieHeader || !secret) return null;
  const cookies = Object.fromEntries(cookieHeader.split(';').map((part) => {
    const separator = part.indexOf('=');
    return [part.slice(0, separator).trim(), part.slice(separator + 1).trim()];
  }));
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = createHmac('sha256', secret).update(payload).digest('base64url');
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (providedBuffer.length !== expectedBuffer.length || !timingSafeEqual(providedBuffer, expectedBuffer)) return null;
  try {
    const value = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!value.expiresAt || Date.now() >= value.expiresAt) return null;
    return value;
  } catch {
    return null;
  }
}

export function sessionCookie(value, secure, sameSite = 'Lax') {
  const attributes = [
    `${COOKIE_NAME}=${value}`,
    'Path=/',
    'HttpOnly',
    `SameSite=${sameSite}`,
    'Max-Age=2592000',
  ];
  if (secure) attributes.push('Secure');
  return attributes.join('; ');
}

export function clearSessionCookie(secure, sameSite = 'Lax') {
  const attributes = [
    `${COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    `SameSite=${sameSite}`,
    'Max-Age=0',
  ];
  if (secure) attributes.push('Secure');
  return attributes.join('; ');
}
