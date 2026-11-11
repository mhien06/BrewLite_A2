import { ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DATA_SOURCE } from '../database/database.module';
import { AuthUser } from './auth.types';
import { JwtService } from './jwt.service';

@Injectable()
export class AuthService {
  constructor(@Inject(DATA_SOURCE) private readonly db: DataSource, @Inject(JwtService) private readonly jwt: JwtService) {}

  async register(input: { fullName: string; email: string; password: string; confirmPassword: string }) {
    if (input.password !== input.confirmPassword) throw new ConflictException({ code: 'PASSWORD_MISMATCH', message: 'Passwords do not match.' });
    const email = input.email.trim().toLowerCase();
    const passwordHash = await import('bcryptjs').then(({ hash }) => hash(input.password, 12));
    try {
      const [user] = await this.db.query(
        `INSERT INTO users(full_name, email, password_hash) VALUES ($1, $2, $3)
         RETURNING id, full_name AS "fullName", email, role`,
        [input.fullName.trim(), email, passwordHash],
      ) as Array<{ id: number; fullName: string; email: string; role: AuthUser['role'] }>;
      return this.session(user);
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
        throw new ConflictException({ code: 'EMAIL_EXISTS', message: 'Email is already registered.' });
      }
      throw error;
    }
  }

  async login(emailInput: string, password: string) {
    const [user] = await this.db.query(
      `SELECT id, full_name AS "fullName", email, role, status, password_hash AS "passwordHash"
       FROM users WHERE email = $1`, [emailInput.trim().toLowerCase()],
    ) as Array<{ id: number; fullName: string; email: string; role: AuthUser['role']; status: string; passwordHash: string }>;
    const valid = user?.status === 'ACTIVE' && await import('bcryptjs').then(({ compare }) => compare(password, user.passwordHash));
    if (!valid) throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' });
    return this.session(user);
  }

  private session(user: { id: number; fullName: string; email: string; role: AuthUser['role'] }) {
    const account = { id: user.id, fullName: user.fullName, email: user.email, role: user.role };
    return { accessToken: this.jwt.sign({ sub: user.id, fullName: user.fullName, email: user.email, role: user.role }), tokenType: 'Bearer', expiresIn: this.jwt.expiresInSeconds, account };
  }
}
