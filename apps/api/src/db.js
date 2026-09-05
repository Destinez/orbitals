import pg from 'pg';

/** Neon and most managed Postgres hosts require TLS. */
export function needsSsl(connectionString) {
  return (
    connectionString.includes('neon.tech') ||
    /sslmode=require/i.test(connectionString)
  );
}

/** node-pg cannot satisfy Neon's channel_binding=require. */
export function normalizeDatabaseUrl(connectionString) {
  try {
    const url = new URL(connectionString);
    url.searchParams.delete('channel_binding');
    return url.toString();
  } catch {
    return connectionString.replace(/([?&])channel_binding=[^&]*&?/i, '$1').replace(/[?&]$/, '');
  }
}

export function createPool(connectionString, { max = 10 } = {}) {
  const normalized = normalizeDatabaseUrl(connectionString);
  const ssl = needsSsl(normalized) ? { rejectUnauthorized: false } : undefined;
  return new pg.Pool({
    connectionString: normalized,
    ssl,
    max,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
}
