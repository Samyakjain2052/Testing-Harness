import { spawn } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';
import fs from 'fs/promises';
import type { Job } from 'bullmq';
import { Pool } from 'pg';
import { ScriptLoader } from './script-loader.js';
import { ResultCollector } from './result-collector.js';
import { ArtifactUploader } from './artifact-uploader.js';
import { TempDir } from '../utils/temp-dir.js';
import type { WorkerConfig } from '../config/index.js';
import type { TestExecutionJobData, TestExecutionJobResult } from '@testing-harness/shared';

export class TestRunner {
  private job: Job<TestExecutionJobData, TestExecutionJobResult>;
  private config: WorkerConfig;
  private tempDir = '';
  private pool: Pool;

  constructor(job: Job<TestExecutionJobData, TestExecutionJobResult>, config: WorkerConfig) {
    this.job = job;
    this.config = config;
    this.pool = new Pool({ connectionString: config.DATABASE_URL, max: 3 });
  }

  async execute(): Promise<TestExecutionJobResult> {
    try {
      // 1. Update status to 'running'
      await this.job.updateProgress({ status: 'running', step: 'initializing' });
      await this.updateExecutionStatus('running', { started_at: new Date().toISOString() });

      // 2. Create isolated temp directory
      this.tempDir = await TempDir.create(this.job.data.executionId);

      // 3. Download script from Azure Blob
      await this.job.updateProgress({ status: 'running', step: 'downloading_script' });
      const scriptLoader = new ScriptLoader(this.config.AZURE_STORAGE_CONNECTION_STRING);
      await scriptLoader.download(this.job.data.scriptBlobPath, this.tempDir);

      // 4. Generate dynamic playwright.config.ts
      const configPath = await this.generateConfig();

      // 5. Run Playwright test
      await this.job.updateProgress({ status: 'running', step: 'executing_test' });
      const startTime = Date.now();
      const processResult = await this.runPlaywrightTest(configPath);
      const durationMs = Date.now() - startTime;

      // 6. Capture logs
      const uploader = new ArtifactUploader(this.config.AZURE_STORAGE_CONNECTION_STRING);
      await uploader.uploadLogs(
        this.job.data.executionId,
        processResult.stdout,
        processResult.stderr,
      );

      // 7. Parse results
      const reportPath = path.join(this.tempDir, 'report.json');
      const collector = new ResultCollector();
      console.log(`[Worker] Exit code: ${processResult.exitCode}`);
      if (processResult.stderr) {
        console.log(`[Worker] stderr: ${processResult.stderr.slice(0, 1000)}`);
      }
      const report = await collector.parseReport(reportPath, processResult.stdout);

      // 8. Upload artifacts (screenshots, traces)
      await this.job.updateProgress({ status: 'running', step: 'uploading_artifacts' });
      const artifactPaths = await uploader.uploadAll(this.job.data.executionId, this.tempDir);

      // 9. Store step results in database
      await this.storeResults(report, artifactPaths);

      // 10. Update execution status
      const finalStatus = report.allPassed ? 'passed' : 'failed';
      await this.updateExecutionStatus(finalStatus, {
        completed_at: new Date().toISOString(),
        duration_ms: durationMs,
      });

      return {
        executionId: this.job.data.executionId,
        status: finalStatus,
        durationMs,
        steps: report.steps,
        reportBlobPath: artifactPaths.reportPath || '',
        traceBlobPath: artifactPaths.tracePath,
      };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      await this.updateExecutionStatus('error', {
        completed_at: new Date().toISOString(),
        error_message: errMsg,
      });
      throw error;
    } finally {
      await TempDir.cleanup(this.tempDir);
      await this.pool.end();
    }
  }

  private async generateConfig(): Promise<string> {
    const { baseUrl, options } = this.job.data;
    // Use forward slashes — Playwright config works cross-platform with them
    const reportPath = path.join(this.tempDir, 'report.json').replace(/\\/g, '/');
    const testDir = this.tempDir.replace(/\\/g, '/');

    const configContent = `
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '${testDir}',
  testMatch: ['**/test.spec.ts'],
  timeout: ${options.timeout || 60000},
  retries: 0,
  use: {
    baseURL: '${baseUrl}',
    headless: ${options.headless},
    slowMo: ${options.slowMo ?? 0},
    screenshot: '${options.captureScreenshots === 'always' ? 'on' : options.captureScreenshots === 'never' ? 'off' : 'only-on-failure'}',
    trace: '${options.captureTrace === 'always' ? 'on' : options.captureTrace === 'never' ? 'off' : 'retain-on-failure'}',
    video: 'off',
  },
  reporter: [['json', { outputFile: '${reportPath}' }]],
});
`;

    const configPath = path.join(this.tempDir, 'playwright.config.ts');
    await fs.writeFile(configPath, configContent, 'utf-8');
    return configPath;
  }

  private async runPlaywrightTest(
    configPath: string,
  ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    const timeout = this.job.data.options.timeout || this.config.TEST_TIMEOUT_MS;

    // Locate the @playwright/test package root, then find its CLI entry.
    // v1.58+ ships cli.js at the package root; older versions used bin/playwright.js.
    const playwrightPkgRoot = path.dirname(require.resolve('@playwright/test'));
    const binCandidates = [
      path.join(playwrightPkgRoot, 'cli.js'),            // v1.58+
      path.join(playwrightPkgRoot, 'bin', 'playwright.js'), // older
    ];
    const playwrightBin = binCandidates.find((c) => existsSync(c));
    if (!playwrightBin) {
      throw new Error(
        `Cannot find @playwright/test CLI. Searched:\n${binCandidates.join('\n')}`,
      );
    }
    // node_modules/ is 2 dirs above the scoped package root:
    //   node_modules/@playwright/test  →  node_modules/@playwright  →  node_modules
    const nodeModulesPath = path.dirname(path.dirname(playwrightPkgRoot));

    return new Promise((resolve, reject) => {
      const proc = spawn(
        process.execPath,  // node — avoids shell PATH ambiguity on Windows
        [playwrightBin, 'test', '--config', configPath],
        {
          shell: false,
          cwd: this.tempDir,
          env: {
            ...process.env,
            BASE_URL: this.job.data.baseUrl,
            NODE_PATH: nodeModulesPath,
            ...this.job.data.envVariables,
          },
          timeout: timeout + 30000,
        },
      );

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });
      proc.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      const killTimer = setTimeout(() => {
        proc.kill('SIGTERM');
        reject(new Error(`Test execution timed out after ${timeout}ms`));
      }, timeout + 15000);

      proc.on('close', (code) => {
        clearTimeout(killTimer);
        // Playwright exits with non-zero on test failures, which is expected
        resolve({ exitCode: code ?? 1, stdout, stderr });
      });

      proc.on('error', (err) => {
        clearTimeout(killTimer);
        reject(err);
      });
    });
  }

  private async storeResults(
    report: Awaited<ReturnType<ResultCollector['parseReport']>>,
    artifactPaths: Awaited<ReturnType<ArtifactUploader['uploadAll']>>,
  ): Promise<void> {
    if (report.steps.length === 0) return;

    const valueParts: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    for (const step of report.steps) {
      const screenshotPath =
        artifactPaths.screenshots.find((s) => s.includes(`step-${String(step.stepNumber).padStart(3, '0')}`)) || null;

      valueParts.push(
        `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`,
      );
      values.push(
        this.job.data.executionId,
        step.stepNumber,
        step.stepName,
        step.status,
        step.durationMs || null,
        screenshotPath,
        step.errorDetails || null,
      );
    }

    await this.pool.query(
      `INSERT INTO test_results (execution_id, step_number, step_name, status, duration_ms, screenshot_blob_path, error_details)
       VALUES ${valueParts.join(', ')}`,
      values,
    );
  }

  private async updateExecutionStatus(
    status: string,
    extra?: Record<string, unknown>,
  ): Promise<void> {
    const sets = ['status = $1'];
    const values: unknown[] = [status];
    let paramIndex = 2;

    if (extra) {
      for (const [key, value] of Object.entries(extra)) {
        if (value !== undefined) {
          sets.push(`${key} = $${paramIndex++}`);
          values.push(value);
        }
      }
    }

    values.push(this.job.data.executionId);
    await this.pool.query(
      `UPDATE test_executions SET ${sets.join(', ')} WHERE id = $${paramIndex}`,
      values,
    );
  }
}
