import crypto from 'crypto';
import path from 'path';
import { TestScriptRepository } from '../repositories/test-script.repository.js';
import { ApplicationRepository } from '../repositories/application.repository.js';
import { BlobStorageService } from './blob-storage.service.js';
import { AppError } from '../middleware/error-handler.js';
import { getPool } from '../config/database.js';
import { DEFAULTS } from '@testing-harness/shared';
import type { ITestScript, PaginationMeta } from '@testing-harness/shared';

const ALLOWED_EXTENSIONS = ['.ts'];
const DISALLOWED_IMPORTS = ['child_process', 'fs', 'net', 'dgram', 'cluster'];

export class TestScriptService {
  private repo: TestScriptRepository;
  private appRepo: ApplicationRepository;
  private blobService: BlobStorageService;

  constructor() {
    const pool = getPool();
    this.repo = new TestScriptRepository(pool);
    this.appRepo = new ApplicationRepository(pool);
    this.blobService = new BlobStorageService();
  }

  async list(
    appId: string,
    page: number,
    limit: number,
    search?: string,
    tags?: string[],
  ): Promise<{ data: ITestScript[]; meta: PaginationMeta }> {
    const app = await this.appRepo.findByIdNotArchived(appId);
    if (!app) throw new AppError(404, 'APP_NOT_FOUND', 'Application not found');

    const result = await this.repo.findByAppId(appId, { page, limit }, search, tags);
    return {
      data: result.rows as ITestScript[],
      meta: { page, limit, total: result.total, totalPages: Math.ceil(result.total / limit) },
    };
  }

  async getById(id: string): Promise<ITestScript> {
    const script = await this.repo.findById(id);
    if (!script || script.is_archived) {
      throw new AppError(404, 'SCRIPT_NOT_FOUND', 'Test script not found');
    }
    return script as ITestScript;
  }

  async getContent(id: string): Promise<string> {
    const script = await this.getById(id);
    return this.blobService.downloadScript(script.blob_path);
  }

  async upload(
    appId: string,
    file: { originalname: string; buffer: Buffer; size: number },
    metadata: { name: string; description?: string; tags?: string[] },
    userId: string,
  ): Promise<ITestScript> {
    const app = await this.appRepo.findByIdNotArchived(appId);
    if (!app) throw new AppError(404, 'APP_NOT_FOUND', 'Application not found');

    // Validate file
    this.validateFile(file);

    const content = file.buffer.toString('utf-8');
    this.validateContent(content);

    const contentHash = crypto.createHash('sha256').update(content).digest('hex');

    // Create DB record first to get script ID
    const tempBlobPath = 'pending';
    const script = await this.repo.create({
      app_id: appId,
      name: metadata.name,
      description: metadata.description,
      blob_path: tempBlobPath,
      file_size_bytes: file.size,
      content_hash: contentHash,
      tags: metadata.tags,
      created_by: userId,
    });

    // Upload to blob storage
    const blobPath = await this.blobService.uploadScript(appId, script.id, content, 1);

    // Update blob path
    const updated = await this.repo.update(script.id, { blob_path: blobPath });
    return updated as ITestScript;
  }

  async updateMetadata(
    id: string,
    data: { name?: string; description?: string; tags?: string[] },
  ): Promise<ITestScript> {
    const existing = await this.getById(id);
    if (!existing) throw new AppError(404, 'SCRIPT_NOT_FOUND', 'Test script not found');

    return (await this.repo.update(id, data)) as ITestScript;
  }

  async archive(id: string): Promise<void> {
    const existing = await this.getById(id);
    if (!existing) throw new AppError(404, 'SCRIPT_NOT_FOUND', 'Test script not found');
    await this.repo.archive(id);
  }

  private validateFile(file: { originalname: string; buffer: Buffer; size: number }): void {
    if (file.size > DEFAULTS.MAX_FILE_SIZE_BYTES) {
      throw new AppError(400, 'FILE_TOO_LARGE', `File exceeds ${DEFAULTS.MAX_FILE_SIZE_BYTES} bytes`);
    }

    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      throw new AppError(400, 'INVALID_FILE_TYPE', 'Only .ts files are allowed');
    }
  }

  private validateContent(content: string): void {
    for (const disallowed of DISALLOWED_IMPORTS) {
      if (
        content.includes(`require('${disallowed}')`) ||
        content.includes(`require("${disallowed}")`) ||
        content.includes(`from '${disallowed}'`) ||
        content.includes(`from "${disallowed}"`)
      ) {
        throw new AppError(
          400,
          'UNSAFE_CONTENT',
          `Script contains disallowed import: ${disallowed}`,
        );
      }
    }
  }
}
