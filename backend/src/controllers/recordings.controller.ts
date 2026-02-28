import type { Request, Response } from 'express';
import { RecordingService } from '../services/recording.service.js';

const service = new RecordingService();

function p(req: Request, name: string): string {
  const v = req.params[name]; return Array.isArray(v) ? v[0] : v;
}

export async function startRecording(req: Request, res: Response): Promise<void> {
  const { target_url, name } = req.body;
  const session = await service.startRecording(p(req, 'appId'), target_url, name, req.user!.userId);
  res.status(202).json({ success: true, data: session });
}

export async function getRecordingStatus(req: Request, res: Response): Promise<void> {
  const status = service.getSessionStatus(p(req, 'sessionId'));
  res.json({ success: true, data: status });
}

export async function stopRecording(req: Request, res: Response): Promise<void> {
  const result = await service.stopRecording(p(req, 'sessionId'));
  res.json({ success: true, data: result });
}

export async function saveRecording(req: Request, res: Response): Promise<void> {
  const { name, description, tags } = req.body;
  const script = await service.saveRecording(
    p(req, 'sessionId'),
    { name, description, tags },
    req.user!.userId,
  );
  res.status(201).json({ success: true, data: script });
}
