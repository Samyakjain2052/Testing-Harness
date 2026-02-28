import { spawn, type ChildProcess } from 'child_process';
import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { TestScriptService } from './test-script.service.js';
import { BlobStorageService } from './blob-storage.service.js';
import { AppError } from '../middleware/error-handler.js';
import { BLOB_CONTAINERS, BlobPaths, DEFAULTS, escapeRegex, extractBaseUrl } from '@testing-harness/shared';
import type { RecordingSession, ITestScript } from '@testing-harness/shared';

interface ActiveSession {
  sessionId: string;
  appId: string;
  targetUrl: string;
  name: string;
  userId: string;
  status: 'recording' | 'completed' | 'failed' | 'error';
  process: ChildProcess | null;
  outputPath: string;
  tempDir: string;
  startedAt: string;
  error?: string;
}

// In-memory session store (replaced by Redis in production)
const sessions = new Map<string, ActiveSession>();

// Clean up stale sessions periodically
setInterval(() => {
  const staleThreshold = Date.now() - DEFAULTS.STALE_RECORDING_CLEANUP_MS;
  for (const [id, session] of sessions) {
    if (new Date(session.startedAt).getTime() < staleThreshold) {
      if (session.process && !session.process.killed) {
        session.process.kill('SIGTERM');
      }
      sessions.delete(id);
      fs.rm(session.tempDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}, 60000);

export class RecordingService {
  private blobService: BlobStorageService;
  private scriptService: TestScriptService;

  constructor() {
    this.blobService = new BlobStorageService();
    this.scriptService = new TestScriptService();
  }

  async startRecording(
    appId: string,
    targetUrl: string,
    name: string,
    userId: string,
  ): Promise<RecordingSession> {
    const sessionId = randomUUID();
    const tempDir = path.join(os.tmpdir(), 'testing-harness', 'recordings', sessionId);
    await fs.mkdir(tempDir, { recursive: true });

    const outputPath = path.join(tempDir, 'raw-codegen-output.ts');

    const session: ActiveSession = {
      sessionId,
      appId,
      targetUrl,
      name,
      userId,
      status: 'recording',
      process: null,
      outputPath,
      tempDir,
      startedAt: new Date().toISOString(),
    };

    try {
      const proc = spawn(
        'npx',
        [
          'playwright',
          'codegen',
          targetUrl,
          '--output',
          outputPath,
          '--target',
          'playwright-test',
          '--browser',
          'chromium',
        ],
        {
          shell: true,
          cwd: tempDir,
          env: { ...process.env },
          stdio: ['pipe', 'pipe', 'pipe'],
        },
      );

      session.process = proc;

      // Capture stderr for debugging
      let stderrOutput = '';
      proc.stderr?.on('data', (chunk: Buffer) => {
        stderrOutput += chunk.toString();
      });

      proc.on('close', async (code) => {
        console.log(`[Recording ${sessionId}] Playwright codegen exited with code ${code}`);
        session.process = null;

        // On Windows, codegen often exits with non-zero code even on normal browser close.
        // Check if the output file was actually written — that's the real success indicator.
        try {
          const stat = await fs.stat(session.outputPath);
          if (stat.size > 0) {
            session.status = 'completed';
            console.log(`[Recording ${sessionId}] Output file found (${stat.size} bytes) — marking completed`);
            return;
          }
        } catch {
          // File doesn't exist yet
        }

        // No output file — check exit code
        if (code === 0) {
          session.status = 'completed';
        } else {
          session.status = 'failed';
          session.error = `Playwright exited with code ${code}`;
          if (stderrOutput.trim()) {
            console.error(`[Recording ${sessionId}] stderr: ${stderrOutput.slice(0, 500)}`);
          }
        }
      });

      proc.on('error', (err) => {
        console.error(`[Recording ${sessionId}] Process error:`, err.message);
        session.status = 'error';
        session.error = err.message;
        session.process = null;
      });

      // Auto-kill after timeout
      setTimeout(() => {
        if (session.status === 'recording' && proc && !proc.killed) {
          proc.kill('SIGTERM');
          session.status = 'failed';
          session.error = 'Recording timed out';
        }
      }, DEFAULTS.RECORDING_TIMEOUT_MS);
    } catch (err) {
      session.status = 'error';
      session.error = err instanceof Error ? err.message : 'Failed to start recording';
    }

    sessions.set(sessionId, session);

    return {
      sessionId,
      appId,
      targetUrl,
      status: session.status,
      startedAt: session.startedAt,
    };
  }

  getSessionStatus(sessionId: string): RecordingSession {
    const session = sessions.get(sessionId);
    if (!session) {
      throw new AppError(404, 'SESSION_NOT_FOUND', 'Recording session not found');
    }

    return {
      sessionId: session.sessionId,
      appId: session.appId,
      targetUrl: session.targetUrl,
      status: session.status,
      error: session.error,
      startedAt: session.startedAt,
    };
  }

  async stopRecording(sessionId: string): Promise<RecordingSession> {
    const session = sessions.get(sessionId);
    if (!session) {
      throw new AppError(404, 'SESSION_NOT_FOUND', 'Recording session not found');
    }

    // Kill the process if still running
    if (session.process && !session.process.killed) {
      console.log(`[Recording ${sessionId}] Manually stopping — killing process`);
      session.process.kill('SIGTERM');
      // On Windows, SIGTERM may not work; force kill after a short delay
      const proc = session.process;
      setTimeout(() => {
        if (proc && !proc.killed) {
          try { proc.kill('SIGKILL'); } catch {}
        }
      }, 1000);
    }

    // Wait a moment for the file to be flushed by Playwright
    await new Promise((r) => setTimeout(r, 1500));

    // Check if the output file was written
    try {
      const stat = await fs.stat(session.outputPath);
      if (stat.size > 0) {
        session.status = 'completed';
        console.log(`[Recording ${sessionId}] Stopped — output file found (${stat.size} bytes)`);
      } else {
        session.status = 'completed';
        console.log(`[Recording ${sessionId}] Stopped — empty output file, user may not have recorded actions`);
      }
    } catch {
      // No file at all — still mark as completed so user can see the error on save
      session.status = 'completed';
      console.log(`[Recording ${sessionId}] Stopped — no output file found`);
    }

    session.process = null;

    return {
      sessionId: session.sessionId,
      appId: session.appId,
      targetUrl: session.targetUrl,
      status: session.status,
      error: session.error,
      startedAt: session.startedAt,
    };
  }

  async saveRecording(
    sessionId: string,
    metadata: { name: string; description?: string; tags?: string[] },
    userId: string,
  ): Promise<ITestScript> {
    const session = sessions.get(sessionId);
    if (!session) {
      throw new AppError(404, 'SESSION_NOT_FOUND', 'Recording session not found');
    }

    // Try to read the output file — if it exists with content, the recording is good
    // regardless of what status says (Windows exit code quirks)
    let rawContent: string;
    try {
      rawContent = await fs.readFile(session.outputPath, 'utf-8');
    } catch {
      if (session.status === 'recording') {
        throw new AppError(400, 'RECORDING_STILL_ACTIVE', 'Close the Playwright browser first');
      }
      throw new AppError(500, 'FILE_READ_ERROR', 'No recorded script found. The browser may have been closed before any actions were captured.');
    }

    if (!rawContent.trim()) {
      throw new AppError(400, 'EMPTY_RECORDING', 'No actions were recorded — open a page and interact before closing the browser');
    }

    // If we got here, mark as completed (fixes stale status)
    session.status = 'completed';

    // Parameterize URLs
    const parameterized = this.parameterizeScript(rawContent, session.targetUrl);

    // Upload raw recording to blob for audit
    await this.blobService.uploadText(
      BLOB_CONTAINERS.RECORDINGS,
      BlobPaths.recordingRaw(sessionId),
      rawContent,
      'text/typescript',
    );

    // Save parameterized script via test script service
    const fileBuffer = Buffer.from(parameterized, 'utf-8');
    const script = await this.scriptService.upload(
      session.appId,
      {
        originalname: `${metadata.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.spec.ts`,
        buffer: fileBuffer,
        size: fileBuffer.length,
      },
      metadata,
      userId,
    );

    // Clean up temp dir and session
    sessions.delete(sessionId);
    fs.rm(session.tempDir, { recursive: true, force: true }).catch(() => {});

    return script;
  }

  private parameterizeScript(rawScript: string, targetUrl: string): string {
    const baseUrl = extractBaseUrl(targetUrl);
    const escapedBase = escapeRegex(baseUrl);

    // Replace all hardcoded base URLs with empty string (relies on baseURL config)
    let result = rawScript.replace(new RegExp(escapedBase, 'g'), '');

    // Fix empty goto calls
    result = result.replace(/page\.goto\(''\)/g, "page.goto('/')");
    result = result.replace(/page\.goto\(""\)/g, "page.goto('/')");

    // Ensure imports are correct
    if (!result.includes("from '@playwright/test'")) {
      result = `import { test, expect } from '@playwright/test';\n\n${result}`;
    }

    // Wrap in test block if not already wrapped
    if (!result.includes('test(') && !result.includes('test.describe(')) {
      const lines = result.split('\n');
      const importLines = lines.filter((l) => l.startsWith('import '));
      const codeLines = lines.filter((l) => !l.startsWith('import ') && l.trim());

      result = [
        ...importLines,
        '',
        "test('Recorded Test', async ({ page }) => {",
        ...codeLines.map((l) => `  ${l}`),
        '});',
        '',
      ].join('\n');
    }

    return result;
  }
}
