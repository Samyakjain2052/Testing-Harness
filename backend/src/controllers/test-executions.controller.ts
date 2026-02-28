import type { Request, Response } from 'express';
import { TestExecutionService } from '../services/test-execution.service.js';
import { BlobStorageService } from '../services/blob-storage.service.js';
import { TestExecutionRepository } from '../repositories/test-execution.repository.js';
import { TestScriptRepository } from '../repositories/test-script.repository.js';
import { ApplicationRepository } from '../repositories/application.repository.js';
import { getPool } from '../config/database.js';
import { BLOB_CONTAINERS, BlobPaths } from '@testing-harness/shared';
import type { ExecutionStatus } from '@testing-harness/shared';

const service = new TestExecutionService();

function p(req: Request, name: string): string {
  const v = req.params[name]; return Array.isArray(v) ? v[0] : v;
}

export async function triggerExecution(req: Request, res: Response): Promise<void> {
  const execution = await service.trigger(p(req, 'scriptId'), req.body, req.user!.userId);
  res.status(202).json({ success: true, data: execution });
}

export async function getExecution(req: Request, res: Response): Promise<void> {
  const execution = await service.getDetailedById(p(req, 'id'));
  res.json({ success: true, data: execution });
}

export async function getExecutionLogs(req: Request, res: Response): Promise<void> {
  const executionId = p(req, 'id');
  const logType = req.query.type as string;

  if (!logType || !['stdout', 'stderr'].includes(logType)) {
    res.status(400).json({ success: false, error: { code: 'INVALID_TYPE', message: 'type must be stdout or stderr' } });
    return;
  }

  const blobService = new BlobStorageService();
  const blobPath = logType === 'stdout' ? BlobPaths.stdout(executionId) : BlobPaths.stderr(executionId);

  const exists = await blobService.exists(BLOB_CONTAINERS.TEST_ARTIFACTS, blobPath);
  if (!exists) {
    res.status(404).json({ success: false, error: { code: 'LOG_NOT_FOUND', message: 'Log not available' } });
    return;
  }

  const content = await blobService.downloadText(BLOB_CONTAINERS.TEST_ARTIFACTS, blobPath);
  res.json({ success: true, data: { content, type: logType } });
}

export async function getExecutionResults(req: Request, res: Response): Promise<void> {
  const results = await service.getResults(p(req, 'id'));
  res.json({ success: true, data: results });
}

export async function cancelExecution(req: Request, res: Response): Promise<void> {
  const execution = await service.cancel(p(req, 'id'));
  res.json({ success: true, data: execution });
}

export async function listAppExecutions(req: Request, res: Response): Promise<void> {
  const { page = 1, limit = 20, status, from, to } = req.query as {
    page?: number;
    limit?: number;
    status?: ExecutionStatus;
    from?: string;
    to?: string;
  };

  const result = await service.listByApp(
    p(req, 'appId'),
    Number(page),
    Number(limit),
    { status, from, to },
  );
  res.json({ success: true, ...result });
}

export async function listScriptExecutions(req: Request, res: Response): Promise<void> {
  const { page = 1, limit = 20 } = req.query as { page?: number; limit?: number };
  const result = await service.listByScript(p(req, 'scriptId'), Number(page), Number(limit));
  res.json({ success: true, ...result });
}

export async function getScreenshot(req: Request, res: Response): Promise<void> {
  const blobPath = req.query.path as string;
  if (!blobPath) {
    res.status(400).json({ success: false, error: { code: 'MISSING_PATH', message: 'path query param required' } });
    return;
  }

  const blobService = new BlobStorageService();
  const exists = await blobService.exists(BLOB_CONTAINERS.TEST_ARTIFACTS, blobPath);
  if (!exists) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Screenshot not found' } });
    return;
  }

  const buffer = await blobService.downloadBuffer(BLOB_CONTAINERS.TEST_ARTIFACTS, blobPath);
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(buffer);
}

export async function getTrace(req: Request, res: Response): Promise<void> {
  const executionId = p(req, 'id');
  const blobPath = BlobPaths.trace(executionId);
  const blobService = new BlobStorageService();

  const exists = await blobService.exists(BLOB_CONTAINERS.TEST_ARTIFACTS, blobPath);
  if (!exists) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Trace not found' } });
    return;
  }

  const buffer = await blobService.downloadBuffer(BLOB_CONTAINERS.TEST_ARTIFACTS, blobPath);
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="trace-${executionId}.zip"`);
  res.send(buffer);
}

export async function getDashboardStats(_req: Request, res: Response): Promise<void> {
  const pool = getPool();
  const execRepo = new TestExecutionRepository(pool);
  const scriptRepo = new TestScriptRepository(pool);
  const appRepo = new ApplicationRepository(pool);

  const [execStats, scriptCount, appCount] = await Promise.all([
    execRepo.getDashboardStats(),
    pool.query('SELECT COUNT(*)::int as count FROM test_scripts WHERE is_archived = false'),
    pool.query('SELECT COUNT(*)::int as count FROM applications WHERE is_archived = false'),
  ]);

  res.json({
    success: true,
    data: {
      totalApps: appCount.rows[0].count,
      totalScripts: scriptCount.rows[0].count,
      totalExecutions: execStats.totalExecutions,
      passRate: execStats.passRate,
      recentExecutions: execStats.recentExecutions,
    },
  });
}
