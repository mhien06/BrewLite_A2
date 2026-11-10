import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from './jwt.service';

test('JWT signs and verifies an HS256 account token', () => {
  process.env.JWT_SECRET = 'test-only-secret-with-at-least-32-characters';
  const jwt = new JwtService();
  const account = { sub: 42, fullName: 'Test User', email: 'test@example.com', role: 'CUSTOMER' as const };
  assert.deepEqual(jwt.verify(jwt.sign(account)), account);
});

test('JWT rejects a changed signature', () => {
  process.env.JWT_SECRET = 'test-only-secret-with-at-least-32-characters';
  const jwt = new JwtService();
  const token = jwt.sign({ sub: 42, fullName: 'Test User', email: 'test@example.com', role: 'CUSTOMER' });
  assert.throws(() => jwt.verify(`${token.slice(0, -1)}x`), UnauthorizedException);
});
