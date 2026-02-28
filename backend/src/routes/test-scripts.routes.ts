import { Router } from 'express';
import multer from 'multer';
import {
  listScripts,
  getScript,
  getScriptContent,
  uploadScript,
  updateScript,
  archiveScript,
} from '../controllers/test-scripts.controller.js';
import { authMiddleware } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { updateTestScriptSchema, DEFAULTS } from '@testing-harness/shared';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: DEFAULTS.MAX_FILE_SIZE_BYTES },
});

const router = Router();

router.use(authMiddleware);

// Nested under /applications/:appId/scripts
router.get('/applications/:appId/scripts', listScripts);
router.post('/applications/:appId/scripts', upload.single('file'), uploadScript);

// Direct /scripts/:id
router.get('/scripts/:id', getScript);
router.get('/scripts/:id/content', getScriptContent);
router.put('/scripts/:id', validate(updateTestScriptSchema), updateScript);
router.delete('/scripts/:id', archiveScript);

export default router;
