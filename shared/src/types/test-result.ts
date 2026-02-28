export enum StepStatus {
  PASSED = 'passed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
  ERROR = 'error',
}

export interface ITestResult {
  id: string;
  execution_id: string;
  step_number: number;
  step_name: string;
  status: StepStatus;
  duration_ms: number | null;
  screenshot_blob_path: string | null;
  trace_blob_path: string | null;
  error_details: string | null;
  expected_value: string | null;
  actual_value: string | null;
  created_at: string;
}
