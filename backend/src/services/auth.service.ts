import { UserRepository } from '../repositories/user.repository.js';
import { generateToken, type AuthPayload } from '../middleware/auth.js';
import { AppError } from '../middleware/error-handler.js';
import { getPool } from '../config/database.js';
import type { IUser, UserRole } from '@testing-harness/shared';

export class AuthService {
  private userRepo: UserRepository;

  constructor() {
    this.userRepo = new UserRepository(getPool());
  }

  async login(email: string, _password: string): Promise<{ token: string; user: IUser }> {
    const existing = await this.userRepo.findByEmail(email);

    const user = existing ?? await this.userRepo.create({
      email,
      name: email.split('@')[0],
      role: 'tester',
    });

    if (!user.is_active) {
      throw new AppError(403, 'ACCOUNT_DISABLED', 'Account is disabled');
    }

    const payload: AuthPayload = {
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
    };

    const token = generateToken(payload);

    return { token, user: user as unknown as IUser };
  }

  async register(
    email: string,
    name: string,
    _password: string,
  ): Promise<{ token: string; user: IUser }> {
    const existing = await this.userRepo.findByEmail(email);
    if (existing) {
      throw new AppError(409, 'EMAIL_EXISTS', 'Email is already registered');
    }

    const user = await this.userRepo.create({ email, name, role: 'tester' });

    const payload: AuthPayload = {
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
    };

    const token = generateToken(payload);
    return { token, user: user as IUser };
  }

  async getMe(userId: string): Promise<IUser> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    }
    return user as IUser;
  }
}
