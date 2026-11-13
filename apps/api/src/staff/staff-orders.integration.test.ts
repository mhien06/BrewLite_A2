import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import type { INestApplication } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import type { JwtService } from '../auth/jwt.service';

const testUrl = process.env.TEST_DATABASE_URL;
const enabled = Boolean(testUrl);
let api: string;
let app: INestApplication | undefined;
let db: DataSource | undefined;
let staffToken = '';
let managerToken = '';
let customerToken = '';
let userIds: number[] = [];
let productId = 0;

if (enabled) before(async () => {
  process.env.DATABASE_URL = testUrl;
  process.env.JWT_SECRET = 'staff-orders-test-secret-at-least-32-characters';
  const [{ dataSource }, { AppModule }, { NestFactory }, { ValidationPipe }, { ApiExceptionFilter }, { JwtService }] = await Promise.all([
    import('../database/data-source'), import('../app.module'), import('@nestjs/core'), import('@nestjs/common'),
    import('../common/api-exception.filter'), import('../auth/jwt.service'),
  ]);
  db = dataSource;
  await db.initialize();
  await db.runMigrations({ transaction: 'all' });
  const nest = await NestFactory.create(AppModule, { logger: false });
  nest.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  nest.useGlobalFilters(new ApiExceptionFilter());
  await nest.listen(0, '127.0.0.1');
  app = nest;
  api = await nest.getUrl();

  const suffix = randomUUID();
  const createUser = async (role: 'CUSTOMER' | 'STAFF' | 'MANAGER') => {
    const [user] = await db!.query(`INSERT INTO users(full_name,email,password_hash,role)
      VALUES ($1,$2,'not-used-by-this-test',$3) RETURNING id, full_name AS "fullName", email, role`,
    [`Test ${role}`, `${role.toLowerCase()}-${suffix}@example.com`, role]) as Array<{ id: number; fullName: string; email: string; role: 'CUSTOMER' | 'STAFF' | 'MANAGER' }>;
    return { id: user.id, token: (nest.get(JwtService) as JwtService).sign({ sub: user.id, fullName: user.fullName, email: user.email, role }) };
  };
  const customer = await createUser('CUSTOMER');
  const staff = await createUser('STAFF');
  const manager = await createUser('MANAGER');
  userIds = [customer.id, staff.id, manager.id];
  customerToken = customer.token;
  staffToken = staff.token;
  managerToken = manager.token;
  const [product] = await db.query(`INSERT INTO products(name,description,price,stock)
    VALUES ('Staff Test Drink','Test product',100,20) RETURNING id`);
  productId = product.id;
});

if (enabled) after(async () => {
  if (!db) return;
  const [orders] = await db.query('SELECT COALESCE(array_agg(id), ARRAY[]::int[]) AS ids FROM orders WHERE user_id = ANY($1::int[])', [userIds]);
  const ids = orders.ids as number[];
  if (ids.length) {
    await db.query('DELETE FROM payment_reviews WHERE payment_id IN (SELECT id FROM payments WHERE order_id = ANY($1::int[]))', [ids]);
    await db.query('DELETE FROM payments WHERE order_id = ANY($1::int[])', [ids]);
    await db.query('DELETE FROM orders WHERE id = ANY($1::int[])', [ids]);
  }
  if (userIds.length) await db.query('DELETE FROM users WHERE id = ANY($1::int[])', [userIds]);
  if (productId) await db.query('DELETE FROM products WHERE id = $1', [productId]);
  await app?.close();
  await db.destroy();
});

test('staff order API enforces roles, payment verification, safe detail, ordered transitions, and concurrency', { skip: !enabled }, async () => {
  const request = (path: string, token?: string, init: RequestInit = {}) => fetch(`${api}${path}`, {
    ...init,
    headers: { ...(init.body ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}), ...(init.headers || {}) },
  });
  const createOrder = async (status: string, paymentStatus?: string) => {
    const [order] = await db!.query(`INSERT INTO orders(user_id,status,subtotal,total_amount)
      VALUES ($1,$2,100,100) RETURNING id`, [userIds[0], status]);
    await db!.query(`INSERT INTO order_items(order_id,product_id,product_name,size_snapshot,toppings_snapshot,quantity,unit_price,line_total)
      VALUES ($1,$2,'Staff Test Drink','{"id":1,"name":"M"}'::jsonb,'[{"id":2,"name":"Pearls"}]'::jsonb,1,100,100)`, [order.id, productId]);
    if (paymentStatus) {
      const now = new Date();
      await db!.query(`INSERT INTO payments(order_id,transaction_ref,idempotency_key,amount,status,payment_url,created_at,expires_at,next_query_at)
        VALUES ($1,$2,$3,100,$4,'https://sandbox.invalid/pay',$5,$6,$5)`,
      [order.id, randomUUID().replace(/-/g, ''), randomUUID(), paymentStatus, now, new Date(now.getTime() + 15 * 60 * 1000)]);
    }
    return Number(order.id);
  };

  const unauthenticated = await request('/staff/orders');
  assert.equal(unauthenticated.status, 401);
  assert.equal((await request('/staff/orders', customerToken)).status, 403);

  const unpaidId = await createOrder('PENDING_PAYMENT', 'PENDING');
  const unpaidStart = await request(`/staff/orders/${unpaidId}/status`, staffToken, { method: 'PATCH', body: JSON.stringify({ status: 'PREPARING' }) });
  assert.equal(unpaidStart.status, 409);
  assert.equal((await unpaidStart.json() as { code: string }).code, 'ORDER_NOT_PAID');

  const [paidId, concurrentId] = await Promise.all([createOrder('PAID', 'SUCCESS'), createOrder('PAID', 'SUCCESS')]);
  const staffList = await request('/staff/orders', staffToken);
  assert.equal(staffList.status, 200);
  const listed = await staffList.json() as Array<{ orderId: number; status: string; paymentStatus: string; paymentVerified: boolean; customerName: string; items: unknown[] }>;
  assert.ok(listed.some(order => order.orderId === paidId && order.paymentStatus === 'SUCCESS' && order.paymentVerified));
  assert.ok(listed.some(order => order.orderId === unpaidId && order.status === 'PENDING_PAYMENT' && !order.paymentVerified));
  assert.ok(listed.some(order => order.orderId === paidId && order.items.length === 1));
  assert.equal(JSON.stringify(listed).includes('password_hash'), false);
  assert.equal(JSON.stringify(listed).includes('customerId'), false);

  const managerDetail = await request(`/staff/orders/${paidId}`, managerToken);
  assert.equal(managerDetail.status, 200);
  assert.equal(((await managerDetail.json()) as { orderId: number }).orderId, paidId);
  assert.equal((await request('/staff/orders/2147483647', staffToken)).status, 404);
  assert.equal((await request(`/staff/orders/${paidId}/status`, staffToken, { method: 'PATCH', body: JSON.stringify({ status: 'NOT_A_STATUS' }) })).status, 400);
  assert.equal((await request(`/staff/orders/${paidId}/status`, staffToken, { method: 'PATCH', body: JSON.stringify({ status: 'COMPLETED' }) })).status, 409);

  const prepare = await request(`/staff/orders/${paidId}/status`, staffToken, { method: 'PATCH', body: JSON.stringify({ status: 'PREPARING' }) });
  assert.equal(prepare.status, 200);
  assert.equal(((await prepare.json()) as { status: string }).status, 'PREPARING');
  const concurrent = await Promise.all([
    request(`/staff/orders/${concurrentId}/status`, staffToken, { method: 'PATCH', body: JSON.stringify({ status: 'PREPARING' }) }),
    request(`/staff/orders/${concurrentId}/status`, managerToken, { method: 'PATCH', body: JSON.stringify({ status: 'PREPARING' }) }),
  ]);
  assert.deepEqual(concurrent.map(response => response.status).sort(), [200, 409]);

  for (const [currentId, sequence] of [[paidId, ['READY_FOR_PICKUP', 'COMPLETED']], [concurrentId, ['READY_FOR_PICKUP', 'COMPLETED']]] as const) {
    for (const status of sequence) {
      const response = await request(`/staff/orders/${currentId}/status`, staffToken, { method: 'PATCH', body: JSON.stringify({ status }) });
      assert.equal(response.status, 200);
    }
    const terminal = await request(`/staff/orders/${currentId}/status`, staffToken, { method: 'PATCH', body: JSON.stringify({ status: 'PREPARING' }) });
    assert.equal(terminal.status, 409);
    assert.equal((await terminal.json() as { code: string }).code, 'ORDER_TERMINAL');
  }

  const cancelledId = await createOrder('CANCELLED');
  const cancelled = await request(`/staff/orders/${cancelledId}/status`, staffToken, { method: 'PATCH', body: JSON.stringify({ status: 'PREPARING' }) });
  assert.equal(cancelled.status, 409);
  assert.equal((await cancelled.json() as { code: string }).code, 'ORDER_TERMINAL');
});
