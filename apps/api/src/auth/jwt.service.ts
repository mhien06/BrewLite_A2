import { Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { AuthUser } from './auth.types';
import { UserRole } from '../common/roles.decorator';

const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');

function isUserRole(value: unknown): value is UserRole {
  return value === 'CUSTOMER' || value === 'STAFF' || value === 'MANAGER';
}

@Injectable()
export class JwtService {
  private get secret() {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) throw new InternalServerErrorException('JWT_SECRET must contain at least 32 characters.');
    return secret;
  }

  get expiresInSeconds() {
    const expiresIn = Number(process.env.JWT_EXPIRES_IN_SECONDS ?? 3600);
    if (!Number.isSafeInteger(expiresIn) || expiresIn <= 0) {
      throw new InternalServerErrorException('JWT_EXPIRES_IN_SECONDS must be a positive safe integer.');
    }
    return expiresIn;
  }

  sign(user: AuthUser) {
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + this.expiresInSeconds;
    if (!Number.isSafeInteger(expiresAt)) {
      throw new InternalServerErrorException('JWT_EXPIRES_IN_SECONDS is outside the supported range.');
    }
    const header = encode({ alg: 'HS256', typ: 'JWT' });
    const payload = encode({ ...user, iat: now, exp: expiresAt });
    const content = `${header}.${payload}`;
    const signature = createHmac('sha256', this.secret).update(content).digest('base64url');
    return `${content}.${signature}`;
  }

  verify(token: string): AuthUser {
    const secret = this.secret;
    try {
      const [header, payload, signature, extra] = token.split('.');
      if (!header || !payload || !signature || extra) throw new Error('Invalid token shape');
      const decodedHeader = JSON.parse(Buffer.from(header, 'base64url').toString('utf8')) as { alg?: string };
      if (decodedHeader.alg !== 'HS256') throw new Error('Invalid algorithm');
      const expected = createHmac('sha256', secret).update(`${header}.${payload}`).digest();
      const actual = Buffer.from(signature, 'base64url');
      if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error('Invalid signature');
      const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Partial<AuthUser> & {
        exp?: unknown;
        iat?: unknown;
      };
      const now = Math.floor(Date.now() / 1000);
      if (
        !Number.isSafeInteger(claims.sub) || !claims.sub || claims.sub < 1 ||
        typeof claims.email !== 'string' || typeof claims.fullName !== 'string' ||
        !isUserRole(claims.role) ||
        typeof claims.iat !== 'number' || !Number.isSafeInteger(claims.iat) || claims.iat > now ||
        typeof claims.exp !== 'number' || !Number.isSafeInteger(claims.exp) ||
        claims.exp <= now || claims.exp <= claims.iat
      ) throw new Error('Invalid token claims');
      return { sub: claims.sub, email: claims.email, fullName: claims.fullName, role: claims.role };
    } catch {
      throw new UnauthorizedException({ code: 'INVALID_TOKEN', message: 'Invalid or expired access token.' });
    }
  }
}
