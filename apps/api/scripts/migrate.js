import { readdir, readFile } from 'node:fs/promises';
import { createPool } from '../src/db.js';

if (!process.env.DATABASE_URL) {
  console.error('Migration failed: DATABASE_URL is not set on this service.');
  process.exit(1);
}

const pool = createPool(process.env.DATABASE_URL);
try {
  const directory = new URL('../migrations/', import.meta.url);
  const files = (await readdir(directory)).filter((file) => file.endsWith('.sql')).sort();
  for (const file of files) {
    const sql = await readFile(new URL(file, directory), 'utf8');
    for (const statement of splitSql(sql)) {
      await pool.query(statement);
    }
  }
  console.log('Database migration complete.');
} catch (error) {
  console.error('Migration failed:', error.message);
  process.exit(1);
} finally {
  await pool.end();
}

function splitSql(sql) {
  const parts = [];
  let current = '';
  let inDollar = false;
  const source = sql.replace(/--[^\n]*/g, '');
  for (let i = 0; i < source.length; i += 1) {
    if (source.startsWith('$$', i)) {
      inDollar = !inDollar;
      current += '$$';
      i += 1;
      continue;
    }
    if (source[i] === ';' && !inDollar) {
      const trimmed = current.trim();
      if (trimmed) parts.push(trimmed);
      current = '';
    } else {
      current += source[i];
    }
  }
  const trimmed = current.trim();
  if (trimmed) parts.push(trimmed);
  return parts;
}
