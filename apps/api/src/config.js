const integer = (value, fallback) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isInteger(parsed) ? parsed : fallback;
};

export function loadConfig(env = process.env) {
  const port = integer(env.PORT, 8787);
  const cookieSameSite = env.COOKIE_SAME_SITE === 'None' ? 'None' : 'Lax';
  return {
    port,
    webOrigin: env.WEB_ORIGIN ?? 'http://localhost:5173',
    sessionSecret: env.SESSION_SECRET ?? '',
    campaignPostUrl:
      env.X_CAMPAIGN_POST_URL ?? 'https://x.com/orbitals_nft/status/0000000000000000000',
    orbitalsAccountUrl: env.X_ORBITALS_ACCOUNT_URL ?? 'https://x.com/orbitals_nft',
    databaseUrl: env.DATABASE_URL ?? '',
    secureCookies: env.NODE_ENV === 'production',
    cookieSameSite,
    pgPoolMax: integer(env.PG_POOL_MAX, 10),
    rateLimitWindowMs: integer(env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    rateLimitRegisterMax: integer(env.RATE_LIMIT_REGISTER, 5),
    rateLimitQuoteMax: integer(env.RATE_LIMIT_QUOTE, 8),
    rateLimitMeMax: integer(env.RATE_LIMIT_ME, 120),
  };
}

export function validateConfig(config) {
  const missing = [];
  if (config.sessionSecret.length < 32) missing.push('SESSION_SECRET (minimum 32 characters)');
  if (!config.databaseUrl) missing.push('DATABASE_URL');
  if (config.secureCookies && config.cookieSameSite === 'None' && !config.webOrigin.startsWith('https://')) {
    missing.push('WEB_ORIGIN must be https:// when using cross-origin cookies');
  }
  return missing;
}
