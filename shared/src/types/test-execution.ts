export enum ExecutionStatus {
  QUEUED = 'queued',
  RUNNING = 'running',
  PASSED = 'passed',
  FAILED = 'failed',
  ERROR = 'error',
  CANCELLED = 'cancelled',
}

export interface ITestExecution {
  id: string;
  script_id: string;
  environment_id: string;
  status: ExecutionStatus;
  queue_job_id: string | null;
  triggered_by: string;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  error_message: string | null;
  retry_count: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ITriggerExecutionDto {
  environment_id: string;
  options?: {
    headless?: boolean;
    slowMo?: number;
    timeout?: number;
    browser?: 'chromium' | 'firefox' | 'webkit';
    captureScreenshots?: 'always' | 'only-on-failure' | 'never';
    captureTrace?: 'always' | 'retain-on-failure' | 'never';
  };
}
