import type { Request, Response } from 'express';
import { ApplicationService } from '../services/application.service.js';

const service = new ApplicationService();

function param(req: Request, name: string): string {
  const val = req.params[name];
  return Array.isArray(val) ? val[0] : val;
}

export async function listApplications(req: Request, res: Response): Promise<void> {
  const { page = 1, limit = 20, search } = req.query as {
    page?: number;
    limit?: number;
    search?: string;
  };
  const result = await service.list(Number(page), Number(limit), search);
  res.json({ success: true, ...result });
}

export async function getApplication(req: Request, res: Response): Promise<void> {
  const app = await service.getById(param(req, 'id'));
  res.json({ success: true, data: app });
}

export async function createApplication(req: Request, res: Response): Promise<void> {
  const app = await service.create(req.body, req.user!.userId);
  res.status(201).json({ success: true, data: app });
}

export async function updateApplication(req: Request, res: Response): Promise<void> {
  const app = await service.update(param(req, 'id'), req.body);
  res.json({ success: true, data: app });
}

export async function archiveApplication(req: Request, res: Response): Promise<void> {
  await service.archive(param(req, 'id'));
  res.json({ success: true, data: { archived: true } });
}
