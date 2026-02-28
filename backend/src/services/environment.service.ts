import { EnvironmentRepository } from '../repositories/environment.repository.js';
import { ApplicationRepository } from '../repositories/application.repository.js';
import { AppError } from '../middleware/error-handler.js';
import { getPool } from '../config/database.js';
import type { IEnvironment } from '@testing-harness/shared';

export class EnvironmentService {
  private repo: EnvironmentRepository;
  private appRepo: ApplicationRepository;

  constructor() {
    const pool = getPool();
    this.repo = new EnvironmentRepository(pool);
    this.appRepo = new ApplicationRepository(pool);
  }

  async listByApp(appId: string): Promise<IEnvironment[]> {
    const app = await this.appRepo.findByIdNotArchived(appId);
    if (!app) {
      throw new AppError(404, 'APP_NOT_FOUND', 'Application not found');
    }

    return (await this.repo.findByAppId(appId)) as IEnvironment[];
  }

  async create(
    appId: string,
    data: { name: string; base_url: string; variables?: Record<string, string> },
  ): Promise<IEnvironment> {
    const app = await this.appRepo.findByIdNotArchived(appId);
    if (!app) {
      throw new AppError(404, 'APP_NOT_FOUND', 'Application not found');
    }

    const existing = await this.repo.findByAppIdAndName(appId, data.name);
    if (existing) {
      throw new AppError(409, 'ENV_EXISTS', `Environment "${data.name}" already exists for this app`);
    }

    return (await this.repo.create({ app_id: appId, ...data })) as IEnvironment;
  }

  async update(
    id: string,
    data: {
      name?: string;
      base_url?: string;
      is_active?: boolean;
      variables?: Record<string, string>;
    },
  ): Promise<IEnvironment> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new AppError(404, 'ENV_NOT_FOUND', 'Environment not found');
    }

    // Check name uniqueness if changing name
    if (data.name && data.name !== existing.name) {
      const conflict = await this.repo.findByAppIdAndName(existing.app_id, data.name);
      if (conflict) {
        throw new AppError(409, 'ENV_EXISTS', `Environment "${data.name}" already exists`);
      }
    }

    return (await this.repo.update(id, data)) as IEnvironment;
  }

  async delete(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new AppError(404, 'ENV_NOT_FOUND', 'Environment not found');
    }
    await this.repo.deleteById(id);
  }
}
