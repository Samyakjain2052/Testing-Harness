import { ExecutionStatus } from '../types/test-execution.js';
import { StepStatus } from '../types/test-result.js';

export const TERMINAL_STATUSES: ReadonlySet<ExecutionStatus> = new Set([
  ExecutionStatus.PASSED,
  ExecutionStatus.FAILED,
  ExecutionStatus.ERROR,
  ExecutionStatus.CANCELLED,
]);

export function isTerminalStatus(status: ExecutionStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

export const STATUS_LABELS: Record<ExecutionStatus, string> = {
  [ExecutionStatus.QUEUED]: 'Queued',
  [ExecutionStatus.RUNNING]: 'Running',
  [ExecutionStatus.PASSED]: 'Passed',
  [ExecutionStatus.FAILED]: 'Failed',
  [ExecutionStatus.ERROR]: 'Error',
  [ExecutionStatus.CANCELLED]: 'Cancelled',
};

export const STEP_STATUS_LABELS: Record<StepStatus, string> = {
  [StepStatus.PASSED]: 'Passed',
  [StepStatus.FAILED]: 'Failed',
  [StepStatus.SKIPPED]: 'Skipped',
  [StepStatus.ERROR]: 'Error',
};

export const DEFAULTS = {
  TEST_TIMEOUT_MS: 60000,
  WORKER_CONCURRENCY: 2,
  MAX_RETRIES: 1,
  RECORDING_TIMEOUT_MS: 600000, // 10 minutes
  STALE_RECORDING_CLEANUP_MS: 1800000, // 30 minutes
  MAX_FILE_SIZE_BYTES: 1048576, // 1 MB
} as const;
