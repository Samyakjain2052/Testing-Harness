import type { Pool } from 'pg';
import { BaseRepository } from './base.repository.js';
import type { IEnvironment } from '@testing-harness/shared';

type EnvRow = IEnvironment & Record<string, unknown>;

export class EnvironmentRepository extends BaseRepository<EnvRow> {
  constructor(pool: Pool) {
    super(pool, 'environments', ['app_id', 'is_active']);
  }

  async findByAppId(appId: string): Promise<EnvRow[]> {
    const result = await this.pool.query<EnvRow>(
      'SELECT * FROM environments WHERE app_id = $1 ORDER BY name ASC',
      [appId],
    );
    return result.rows;
  }

  async findByAppIdAndName(appId: string, name: string): Promise<EnvRow | null> {
    const result = await this.pool.query<EnvRow>(
      'SELECT * FROM environments WHERE app_id = $1 AND name = $2',
      [appId, name],
    );
    return result.rows[0] || null;
  }

  async create(data: {
    app_id: string;
    name: string;
    base_url: string;
    variables?: Record<string, string>;
  }): Promise<EnvRow> {
    const result = await this.pool.query(
      `INSERT INTO environments (app_id, name, base_url, variables)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.app_id, data.name, data.base_url, JSON.stringify(data.variables || {})],
    );
    return result.rows[0];
  }

  async update(
    id: string,
    data: {
      name?: string;
      base_url?: string;
      is_active?: boolean;
      variables?: Record<string, string>;
    },
  ): Promise<EnvRow | null> {
    const sets: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      sets.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.base_url !== undefined) {
      sets.push(`base_url = $${paramIndex++}`);
      values.push(data.base_url);
    }
    if (data.is_active !== undefined) {
      sets.push(`is_active = $${paramIndex++}`);
      values.push(data.is_active);
    }
    if (data.variables !== undefined) {
      sets.push(`variables = $${paramIndex++}`);
      values.push(JSON.stringify(data.variables));
    }

    if (sets.length === 0) return this.findById(id);

    values.push(id);
    const result = await this.pool.query(
      `UPDATE environments SET ${sets.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );
    return result.rows[0] || null;
  }
}
