/**
 * Simple migration runner that executes SQL files in order.
 * Usage: npx tsx backend/src/migrations/run.ts
 */
import fs from 'fs/promises';
import path from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

async function run(): Promise<void> {
  const pool = new Pool({ connectionString: DATABASE_URL });

  // Create migrations tracking table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Get already executed migrations
  const executed = await pool.query('SELECT name FROM _migrations ORDER BY id');
  const executedNames = new Set(executed.rows.map((r: { name: string }) => r.name));

  // Read migration files — use __dirname for CommonJS compat
  const normalizedDir = path.resolve(__dirname);

  const files = (await fs.readdir(normalizedDir))
    .filter((f) => f.endsWith('.sql'))
    .sort();

  let count = 0;
  for (const file of files) {
    if (executedNames.has(file)) {
      console.log(`  Skipping: ${file} (already executed)`);
      continue;
    }

    const sql = await fs.readFile(path.join(normalizedDir, file), 'utf-8');
    console.log(`  Running:  ${file}`);

    try {
      await pool.query('BEGIN');
      await pool.query(sql);
      await pool.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
      await pool.query('COMMIT');
      count++;
    } catch (err) {
      await pool.query('ROLLBACK');
      console.error(`  FAILED:   ${file}`);
      console.error(err);
      process.exit(1);
    }
  }

  console.log(`\nMigrations complete: ${count} new, ${executedNames.size} already applied.`);
  await pool.end();
}

run().catch((err) => {
  console.error('Migration runner failed:', err);
  process.exit(1);
});
