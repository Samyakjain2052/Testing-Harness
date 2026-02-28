import { Router } from 'express';
import {
  startRecording,
  getRecordingStatus,
  stopRecording,
  saveRecording,
} from '../controllers/recordings.controller.js';
import { authMiddleware } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { startRecordingSchema, saveRecordingSchema } from '@testing-harness/shared';

const router = Router();

router.use(authMiddleware);

router.post('/applications/:appId/recordings/start', validate(startRecordingSchema), startRecording);
router.get('/recordings/:sessionId/status', getRecordingStatus);
router.post('/recordings/:sessionId/stop', stopRecording);
router.post('/recordings/:sessionId/save', validate(saveRecordingSchema), saveRecording);

export default router;
