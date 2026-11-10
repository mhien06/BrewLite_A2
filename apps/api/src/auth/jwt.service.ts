import { Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { AuthUser } from './auth.types';

const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');

@Injectable()
export class JwtService {
  private get secret() {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) throw new InternalServerErrorException('JWT_SECRET must contain at least 32 characters.');
    return secret;
  }

  sign(user: AuthUser) {
    const now = Math.floor(Date.now() / 1000);
    const header = encode({ alg: 'HS256', typ: 'JWT' });
    const payload = encode({ ...user, iat: now, exp: now + Number(process.env.JWT_EXPIRES_IN_SECONDS ?? 3600) });
    const content = `${header}.${payload}`;
    const signature = createHmac('sha256', this.secret).update(content).digest('base64url');
    return `${content}.${signature}`;
  }

  verify(token: string): AuthUser {
    try {
      const [header, payload, signature, extra] = token.split('.');
      if (!header || !payload || !signature || extra) throw new Error('Invalid token shape');
      const decodedHeader = JSON.parse(Buffer.from(header, 'base64url').toString('utf8')) as { alg?: string };
      if (decodedHeader.alg !== 'HS256') throw new Error('Invalid algorithm');
      const expected = createHmac('sha256', this.secret).update(`${header}.${payload}`).digest();
      const actual = Buffer.from(signature, 'base64url');
      if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error('Invalid signature');
      const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as AuthUser & { exp?: number };
      if (!claims.sub || !claims.role || !claims.exp || claims.exp <= Math.floor(Date.now() / 1000)) throw new Error('Expired token');
      return { sub: claims.sub, email: claims.email, fullName: claims.fullName, role: claims.role };
    } catch {
      throw new UnauthorizedException({ code: 'INVALID_TOKEN', message: 'Invalid or expired access token.' });
    }
  }
}
