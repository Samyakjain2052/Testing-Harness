import { Router } from 'express';
import {
  triggerExecution,
  getExecution,
  getExecutionResults,
  getExecutionLogs,
  getScreenshot,
  getTrace,
  cancelExecution,
  listAppExecutions,
  listScriptExecutions,
  getDashboardStats,
} from '../controllers/test-executions.controller.js';
import { authMiddleware } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { triggerExecutionSchema } from '@testing-harness/shared';

const router = Router();

router.use(authMiddleware);

// Dashboard
router.get('/dashboard/stats', getDashboardStats);

// Trigger execution
router.post('/scripts/:scriptId/execute', validate(triggerExecutionSchema), triggerExecution);

// Execution detail
router.get('/executions/:id', getExecution);
router.get('/executions/:id/results', getExecutionResults);
router.get('/executions/:id/logs', getExecutionLogs);
router.get('/executions/:id/screenshot', getScreenshot);
router.get('/executions/:id/trace', getTrace);
router.post('/executions/:id/cancel', cancelExecution);

// History
router.get('/applications/:appId/executions', listAppExecutions);
router.get('/scripts/:scriptId/executions', listScriptExecutions);

export default router;
