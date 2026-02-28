import type { Pool, QueryResult } from 'pg';

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  rows: T[];
  total: number;
}

export class BaseRepository<T extends Record<string, unknown>> {
  constructor(
    protected pool: Pool,
    protected tableName: string,
    protected allowedFilterColumns: string[] = [],
  ) {}

  async findById(id: string): Promise<T | null> {
    const result: QueryResult<T> = await this.pool.query(
      `SELECT * FROM ${this.tableName} WHERE id = $1`,
      [id],
    );
    return result.rows[0] || null;
  }

  async findAll(pagination: PaginationParams): Promise<PaginatedResult<T>> {
    const offset = (pagination.page - 1) * pagination.limit;

    const [dataResult, countResult] = await Promise.all([
      this.pool.query<T>(
        `SELECT * FROM ${this.tableName} ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
        [pagination.limit, offset],
      ),
      this.pool.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM ${this.tableName}`,
      ),
    ]);

    return {
      rows: dataResult.rows,
      total: parseInt(countResult.rows[0].count, 10),
    };
  }

  async findWithFilters(
    filters: Record<string, unknown>,
    pagination: PaginationParams,
    orderBy = 'created_at DESC',
  ): Promise<PaginatedResult<T>> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(filters)) {
      if (!this.allowedFilterColumns.includes(key)) continue;
      if (value === undefined || value === null) continue;

      conditions.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (pagination.page - 1) * pagination.limit;

    values.push(pagination.limit, offset);

    const [dataResult, countResult] = await Promise.all([
      this.pool.query<T>(
        `SELECT * FROM ${this.tableName} ${where} ORDER BY ${orderBy} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        values,
      ),
      this.pool.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM ${this.tableName} ${where}`,
        values.slice(0, -2),
      ),
    ]);

    return {
      rows: dataResult.rows,
      total: parseInt(countResult.rows[0].count, 10),
    };
  }

  async deleteById(id: string): Promise<boolean> {
    const result = await this.pool.query(
      `DELETE FROM ${this.tableName} WHERE id = $1`,
      [id],
    );
    return (result.rowCount ?? 0) > 0;
  }
}
