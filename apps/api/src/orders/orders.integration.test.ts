import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { after, before, test } from 'node:test';
import type { INestApplication } from '@nestjs/common';
import type { DataSource } from 'typeorm';

const testUrl = process.env.TEST_DATABASE_URL;
const enabled = Boolean(testUrl);
let api: string;
let app: INestApplication | undefined;
let db: DataSource | undefined;
const userIds: number[] = [];
const productIds: number[] = [];

if (enabled) before(async () => {
  process.env.DATABASE_URL = testUrl;
  process.env.JWT_SECRET = 'integration-test-secret-with-at-least-32-characters';
  const [{ dataSource }, { AppModule }, { NestFactory }, { ValidationPipe }, { ApiExceptionFilter }] = await Promise.all([
    import('../database/data-source'), import('../app.module'), import('@nestjs/core'), import('@nestjs/common'), import('../common/api-exception.filter'),
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
});

if (enabled) after(async () => {
  if (!db) return;
  if (userIds.length) {
    await db.query('DELETE FROM orders WHERE user_id = ANY($1::int[])', [userIds]);
    await db.query('DELETE FROM users WHERE id = ANY($1::int[])', [userIds]);
  }
  if (productIds.length) {
    await db.query('DELETE FROM product_options WHERE product_id = ANY($1::int[])', [productIds]);
    await db.query('DELETE FROM products WHERE id = ANY($1::int[])', [productIds]);
  }
  await app?.close();
  await db.destroy();
});

test('auth, ownership, server-priced orders, rollback and concurrent stock are safe', { skip: !enabled }, async () => {
  const post = (path: string, body: unknown, token?: string) => fetch(`${api}${path}`, {
    method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body),
  });
  const get = (path: string, token?: string) => fetch(`${api}${path}`, { headers: token ? { authorization: `Bearer ${token}` } : {} });

  const unauthenticated = await get('/orders');
  assert.equal(unauthenticated.status, 401, await unauthenticated.clone().text());

  const email = `one-${Date.now()}@example.com`;
  const mismatchedPassword = await post('/auth/register', { fullName: 'Customer One', email, password: 'correct-horse-123', confirmPassword: 'different-password' });
  assert.equal(mismatchedPassword.status, 400);
  const attemptedRoleEscalation = await post('/auth/register', { fullName: 'Customer One', email, password: 'correct-horse-123', confirmPassword: 'correct-horse-123', role: 'MANAGER' });
  assert.equal(attemptedRoleEscalation.status, 400);
  const registration = await post('/auth/register', { fullName: 'Customer One', email, password: 'correct-horse-123', confirmPassword: 'correct-horse-123' });
  assert.equal(registration.status, 201);
  const session = await registration.json() as { accessToken: string; account: { id: number; role: string } };
  userIds.push(session.account.id);
  assert.equal(session.account.role, 'CUSTOMER');

  const duplicateRegistration = await post('/auth/register', { fullName: 'Customer One', email: email.toUpperCase(), password: 'correct-horse-123', confirmPassword: 'correct-horse-123' });
  assert.equal(duplicateRegistration.status, 409);

  const login = await post('/auth/login', { email: (await db!.query('SELECT email FROM users WHERE id = $1', [session.account.id]))[0].email, password: 'correct-horse-123' });
  assert.equal(login.status, 201);
  const loggedIn = await login.json() as { accessToken: string };
  const wrongPassword = await post('/auth/login', { email: `missing-${Date.now()}@example.com`, password: 'incorrect-pass' });
  assert.equal(wrongPassword.status, 401);

  const other = await post('/auth/register', { fullName: 'Customer Two', email: `two-${Date.now()}@example.com`, password: 'correct-horse-123', confirmPassword: 'correct-horse-123' });
  const otherSession = await other.json() as { accessToken: string; account: { id: number } };
  userIds.push(otherSession.account.id);

  const [product] = await db!.query(`INSERT INTO products(name, description, price, stock) VALUES ('Integration Drink', 'Test', 100, 10) RETURNING id`);
  productIds.push(product.id);
  const [secondProduct] = await db!.query(`INSERT INTO products(name, description, price, stock) VALUES ('Other Drink', 'Test', 200, 5) RETURNING id`);
  productIds.push(secondProduct.id);
  const [size] = await db!.query(`INSERT INTO product_options(product_id, kind, name, surcharge) VALUES ($1, 'SIZE', 'M', 30) RETURNING id`, [product.id]);
  const [topping] = await db!.query(`INSERT INTO product_options(product_id, kind, name, surcharge) VALUES ($1, 'TOPPING', 'Pearls', 20) RETURNING id`, [product.id]);
  const [foreignSize] = await db!.query(`INSERT INTO product_options(product_id, kind, name, surcharge) VALUES ($1, 'SIZE', 'M', 40) RETURNING id`, [secondProduct.id]);

  const created = await post('/orders', { items: [{ productId: product.id, sizeOptionId: size.id, toppingOptionIds: [topping.id], quantity: 2 }] }, loggedIn.accessToken);
  assert.equal(created.status, 201);
  const order = await created.json() as { orderId: number; status: string; totalAmount: number; items: Array<{ unitPrice: number; lineTotal: number }> };
  assert.equal(order.status, 'PENDING_PAYMENT');
  assert.equal(order.totalAmount, 300);
  assert.equal(order.items[0].unitPrice, 150);
  assert.equal(order.items[0].lineTotal, 300);
  assert.equal((await db!.query('SELECT stock FROM products WHERE id = $1', [product.id]))[0].stock, 8);

  assert.equal((await get(`/orders/${order.orderId}`, otherSession.accessToken)).status, 404);
  assert.equal((await get(`/orders/${order.orderId}`, loggedIn.accessToken)).status, 200);
  const ownList = await get('/orders', loggedIn.accessToken);
  assert.equal((await ownList.json() as unknown[]).length, 1);
  assert.equal((await (await get('/orders', otherSession.accessToken)).json() as unknown[]).length, 0);

  const invalidOption = await post('/orders', { items: [{ productId: product.id, sizeOptionId: foreignSize.id, quantity: 1 }] }, loggedIn.accessToken);
  assert.equal(invalidOption.status, 400);
  assert.equal((await invalidOption.json() as { code: string }).code, 'INVALID_PRODUCT_OPTION');
  const priceTampering = await post('/orders', { items: [{ productId: product.id, sizeOptionId: size.id, quantity: 1, unitPrice: 1 }] }, loggedIn.accessToken);
  assert.equal(priceTampering.status, 400);

  await db!.query('UPDATE products SET stock = 1 WHERE id = $1', [product.id]);
  const ordersBeforeShortage = Number((await db!.query('SELECT count(*) FROM orders WHERE user_id = $1', [session.account.id]))[0].count);
  const shortage = await post('/orders', { items: [{ productId: product.id, sizeOptionId: size.id, quantity: 2 }] }, loggedIn.accessToken);
  assert.equal(shortage.status, 409);
  assert.equal((await shortage.json() as { code: string }).code, 'INSUFFICIENT_STOCK');
  assert.equal((await db!.query('SELECT stock FROM products WHERE id = $1', [product.id]))[0].stock, 1);
  assert.equal(Number((await db!.query('SELECT count(*) FROM orders WHERE user_id = $1', [session.account.id]))[0].count), ordersBeforeShortage);

  const competing = await Promise.all([
    post('/orders', { items: [{ productId: product.id, sizeOptionId: size.id, quantity: 1 }] }, loggedIn.accessToken),
    post('/orders', { items: [{ productId: product.id, sizeOptionId: size.id, quantity: 1 }] }, loggedIn.accessToken),
  ]);
  assert.deepEqual(competing.map((response) => response.status).sort(), [201, 409]);
  assert.equal((await db!.query('SELECT stock FROM products WHERE id = $1', [product.id]))[0].stock, 0);
});
