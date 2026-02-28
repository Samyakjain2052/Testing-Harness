import type { Request, Response } from 'express';
import { TestScriptService } from '../services/test-script.service.js';

const service = new TestScriptService();

function p(req: Request, name: string): string {
  const v = req.params[name]; return Array.isArray(v) ? v[0] : v;
}

export async function listScripts(req: Request, res: Response): Promise<void> {
  const { page = 1, limit = 20, search, tags } = req.query as {
    page?: number;
    limit?: number;
    search?: string;
    tags?: string;
  };
  const tagArray = tags ? (tags as string).split(',').map((t) => t.trim()) : undefined;
  const result = await service.list(p(req, 'appId'), Number(page), Number(limit), search, tagArray);
  res.json({ success: true, ...result });
}

export async function getScript(req: Request, res: Response): Promise<void> {
  const script = await service.getById(p(req, 'id'));
  res.json({ success: true, data: script });
}

export async function getScriptContent(req: Request, res: Response): Promise<void> {
  const content = await service.getContent(p(req, 'id'));
  res.setHeader('Content-Type', 'text/typescript');
  res.send(content);
}

export async function uploadScript(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    res.status(400).json({
      success: false,
      error: { code: 'NO_FILE', message: 'No file uploaded' },
    });
    return;
  }

  const metadata = {
    name: req.body.name,
    description: req.body.description,
    tags: req.body.tags ? JSON.parse(req.body.tags) : undefined,
  };

  const script = await service.upload(p(req, 'appId'), req.file, metadata, req.user!.userId);
  res.status(201).json({ success: true, data: script });
}

export async function updateScript(req: Request, res: Response): Promise<void> {
  const script = await service.updateMetadata(p(req, 'id'), req.body);
  res.json({ success: true, data: script });
}

export async function archiveScript(req: Request, res: Response): Promise<void> {
  await service.archive(p(req, 'id'));
  res.status(204).send();
}
