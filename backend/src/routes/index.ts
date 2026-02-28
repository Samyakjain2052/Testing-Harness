import { Router } from 'express';
import authRoutes from './auth.routes.js';
import applicationRoutes from './applications.routes.js';
import environmentRoutes from './environments.routes.js';
import testScriptRoutes from './test-scripts.routes.js';
import testExecutionRoutes from './test-executions.routes.js';
import recordingRoutes from './recordings.routes.js';

export function createRoutes(): Router {
  const router = Router();

  router.use('/auth', authRoutes);
  router.use('/applications', applicationRoutes);

  // Environment routes: /applications/:appId/environments and /environments/:id
  router.use('/applications', environmentRoutes);
  router.use('/environments', environmentRoutes);

  // Script routes: /applications/:appId/scripts and /scripts/:id
  router.use('/', testScriptRoutes);

  // Execution routes: multiple prefixes
  router.use('/', testExecutionRoutes);

  // Recording routes
  router.use('/', recordingRoutes);

  return router;
}
