import { randomUUID } from 'node:crypto';
import { clearSessionCookie, createSession, readSession, sessionCookie } from './session.js';
import { clientIp } from './rateLimit.js';

const SESSION_LIFETIME = 30 * 24 * 60 * 60 * 1000;

export function createApp({ config, store, rateLimiters, now = Date.now }) {
  return async function app(request, response) {
    setCors(request, response, config.webOrigin);
    if (request.method === 'OPTIONS') return send(response, 204);

    const url = new URL(request.url, `http://${request.headers.host ?? 'localhost'}`);
    const ip = clientIp(request);
    try {
      if (request.method === 'GET' && url.pathname === '/api/health') return json(response, 200, { ok: true });

      const session = readSession(request.headers.cookie, config.sessionSecret);
      const participant = session?.type === 'user' ? await store.get(session.userId) : null;

      if (request.method === 'GET' && url.pathname === '/api/me') {
        if (rateLimiters && !rateLimiters.me(`${ip}:me`)) {
          return json(response, 429, { error: 'Too many requests. Try again shortly.' });
        }
        return json(response, 200, publicParticipant(participant, config));
      }
      if (request.method === 'POST' && url.pathname === '/api/register') {
        if (rateLimiters && !rateLimiters.register(`${ip}:register`)) {
          return json(response, 429, { error: 'Too many registration attempts. Try again later.' });
        }
        if (participant) return json(response, 409, { error: 'This session already carries an observer record.' });
        const body = await readJson(request);
        const username = normalizeUsername(body.username);
        const walletAddress = normalizeWallet(body.walletAddress);
        if (!username) return json(response, 400, { error: 'Enter a valid X username.' });
        if (!walletAddress) return json(response, 400, { error: 'Enter a valid EVM wallet address.' });
        try {
          const created = await store.create({ id: randomUUID(), username, walletAddress, createdAt: new Date(now()).toISOString() });
          setUserSession(response, created.id, config, now);
          return json(response, 201, publicParticipant(created, config));
        } catch (error) {
          if (error.code === '23505') return json(response, 409, { error: 'That X identity or wallet is already recorded.' });
          throw error;
        }
      }
      if (request.method === 'POST' && url.pathname === '/api/logout') {
        response.setHeader('set-cookie', clearSessionCookie(config.secureCookies, config.cookieSameSite));
        return send(response, 204);
      }
      if (!participant) return json(response, 401, { error: 'Register an observer record first.' });

      if (request.method === 'POST' && url.pathname === '/api/tasks/quote') {
        if (rateLimiters && !rateLimiters.quote(`${ip}:quote`)) {
          return json(response, 429, { error: 'Too many submission attempts. Try again later.' });
        }
        if (participant.quoteUrl) {
          return json(response, 409, { error: 'Observer record already filed.' });
        }
        const body = await readJson(request);
        const quote = parseQuoteUrl(body.url);
        if (!quote) return json(response, 400, { error: 'Enter a public x.com quote-post URL.' });
        if (quote.username !== participant.username.toLowerCase()) {
          return json(response, 400, { error: 'The quote link must belong to your registered X username.' });
        }
        const updated = await store.saveQuote(participant.id, quote.url, new Date(now()).toISOString());
        return json(response, 200, publicParticipant(updated, config));
      }
      return json(response, 404, { error: 'Not found.' });
    } catch (error) {
      console.error(error);
      return json(response, error.status ?? 500, { error: error.status ? error.message : 'Internal server error.' });
    }
  };
}

function publicParticipant(participant, config) {
  return {
    registered: Boolean(participant),
    username: participant?.username ?? '',
    walletAddress: participant?.walletAddress ?? '',
    quoteUrl: participant?.quoteUrl ?? '',
    campaign: { postUrl: config.campaignPostUrl, accountUrl: config.orbitalsAccountUrl },
  };
}

function normalizeUsername(value) {
  if (typeof value !== 'string') return null;
  const username = value.trim().replace(/^@/, '').toLowerCase();
  return /^[a-z0-9_]{1,15}$/.test(username) ? username : null;
}

function normalizeWallet(value) {
  return typeof value === 'string' && /^0x[0-9a-fA-F]{40}$/.test(value.trim()) ? value.trim().toLowerCase() : null;
}

function parseQuoteUrl(value) {
  try {
    const url = new URL(value);
    if (!['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com'].includes(url.hostname.toLowerCase())) return null;
    const match = url.pathname.match(/^\/([A-Za-z0-9_]{1,15})\/status\/(\d+)/);
    if (!match) return null;
    return { username: match[1].toLowerCase(), url: `https://x.com/${match[1]}/status/${match[2]}` };
  } catch {
    return null;
  }
}

function setUserSession(response, userId, config, now) {
  const token = createSession({ type: 'user', userId, expiresAt: now() + SESSION_LIFETIME }, config.sessionSecret);
  response.setHeader('set-cookie', sessionCookie(token, config.secureCookies, config.cookieSameSite));
}

function setCors(request, response, origin) {
  if (request.headers.origin === origin) {
    response.setHeader('access-control-allow-origin', origin);
    response.setHeader('access-control-allow-credentials', 'true');
    response.setHeader('vary', 'Origin');
  }
  response.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS');
  response.setHeader('access-control-allow-headers', 'content-type');
  response.setHeader('x-content-type-options', 'nosniff');
  response.setHeader('referrer-policy', 'strict-origin-when-cross-origin');
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 16_384) throw Object.assign(new Error('Request body is too large.'), { status: 413 });
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw Object.assign(new Error('Invalid JSON body.'), { status: 400 });
  }
}

function json(response, status, body) {
  response.statusCode = status;
  response.setHeader('content-type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(body));
}

function send(response, status) {
  response.statusCode = status;
  response.end();
}
