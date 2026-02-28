import IORedis from 'ioredis';
import { getConfig } from './index.js';

let _connection: IORedis | null = null;

export function getRedisConnection(): IORedis {
  if (_connection) return _connection;

  const config = getConfig();
  _connection = new IORedis(config.REDIS_URL, {
    maxRetriesPerRequest: null, // required for BullMQ
    enableReadyCheck: false,
  });

  _connection.on('error', (err) => {
    console.error('Redis connection error:', err.message);
  });

  return _connection;
}

/**
 * Creates a new IORedis connection for BullMQ workers/queues.
 * BullMQ requires separate connections for different roles.
 */
export function createRedisConnection(): IORedis {
  const config = getConfig();
  return new IORedis(config.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

export async function closeRedis(): Promise<void> {
  if (_connection) {
    await _connection.quit();
    _connection = null;
  }
}
