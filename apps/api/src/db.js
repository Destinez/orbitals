import pg from 'pg';

/** Neon and most managed Postgres hosts require TLS. */
export function needsSsl(connectionString) {
  return (
    connectionString.includes('neon.tech') ||
    /sslmode=require/i.test(connectionString)
  );
}

export function createPool(connectionString, { max = 10 } = {}) {
  const ssl = needsSsl(connectionString) ? { rejectUnauthorized: false } : undefined;
  return new pg.Pool({
    connectionString,
    ssl,
    max,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
}
