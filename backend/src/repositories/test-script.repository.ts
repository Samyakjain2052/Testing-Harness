import type { Pool } from 'pg';
import { BaseRepository, type PaginationParams, type PaginatedResult } from './base.repository.js';
import type { ITestScript } from '@testing-harness/shared';

type ScriptRow = ITestScript & Record<string, unknown>;

export class TestScriptRepository extends BaseRepository<ScriptRow> {
  constructor(pool: Pool) {
    super(pool, 'test_scripts', ['app_id', 'created_by', 'is_archived']);
  }

  async findByAppId(
    appId: string,
    pagination: PaginationParams,
    search?: string,
    tags?: string[],
  ): Promise<PaginatedResult<ScriptRow>> {
    const conditions = ['app_id = $1', 'is_archived = false'];
    const values: unknown[] = [appId];
    let paramIndex = 2;

    if (search) {
      conditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      values.push(`%${search}%`);
      paramIndex++;
    }

    if (tags && tags.length > 0) {
      conditions.push(`tags && $${paramIndex}`);
      values.push(tags);
      paramIndex++;
    }

    const where = `WHERE ${conditions.join(' AND ')}`;
    const offset = (pagination.page - 1) * pagination.limit;
    values.push(pagination.limit, offset);

    const [dataResult, countResult] = await Promise.all([
      this.pool.query<ScriptRow>(
        `SELECT * FROM test_scripts ${where} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        values,
      ),
      this.pool.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM test_scripts ${where}`,
        values.slice(0, -2),
      ),
    ]);

    return {
      rows: dataResult.rows,
      total: parseInt(countResult.rows[0].count, 10),
    };
  }

  async create(data: {
    app_id: string;
    name: string;
    description?: string;
    blob_path: string;
    file_size_bytes?: number;
    content_hash?: string;
    tags?: string[];
    created_by: string;
  }): Promise<ScriptRow> {
    const result = await this.pool.query(
      `INSERT INTO test_scripts (app_id, name, description, blob_path, file_size_bytes, content_hash, tags, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        data.app_id,
        data.name,
        data.description || null,
        data.blob_path,
        data.file_size_bytes || null,
        data.content_hash || null,
        data.tags || [],
        data.created_by,
      ],
    );
    return result.rows[0];
  }

  async update(
    id: string,
    data: { name?: string; description?: string; tags?: string[]; blob_path?: string },
  ): Promise<ScriptRow | null> {
    const sets: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      sets.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.description !== undefined) {
      sets.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }
    if (data.tags !== undefined) {
      sets.push(`tags = $${paramIndex++}`);
      values.push(data.tags);
    }
    if (data.blob_path !== undefined) {
      sets.push(`blob_path = $${paramIndex++}`);
      values.push(data.blob_path);
    }

    if (sets.length === 0) return this.findById(id);

    values.push(id);
    const result = await this.pool.query(
      `UPDATE test_scripts SET ${sets.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );
    return result.rows[0] || null;
  }

  async archive(id: string): Promise<boolean> {
    const result = await this.pool.query(
      'UPDATE test_scripts SET is_archived = true WHERE id = $1',
      [id],
    );
    return (result.rowCount ?? 0) > 0;
  }
}
