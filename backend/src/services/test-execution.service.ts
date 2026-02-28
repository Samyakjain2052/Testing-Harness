import { TestExecutionRepository } from '../repositories/test-execution.repository.js';
import { TestScriptRepository } from '../repositories/test-script.repository.js';
import { EnvironmentRepository } from '../repositories/environment.repository.js';
import { TestResultRepository } from '../repositories/test-result.repository.js';
import { QueueService } from './queue.service.js';
import { AppError } from '../middleware/error-handler.js';
import { getPool } from '../config/database.js';
import type {
  ITestExecution,
  ITestResult,
  ExecutionStatus,
  PaginationMeta,
  ITriggerExecutionDto,
} from '@testing-harness/shared';

export class TestExecutionService {
  private execRepo: TestExecutionRepository;
  private scriptRepo: TestScriptRepository;
  private envRepo: EnvironmentRepository;
  private resultRepo: TestResultRepository;
  private queueService: QueueService;

  constructor() {
    const pool = getPool();
    this.execRepo = new TestExecutionRepository(pool);
    this.scriptRepo = new TestScriptRepository(pool);
    this.envRepo = new EnvironmentRepository(pool);
    this.resultRepo = new TestResultRepository(pool);
    this.queueService = new QueueService();
  }

  async trigger(
    scriptId: string,
    dto: ITriggerExecutionDto,
    userId: string,
  ): Promise<ITestExecution> {
    // Validate script exists
    const script = await this.scriptRepo.findById(scriptId);
    if (!script || script.is_archived) {
      throw new AppError(404, 'SCRIPT_NOT_FOUND', 'Test script not found');
    }

    // Validate environment exists
    const env = await this.envRepo.findById(dto.environment_id);
    if (!env) {
      throw new AppError(404, 'ENV_NOT_FOUND', 'Environment not found');
    }
    if (!env.is_active) {
      throw new AppError(400, 'ENV_INACTIVE', 'Environment is not active');
    }

    // Create execution record
    const execution = await this.execRepo.create({
      script_id: scriptId,
      environment_id: dto.environment_id,
      triggered_by: userId,
    });

    // Enqueue job
    const jobId = await this.queueService.enqueueExecution(
      execution as ITestExecution,
      script,
      env,
      dto.options,
    );

    // Update execution with job ID
    const updated = await this.execRepo.updateStatus(execution.id, 'queued', {
      queue_job_id: jobId,
    });

    return updated as ITestExecution;
  }

  async getById(id: string): Promise<ITestExecution> {
    const execution = await this.execRepo.findById(id);
    if (!execution) {
      throw new AppError(404, 'EXECUTION_NOT_FOUND', 'Test execution not found');
    }
    return execution as ITestExecution;
  }

  async getDetailedById(id: string) {
    const execution = await this.execRepo.findById(id);
    if (!execution) {
      throw new AppError(404, 'EXECUTION_NOT_FOUND', 'Test execution not found');
    }

    const [script, env] = await Promise.all([
      this.scriptRepo.findById(execution.script_id),
      this.envRepo.findById(execution.environment_id),
    ]);

    const s = script as Record<string, unknown> | null;
    const e = env as Record<string, unknown> | null;

    return {
      ...(execution as ITestExecution),
      script_name: (s?.name as string) ?? 'Unknown Script',
      script_description: (s?.description as string | null) ?? null,
      script_tags: (s?.tags as string[]) ?? [],
      app_id: (s?.app_id as string) ?? '',
      environment_name: (e?.name as string) ?? 'Unknown Environment',
      environment_base_url: (e?.base_url as string) ?? '',
    };
  }

  async getResults(executionId: string): Promise<ITestResult[]> {
    const execution = await this.execRepo.findById(executionId);
    if (!execution) {
      throw new AppError(404, 'EXECUTION_NOT_FOUND', 'Test execution not found');
    }
    return (await this.resultRepo.findByExecutionId(executionId)) as ITestResult[];
  }

  async cancel(id: string): Promise<ITestExecution> {
    const execution = await this.execRepo.findById(id);
    if (!execution) {
      throw new AppError(404, 'EXECUTION_NOT_FOUND', 'Test execution not found');
    }

    if (execution.status !== 'queued' && execution.status !== 'running') {
      throw new AppError(400, 'INVALID_STATUS', 'Can only cancel queued or running executions');
    }

    const updated = await this.execRepo.updateStatus(id, 'cancelled', {
      completed_at: new Date().toISOString(),
    });

    return updated as ITestExecution;
  }

  async listByApp(
    appId: string,
    page: number,
    limit: number,
    filters?: { status?: ExecutionStatus; from?: string; to?: string },
  ): Promise<{ data: ITestExecution[]; meta: PaginationMeta }> {
    const result = await this.execRepo.findByAppId(appId, { page, limit }, filters);
    return {
      data: result.rows as ITestExecution[],
      meta: { page, limit, total: result.total, totalPages: Math.ceil(result.total / limit) },
    };
  }

  async listByScript(
    scriptId: string,
    page: number,
    limit: number,
  ): Promise<{ data: ITestExecution[]; meta: PaginationMeta }> {
    const result = await this.execRepo.findByScriptId(scriptId, { page, limit });
    return {
      data: result.rows as ITestExecution[],
      meta: { page, limit, total: result.total, totalPages: Math.ceil(result.total / limit) },
    };
  }
}
