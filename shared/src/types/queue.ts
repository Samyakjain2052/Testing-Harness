export interface TestExecutionJobData {
  executionId: string;
  scriptId: string;
  scriptBlobPath: string;
  environmentId: string;
  baseUrl: string;
  envVariables: Record<string, string>;
  options: {
    headless: boolean;
    slowMo: number;
    timeout: number;
    retryOnFailure: boolean;
    captureScreenshots: 'always' | 'only-on-failure' | 'never';
    captureTrace: 'always' | 'retain-on-failure' | 'never';
    browser: 'chromium' | 'firefox' | 'webkit';
  };
}

export interface TestExecutionJobResult {
  executionId: string;
  status: 'passed' | 'failed' | 'error';
  durationMs: number;
  steps: Array<{
    stepNumber: number;
    stepName: string;
    status: 'passed' | 'failed' | 'skipped' | 'error';
    durationMs: number;
    screenshotBlobPath?: string;
    traceBlobPath?: string;
    errorDetails?: string;
  }>;
  reportBlobPath: string;
  traceBlobPath?: string;
}

export interface RecordingSession {
  sessionId: string;
  appId: string;
  targetUrl: string;
  status: 'recording' | 'completed' | 'failed' | 'error';
  outputPath?: string;
  error?: string;
  startedAt: string;
}

export interface IStartRecordingDto {
  target_url: string;
  name: string;
}

export interface ISaveRecordingDto {
  name: string;
  description?: string;
  tags?: string[];
}
