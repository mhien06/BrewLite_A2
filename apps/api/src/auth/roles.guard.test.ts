import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { ForbiddenException, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

const context = (role: 'CUSTOMER' | 'STAFF' | 'MANAGER') => ({
  getHandler: () => ({}),
  getClass: () => ({}),
  switchToHttp: () => ({ getRequest: () => ({ user: { sub: 1, role } }) }),
}) as unknown as ExecutionContext;

test('RolesGuard allows an assigned role and rejects a different role', () => {
  const reflector = { getAllAndOverride: () => ['STAFF', 'MANAGER'] } as unknown as Reflector;
  const guard = new RolesGuard(reflector);
  assert.equal(guard.canActivate(context('STAFF')), true);
  assert.throws(() => guard.canActivate(context('CUSTOMER')), ForbiddenException);
});
