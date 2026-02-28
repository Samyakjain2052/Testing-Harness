import type { Pool } from 'pg';
import { BaseRepository, type PaginationParams, type PaginatedResult } from './base.repository.js';
import type { ITestExecution, ExecutionStatus } from '@testing-harness/shared';

type ExecRow = ITestExecution & Record<string, unknown>;

export class TestExecutionRepository extends BaseRepository<ExecRow> {
  constructor(pool: Pool) {
    super(pool, 'test_executions', ['script_id', 'environment_id', 'status', 'triggered_by']);
  }

  async findByAppId(
    appId: string,
    pagination: PaginationParams,
    filters?: { status?: ExecutionStatus; from?: string; to?: string },
  ): Promise<PaginatedResult<ExecRow>> {
    const conditions = [
      `te.script_id IN (SELECT id FROM test_scripts WHERE app_id = $1 AND is_archived = false)`,
    ];
    const values: unknown[] = [appId];
    let paramIndex = 2;

    if (filters?.status) {
      conditions.push(`te.status = $${paramIndex++}`);
      values.push(filters.status);
    }
    if (filters?.from) {
      conditions.push(`te.created_at >= $${paramIndex++}`);
      values.push(filters.from);
    }
    if (filters?.to) {
      conditions.push(`te.created_at <= $${paramIndex++}`);
      values.push(filters.to);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;
    const offset = (pagination.page - 1) * pagination.limit;
    values.push(pagination.limit, offset);

    const [dataResult, countResult] = await Promise.all([
      this.pool.query<ExecRow>(
        `SELECT te.* FROM test_executions te ${where} ORDER BY te.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        values,
      ),
      this.pool.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM test_executions te ${where}`,
        values.slice(0, -2),
      ),
    ]);

    return {
      rows: dataResult.rows,
      total: parseInt(countResult.rows[0].count, 10),
    };
  }

  async findByScriptId(
    scriptId: string,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<ExecRow>> {
    const offset = (pagination.page - 1) * pagination.limit;

    const [dataResult, countResult] = await Promise.all([
      this.pool.query<ExecRow>(
        `SELECT * FROM test_executions WHERE script_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        [scriptId, pagination.limit, offset],
      ),
      this.pool.query<{ count: string }>(
        'SELECT COUNT(*) as count FROM test_executions WHERE script_id = $1',
        [scriptId],
      ),
    ]);

    return {
      rows: dataResult.rows,
      total: parseInt(countResult.rows[0].count, 10),
    };
  }

  async create(data: {
    script_id: string;
    environment_id: string;
    triggered_by: string;
    status?: string;
  }): Promise<ExecRow> {
    const result = await this.pool.query(
      `INSERT INTO test_executions (script_id, environment_id, triggered_by, status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.script_id, data.environment_id, data.triggered_by, data.status || 'queued'],
    );
    return result.rows[0];
  }

  async updateStatus(
    id: string,
    status: string,
    extra?: {
      queue_job_id?: string;
      started_at?: string;
      completed_at?: string;
      duration_ms?: number;
      error_message?: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<ExecRow | null> {
    const sets = ['status = $1'];
    const values: unknown[] = [status];
    let paramIndex = 2;

    if (extra?.queue_job_id !== undefined) {
      sets.push(`queue_job_id = $${paramIndex++}`);
      values.push(extra.queue_job_id);
    }
    if (extra?.started_at !== undefined) {
      sets.push(`started_at = $${paramIndex++}`);
      values.push(extra.started_at);
    }
    if (extra?.completed_at !== undefined) {
      sets.push(`completed_at = $${paramIndex++}`);
      values.push(extra.completed_at);
    }
    if (extra?.duration_ms !== undefined) {
      sets.push(`duration_ms = $${paramIndex++}`);
      values.push(extra.duration_ms);
    }
    if (extra?.error_message !== undefined) {
      sets.push(`error_message = $${paramIndex++}`);
      values.push(extra.error_message);
    }
    if (extra?.metadata !== undefined) {
      sets.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(extra.metadata));
    }

    values.push(id);
    const result = await this.pool.query(
      `UPDATE test_executions SET ${sets.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );
    return result.rows[0] || null;
  }

  async getDashboardStats(): Promise<{
    totalExecutions: number;
    passRate: number;
    recentExecutions: number;
  }> {
    const result = await this.pool.query(`
      SELECT
        COUNT(*)::int as total_executions,
        COUNT(*) FILTER (WHERE status = 'passed')::float /
          NULLIF(COUNT(*) FILTER (WHERE status IN ('passed', 'failed')), 0) * 100 as pass_rate,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours')::int as recent_executions
      FROM test_executions
    `);

    const row = result.rows[0];
    return {
      totalExecutions: row.total_executions || 0,
      passRate: Math.round((row.pass_rate || 0) * 100) / 100,
      recentExecutions: row.recent_executions || 0,
    };
  }
}
