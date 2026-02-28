import { Router } from 'express';
import {
  listApplications,
  getApplication,
  createApplication,
  updateApplication,
  archiveApplication,
} from '../controllers/applications.controller.js';
import { authMiddleware } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createApplicationSchema, updateApplicationSchema } from '@testing-harness/shared';

const router = Router();

router.use(authMiddleware);

router.get('/', listApplications);
router.get('/:id', getApplication);
router.post('/', validate(createApplicationSchema), createApplication);
router.put('/:id', validate(updateApplicationSchema), updateApplication);
router.delete('/:id', archiveApplication);

export default router;
