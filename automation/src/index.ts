import { loadWorkerConfig } from './config/index.js';
import { createWorker } from './worker.js';

async function main(): Promise<void> {
  const config = loadWorkerConfig();
  console.log(`[Automation] Starting worker (concurrency: ${config.WORKER_CONCURRENCY})`);

  const worker = createWorker();

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n[Automation] ${signal} received. Shutting down gracefully...`);
    await worker.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  console.log('[Automation] Worker is listening for jobs...');
}

main().catch((err) => {
  console.error('[Automation] Fatal error:', err);
  process.exit(1);
});
