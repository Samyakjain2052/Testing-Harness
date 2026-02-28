import fs from 'fs/promises';

interface PlaywrightJsonReport {
  suites?: Array<{
    title: string;
    specs?: Array<{
      title: string;
      tests?: Array<{
        results?: Array<{
          status: string;
          duration: number;
          error?: {
            message?: string;
            stack?: string;
          };
          attachments?: Array<{
            name: string;
            path?: string;
            contentType: string;
          }>;
        }>;
      }>;
    }>;
  }>;
}

export interface ParsedReport {
  allPassed: boolean;
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
  steps: Array<{
    stepNumber: number;
    stepName: string;
    status: 'passed' | 'failed' | 'skipped' | 'error';
    durationMs: number;
    errorDetails?: string;
    screenshotBlobPath?: string;
  }>;
}

export class ResultCollector {
  async parseReport(reportPath: string, stdout?: string): Promise<ParsedReport> {
    let reportJson: PlaywrightJsonReport;

    try {
      const content = await fs.readFile(reportPath, 'utf-8');
      reportJson = JSON.parse(content);
    } catch {
      // Report file missing — try parsing stdout as JSON (fallback)
      if (stdout) {
        try {
          reportJson = JSON.parse(stdout);
        } catch {
          // stdout wasn't valid JSON either
        }
      }
      if (!reportJson!) {
        return {
          allPassed: false,
          totalSteps: 1,
          passedSteps: 0,
          failedSteps: 1,
          steps: [
            {
              stepNumber: 1,
              stepName: 'Test Execution',
              status: 'error',
              durationMs: 0,
              errorDetails: 'Failed to parse test report. The test may have crashed.',
            },
          ],
        };
      }
    }

    const steps: ParsedReport['steps'] = [];
    let stepNumber = 0;

    if (reportJson.suites) {
      for (const suite of reportJson.suites) {
        if (suite.specs) {
          for (const spec of suite.specs) {
            if (spec.tests) {
              for (const test of spec.tests) {
                stepNumber++;
                const result = test.results?.[0];

                const status = this.mapStatus(result?.status);
                const errorDetails =
                  result?.error?.message ||
                  (result?.error?.stack ? result.error.stack.slice(0, 2000) : undefined);

                steps.push({
                  stepNumber,
                  stepName: `${suite.title} > ${spec.title}`,
                  status,
                  durationMs: result?.duration || 0,
                  errorDetails,
                });
              }
            }
          }
        }
      }
    }

    // If no steps found (e.g. report was empty / Playwright found no tests),
    // treat it as an error rather than silently passing.
    if (steps.length === 0) {
      steps.push({
        stepNumber: 1,
        stepName: 'Test Execution',
        status: 'error',
        durationMs: 0,
        errorDetails: 'No test steps were recorded. Playwright may have found no tests or encountered a startup error. Check the Execution Logs for details.',
      });
    }

    const passedSteps = steps.filter((s) => s.status === 'passed').length;
    const failedSteps = steps.filter((s) => s.status === 'failed' || s.status === 'error').length;

    return {
      allPassed: failedSteps === 0,
      totalSteps: steps.length,
      passedSteps,
      failedSteps,
      steps,
    };
  }

  private mapStatus(status?: string): 'passed' | 'failed' | 'skipped' | 'error' {
    switch (status) {
      case 'passed':
        return 'passed';
      case 'failed':
        return 'failed';
      case 'timedOut':
        return 'error';
      case 'skipped':
        return 'skipped';
      default:
        return 'error';
    }
  }
}
