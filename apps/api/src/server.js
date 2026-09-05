import { createServer } from 'node:http';
import { createApp } from './app.js';
import { loadConfig, validateConfig } from './config.js';
import { createPool } from './db.js';
import { createRateLimiter } from './rateLimit.js';
import { ParticipantStore } from './store.js';

const config = loadConfig();
const missing = validateConfig(config);
if (missing.length) {
  console.warn(`Orbitals API configuration incomplete: ${missing.join(', ')}`);
}

if (missing.length) process.exit(1);

const pool = createPool(config.databaseUrl, { max: config.pgPoolMax });
const store = new ParticipantStore(pool);
const rateLimiters = {
  register: createRateLimiter({
    windowMs: config.rateLimitWindowMs,
    max: config.rateLimitRegisterMax,
  }),
  quote: createRateLimiter({
    windowMs: config.rateLimitWindowMs,
    max: config.rateLimitQuoteMax,
  }),
  me: createRateLimiter({ windowMs: 60_000, max: config.rateLimitMeMax }),
};
const server = createServer(createApp({ config, store, rateLimiters }));
server.listen(config.port, () => {
  console.log(`Orbitals API listening on port ${config.port}`);
});
