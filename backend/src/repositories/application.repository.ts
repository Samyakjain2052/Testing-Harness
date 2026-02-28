import type { Pool } from 'pg';
import { BaseRepository, type PaginationParams, type PaginatedResult } from './base.repository.js';
import type { IApplication } from '@testing-harness/shared';

type AppRow = IApplication & Record<string, unknown>;

export class ApplicationRepository extends BaseRepository<AppRow> {
  constructor(pool: Pool) {
    super(pool, 'applications', ['created_by', 'is_archived']);
  }

  async findByIdNotArchived(id: string): Promise<AppRow | null> {
    const result = await this.pool.query(
      'SELECT * FROM applications WHERE id = $1 AND is_archived = false',
      [id],
    );
    return result.rows[0] || null;
  }

  async findAllActive(
    pagination: PaginationParams,
    search?: string,
  ): Promise<PaginatedResult<AppRow>> {
    const values: unknown[] = [];
    let paramIndex = 1;
    const conditions = ['is_archived = false'];

    if (search) {
      conditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      values.push(`%${search}%`);
      paramIndex++;
    }

    const where = `WHERE ${conditions.join(' AND ')}`;
    const offset = (pagination.page - 1) * pagination.limit;
    values.push(pagination.limit, offset);

    const [dataResult, countResult] = await Promise.all([
      this.pool.query<AppRow>(
        `SELECT * FROM applications ${where} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        values,
      ),
      this.pool.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM applications ${where}`,
        values.slice(0, -2),
      ),
    ]);

    return {
      rows: dataResult.rows,
      total: parseInt(countResult.rows[0].count, 10),
    };
  }

  async create(data: {
    name: string;
    description?: string;
    created_by: string;
  }): Promise<AppRow> {
    const result = await this.pool.query(
      `INSERT INTO applications (name, description, created_by)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [data.name, data.description || null, data.created_by],
    );
    return result.rows[0];
  }

  async update(id: string, data: { name?: string; description?: string }): Promise<AppRow | null> {
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

    if (sets.length === 0) return this.findById(id);

    values.push(id);
    const result = await this.pool.query(
      `UPDATE applications SET ${sets.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );
    return result.rows[0] || null;
  }

  async archive(id: string): Promise<boolean> {
    const result = await this.pool.query(
      'UPDATE applications SET is_archived = true WHERE id = $1',
      [id],
    );
    return (result.rowCount ?? 0) > 0;
  }
}
