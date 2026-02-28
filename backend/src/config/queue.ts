import { Queue, QueueEvents } from 'bullmq';
import { createRedisConnection } from './redis.js';
import type { TestExecutionJobData, TestExecutionJobResult } from '@testing-harness/shared';

let _queue: Queue<TestExecutionJobData, TestExecutionJobResult> | null = null;
let _queueEvents: QueueEvents | null = null;

export const QUEUE_NAME = 'test-execution';

export function getTestExecutionQueue(): Queue<TestExecutionJobData, TestExecutionJobResult> {
  if (_queue) return _queue;

  _queue = new Queue<TestExecutionJobData, TestExecutionJobResult>(QUEUE_NAME, {
    connection: createRedisConnection(),
    defaultJobOptions: {
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: {
        age: 86400,
        count: 1000,
      },
      removeOnFail: {
        age: 604800,
      },
    },
  });

  return _queue;
}

export function getQueueEvents(): QueueEvents {
  if (_queueEvents) return _queueEvents;

  _queueEvents = new QueueEvents(QUEUE_NAME, {
    connection: createRedisConnection(),
  });

  return _queueEvents;
}

export async function closeQueue(): Promise<void> {
  if (_queue) {
    await _queue.close();
    _queue = null;
  }
  if (_queueEvents) {
    await _queueEvents.close();
    _queueEvents = null;
  }
}
