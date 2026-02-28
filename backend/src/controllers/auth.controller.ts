import type { Request, Response } from 'express';
import { AuthService } from '../services/auth.service.js';

const authService = new AuthService();

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  res.json({ success: true, data: result });
}

export async function register(req: Request, res: Response): Promise<void> {
  const { email, name, password } = req.body;
  const result = await authService.register(email, name, password);
  res.status(201).json({ success: true, data: result });
}

export async function getMe(req: Request, res: Response): Promise<void> {
  const user = await authService.getMe(req.user!.userId);
  res.json({ success: true, data: { user } });
}
