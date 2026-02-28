export const BLOB_CONTAINERS = {
  TEST_SCRIPTS: 'test-scripts',
  TEST_ARTIFACTS: 'test-artifacts',
  RECORDINGS: 'recordings',
} as const;

export const BlobPaths = {
  scriptFile: (appId: string, scriptId: string, version: number): string =>
    `${appId}/${scriptId}/v${version}/test.spec.ts`,

  scriptMetadata: (appId: string, scriptId: string): string =>
    `${appId}/${scriptId}/script-metadata.json`,

  screenshot: (executionId: string, stepNumber: number, name: string): string => {
    const padded = String(stepNumber).padStart(3, '0');
    const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
    return `${executionId}/screenshots/step-${padded}-${safeName}.png`;
  },

  trace: (executionId: string): string => `${executionId}/traces/trace.zip`,

  report: (executionId: string): string => `${executionId}/reports/report.json`,

  stdout: (executionId: string): string => `${executionId}/logs/stdout.log`,

  stderr: (executionId: string): string => `${executionId}/logs/stderr.log`,

  recordingRaw: (sessionId: string): string => `${sessionId}/raw-codegen-output.ts`,

  recordingParameterized: (sessionId: string): string => `${sessionId}/parameterized.spec.ts`,

  recordingMetadata: (sessionId: string): string => `${sessionId}/recording-metadata.json`,
} as const;
