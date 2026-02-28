import { Pool } from 'pg';
import { getConfig } from './index.js';

let _pool: Pool | null = null;

export function getPool(): Pool {
  if (_pool) return _pool;

  const config = getConfig();
  _pool = new Pool({
    connectionString: config.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  _pool.on('error', (err) => {
    console.error('Unexpected PostgreSQL pool error:', err);
  });

  return _pool;
}

export async function closePool(): Promise<void> {
  if (_pool) {
    await _pool.end();
    _pool = null;
  }
}
