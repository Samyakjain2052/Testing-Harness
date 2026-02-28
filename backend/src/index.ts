import { createServer } from 'http';
import { loadConfig } from './config/index.js';
import { createApp } from './app.js';
import { setupWebSocket } from './websocket/index.js';
import { getPool, closePool } from './config/database.js';
import { closeRedis } from './config/redis.js';
import { closeQueue } from './config/queue.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const app = createApp();
  const httpServer = createServer(app);

  // Set up WebSocket server
  setupWebSocket(httpServer);

  // Verify database connection
  const pool = getPool();
  try {
    await pool.query('SELECT 1');
    console.log('PostgreSQL connected');
  } catch (err) {
    console.error('Failed to connect to PostgreSQL:', err);
    process.exit(1);
  }

  httpServer.listen(config.PORT, () => {
    console.log(`Backend API running on http://localhost:${config.PORT}`);
    console.log(`Environment: ${config.NODE_ENV}`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    httpServer.close();
    await closeQueue();
    await closeRedis();
    await closePool();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('Fatal error during startup:', err);
  process.exit(1);
});
