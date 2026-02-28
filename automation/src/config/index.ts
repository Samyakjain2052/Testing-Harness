import { z } from 'zod';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '..', '.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  REDIS_URL: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  AZURE_STORAGE_CONNECTION_STRING: z.string().min(1),
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(10).default(2),
  TEST_TIMEOUT_MS: z.coerce.number().int().min(5000).default(60000),
});

export type WorkerConfig = z.infer<typeof envSchema>;

let _config: WorkerConfig | null = null;

export function loadWorkerConfig(): WorkerConfig {
  if (_config) return _config;

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid worker configuration:');
    for (const issue of result.error.issues) {
      console.error(`  ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }

  _config = result.data;
  return _config;
}
