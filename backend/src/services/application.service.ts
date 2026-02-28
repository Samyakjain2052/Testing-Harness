import { ApplicationRepository } from '../repositories/application.repository.js';
import { AppError } from '../middleware/error-handler.js';
import { getPool } from '../config/database.js';
import type { IApplication, PaginationMeta } from '@testing-harness/shared';

export class ApplicationService {
  private repo: ApplicationRepository;

  constructor() {
    this.repo = new ApplicationRepository(getPool());
  }

  async list(
    page: number,
    limit: number,
    search?: string,
  ): Promise<{ data: IApplication[]; meta: PaginationMeta }> {
    const result = await this.repo.findAllActive({ page, limit }, search);
    return {
      data: result.rows as IApplication[],
      meta: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    };
  }

  async getById(id: string): Promise<IApplication> {
    const app = await this.repo.findByIdNotArchived(id);
    if (!app) {
      throw new AppError(404, 'APP_NOT_FOUND', 'Application not found');
    }
    return app as IApplication;
  }

  async create(data: { name: string; description?: string }, userId: string): Promise<IApplication> {
    const app = await this.repo.create({
      name: data.name,
      description: data.description,
      created_by: userId,
    });
    return app as IApplication;
  }

  async update(id: string, data: { name?: string; description?: string }): Promise<IApplication> {
    const existing = await this.repo.findByIdNotArchived(id);
    if (!existing) {
      throw new AppError(404, 'APP_NOT_FOUND', 'Application not found');
    }

    const updated = await this.repo.update(id, data);
    return updated as IApplication;
  }

  async archive(id: string): Promise<void> {
    const existing = await this.repo.findByIdNotArchived(id);
    if (!existing) {
      throw new AppError(404, 'APP_NOT_FOUND', 'Application not found');
    }
    await this.repo.archive(id);
  }
}
