import type { Pool } from 'pg';
import { BaseRepository } from './base.repository.js';
import type { IUser } from '@testing-harness/shared';

type UserRow = IUser & Record<string, unknown>;

export class UserRepository extends BaseRepository<UserRow> {
  constructor(pool: Pool) {
    super(pool, 'users', ['email', 'role', 'is_active']);
  }

  async findByEmail(email: string): Promise<(UserRow & { password_hash: string | null }) | null> {
    const result = await this.pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email],
    );
    return result.rows[0] || null;
  }

  async create(data: {
    email: string;
    name: string;
    role?: string;
    password_hash?: string;
  }): Promise<UserRow> {
    const result = await this.pool.query(
      `INSERT INTO users (email, name, role, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.email, data.name, data.role || 'tester', data.password_hash || null],
    );
    return result.rows[0];
  }
}
