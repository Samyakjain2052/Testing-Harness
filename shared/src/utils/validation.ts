import { z } from 'zod';

export const createApplicationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255).trim(),
  description: z.string().max(2000).optional(),
});

export const updateApplicationSchema = z.object({
  name: z.string().min(1).max(255).trim().optional(),
  description: z.string().max(2000).optional(),
});

export const createEnvironmentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255).trim(),
  base_url: z.string().url('Must be a valid URL').max(2048),
  variables: z.record(z.string()).optional(),
});

export const updateEnvironmentSchema = z.object({
  name: z.string().min(1).max(255).trim().optional(),
  base_url: z.string().url().max(2048).optional(),
  is_active: z.boolean().optional(),
  variables: z.record(z.string()).optional(),
});

export const createTestScriptSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255).trim(),
  description: z.string().max(2000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

export const updateTestScriptSchema = z.object({
  name: z.string().min(1).max(255).trim().optional(),
  description: z.string().max(2000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

export const triggerExecutionSchema = z.object({
  environment_id: z.string().uuid('Invalid environment ID'),
  options: z
    .object({
      headless: z.boolean().optional(),
      slowMo: z.number().int().min(0).max(5000).optional(),
      timeout: z.number().int().min(5000).max(300000).optional(),
      browser: z.enum(['chromium', 'firefox', 'webkit']).optional(),
      captureScreenshots: z.enum(['always', 'only-on-failure', 'never']).optional(),
      captureTrace: z.enum(['always', 'retain-on-failure', 'never']).optional(),
    })
    .optional(),
});

export const startRecordingSchema = z.object({
  target_url: z.string().url('Must be a valid URL').max(2048),
  name: z.string().min(1, 'Name is required').max(255).trim(),
});

export const saveRecordingSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255).trim(),
  description: z.string().max(2000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email'),
  name: z.string().min(1, 'Name is required').max(255).trim(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(255).optional(),
});
