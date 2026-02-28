import { getTestExecutionQueue, getQueueEvents } from '../config/queue.js';
import { getBroadcaster } from '../websocket/index.js';
import type {
  ITestExecution,
  ITestScript,
  IEnvironment,
  TestExecutionJobData,
} from '@testing-harness/shared';

export class QueueService {
  async enqueueExecution(
    execution: ITestExecution,
    script: ITestScript,
    env: IEnvironment,
    options?: {
      headless?: boolean;
      slowMo?: number;
      timeout?: number;
      browser?: 'chromium' | 'firefox' | 'webkit';
      captureScreenshots?: 'always' | 'only-on-failure' | 'never';
      captureTrace?: 'always' | 'retain-on-failure' | 'never';
    },
  ): Promise<string> {
    const queue = getTestExecutionQueue();

    const jobData: TestExecutionJobData = {
      executionId: execution.id,
      scriptId: script.id,
      scriptBlobPath: script.blob_path,
      environmentId: env.id,
      baseUrl: env.base_url,
      envVariables: env.variables || {},
      options: {
        headless: options?.headless ?? true,
        slowMo: options?.slowMo ?? 0,
        timeout: options?.timeout ?? 60000,
        retryOnFailure: false,
        captureScreenshots: options?.captureScreenshots ?? 'only-on-failure',
        captureTrace: options?.captureTrace ?? 'retain-on-failure',
        browser: options?.browser ?? 'chromium',
      },
    };

    const job = await queue.add('run-test', jobData, {
      jobId: execution.id,
      priority: 1,
    });

    return job.id!;
  }

  setupQueueEventListeners(): void {
    const queueEvents = getQueueEvents();
    const broadcaster = getBroadcaster();

    queueEvents.on('progress', ({ jobId, data }) => {
      if (broadcaster && typeof data === 'object' && data !== null) {
        broadcaster.broadcast(jobId, {
          type: 'progress',
          ...(data as Record<string, unknown>),
        });
      }
    });

    queueEvents.on('completed', ({ jobId, returnvalue }) => {
      if (broadcaster) {
        try {
          const result = JSON.parse(returnvalue);
          broadcaster.broadcast(jobId, {
            type: 'status_change',
            status: result.status,
          });
        } catch {
          broadcaster.broadcast(jobId, {
            type: 'status_change',
            status: 'passed',
          });
        }
      }
    });

    queueEvents.on('failed', ({ jobId, failedReason }) => {
      if (broadcaster) {
        broadcaster.broadcast(jobId, {
          type: 'status_change',
          status: 'error',
          error: failedReason,
        });
      }
    });
  }
}
