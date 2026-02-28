import { Router } from 'express';
import {
  listEnvironments,
  createEnvironment,
  updateEnvironment,
  deleteEnvironment,
} from '../controllers/environments.controller.js';
import { authMiddleware } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createEnvironmentSchema, updateEnvironmentSchema } from '@testing-harness/shared';

const router = Router();

router.use(authMiddleware);

// Nested under /applications/:appId/environments
router.get('/:appId/environments', listEnvironments);
router.post('/:appId/environments', validate(createEnvironmentSchema), createEnvironment);

// Direct /environments/:id
router.put('/:id', validate(updateEnvironmentSchema), updateEnvironment);
router.delete('/:id', deleteEnvironment);

export default router;
