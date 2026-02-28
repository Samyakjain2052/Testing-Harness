import type { Request, Response } from 'express';
import { EnvironmentService } from '../services/environment.service.js';

const service = new EnvironmentService();

function p(req: Request, name: string): string {
  const v = req.params[name]; return Array.isArray(v) ? v[0] : v;
}

export async function listEnvironments(req: Request, res: Response): Promise<void> {
  const envs = await service.listByApp(p(req, 'appId'));
  res.json({ success: true, data: envs });
}

export async function createEnvironment(req: Request, res: Response): Promise<void> {
  const env = await service.create(p(req, 'appId'), req.body);
  res.status(201).json({ success: true, data: env });
}

export async function updateEnvironment(req: Request, res: Response): Promise<void> {
  const env = await service.update(p(req, 'id'), req.body);
  res.json({ success: true, data: env });
}

export async function deleteEnvironment(req: Request, res: Response): Promise<void> {
  await service.delete(p(req, 'id'));
  res.status(204).send();
}
