import { readdir, readFile } from 'node:fs/promises';
import { createPool } from '../src/db.js';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
const pool = createPool(process.env.DATABASE_URL);
try {
  const directory = new URL('../migrations/', import.meta.url);
  const files = (await readdir(directory)).filter((file) => file.endsWith('.sql')).sort();
  for (const file of files) {
    const sql = await readFile(new URL(file, directory), 'utf8');
    await pool.query(sql);
  }
  console.log('Database migration complete.');
} finally {
  await pool.end();
}
