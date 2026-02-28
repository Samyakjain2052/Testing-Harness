import type { Pool } from 'pg';
import { BaseRepository } from './base.repository.js';
import type { ITestResult } from '@testing-harness/shared';

type ResultRow = ITestResult & Record<string, unknown>;

export class TestResultRepository extends BaseRepository<ResultRow> {
  constructor(pool: Pool) {
    super(pool, 'test_results', ['execution_id', 'status']);
  }

  async findByExecutionId(executionId: string): Promise<ResultRow[]> {
    const result = await this.pool.query<ResultRow>(
      'SELECT * FROM test_results WHERE execution_id = $1 ORDER BY step_number ASC',
      [executionId],
    );
    return result.rows;
  }

  async createMany(
    results: Array<{
      execution_id: string;
      step_number: number;
      step_name: string;
      status: string;
      duration_ms?: number;
      screenshot_blob_path?: string;
      trace_blob_path?: string;
      error_details?: string;
      expected_value?: string;
      actual_value?: string;
    }>,
  ): Promise<ResultRow[]> {
    if (results.length === 0) return [];

    const valuePlaceholders: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    for (const r of results) {
      valuePlaceholders.push(
        `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`,
      );
      values.push(
        r.execution_id,
        r.step_number,
        r.step_name,
        r.status,
        r.duration_ms || null,
        r.screenshot_blob_path || null,
        r.trace_blob_path || null,
        r.error_details || null,
        r.expected_value || null,
        r.actual_value || null,
      );
    }

    const query = `
      INSERT INTO test_results
        (execution_id, step_number, step_name, status, duration_ms, screenshot_blob_path, trace_blob_path, error_details, expected_value, actual_value)
      VALUES ${valuePlaceholders.join(', ')}
      RETURNING *
    `;

    const result = await this.pool.query<ResultRow>(query, values);
    return result.rows;
  }
}
