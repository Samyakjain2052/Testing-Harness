import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const BASE_TEMP = path.join(os.tmpdir(), 'testing-harness', 'executions');

export class TempDir {
  static async create(executionId: string): Promise<string> {
    const dir = path.join(BASE_TEMP, executionId);
    await fs.mkdir(dir, { recursive: true });
    return dir;
  }

  static async cleanup(dir: string): Promise<void> {
    if (!dir || !dir.includes('testing-harness')) return;

    try {
      await fs.rm(dir, { recursive: true, force: true });
    } catch {
      console.warn(`[TempDir] Failed to clean up: ${dir}`);
    }
  }
}
