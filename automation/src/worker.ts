import { Worker, type Job } from 'bullmq';
import IORedis from 'ioredis';
import { TestRunner } from './executor/test-runner.js';
import { loadWorkerConfig } from './config/index.js';
import type { TestExecutionJobData, TestExecutionJobResult } from '@testing-harness/shared';

export function createWorker(): Worker<TestExecutionJobData, TestExecutionJobResult> {
  const config = loadWorkerConfig();

  const connection = new IORedis(config.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

  const worker = new Worker<TestExecutionJobData, TestExecutionJobResult>(
    'test-execution',
    async (job: Job<TestExecutionJobData, TestExecutionJobResult>) => {
      console.log(`[Worker] Processing job ${job.id} (execution: ${job.data.executionId})`);
      const runner = new TestRunner(job, config);
      return await runner.execute();
    },
    {
      connection,
      concurrency: config.WORKER_CONCURRENCY,
      limiter: {
        max: 10,
        duration: 60000,
      },
      lockDuration: 300000,
      lockRenewTime: 60000,
    },
  );

  worker.on('completed', (job, result) => {
    console.log(`[Worker] Job ${job.id} completed: ${result.status}`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('[Worker] Error:', err);
  });

  return worker;
}
