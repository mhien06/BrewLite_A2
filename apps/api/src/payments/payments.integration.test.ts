import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { before, after, test } from 'node:test';
import { randomUUID, createHmac } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import type { ReconciliationJob } from './reconciliation.job';
import { PAYMENT_GATEWAY, PaymentGateway, PaymentEvidence } from './payment-gateway';

const enabled = Boolean(process.env.TEST_DATABASE_URL);
const secret = 'integration-test-only-vnpay-secret';
let app: INestApplication;
let db: DataSource;
let api: string;
let token: string;
let otherToken: string;
let job: ReconciliationJob;
let productId: number;
let sizeId: number;
const userIds: number[] = [];
const orders: number[] = [];

const post = (path: string, body: unknown, auth = token) => fetch(`${api}${path}`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}) }, body: JSON.stringify(body),
});
const get = (path: string, auth = token) => fetch(`${api}${path}`, { headers: auth ? { Authorization: `Bearer ${auth}` } : {} });

if (enabled) before(async () => {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.JWT_SECRET = 'integration-test-secret-at-least-32-characters';
  process.env.PAYMENT_RECONCILIATION_ENABLED = 'false';
  process.env.VNPAY_TMN_CODE = 'TESTCODE'; process.env.VNPAY_HASH_SECRET = secret;
  process.env.VNPAY_PAYMENT_URL = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
  process.env.VNPAY_QUERY_URL = 'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction';
  process.env.VNPAY_RETURN_URL = 'http://localhost:3002/payment/return';
  const [{ dataSource }, { AppModule }, { NestFactory }, { ValidationPipe }, { ApiExceptionFilter }] = await Promise.all([
    import('../database/data-source'), import('../app.module'), import('@nestjs/core'), import('@nestjs/common'), import('../common/api-exception.filter'),
  ]);
  db = dataSource;
  await db.initialize(); await db.runMigrations({ transaction: 'all' });
  app = await NestFactory.create(AppModule, { logger: false });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new ApiExceptionFilter());
  await app.listen(0, '127.0.0.1'); api = await app.getUrl();
  const { ReconciliationJob } = await import('./reconciliation.job');
  job = app.get(ReconciliationJob);
  for (let index = 0; index < 2; index++) {
    const response = await post('/auth/register', { fullName: 'Payment Test', email: `${randomUUID()}@example.com`, password: 'test-password-123', confirmPassword: 'test-password-123' }, '');
    assert.equal(response.status, 201);
    const session = await response.json() as { accessToken: string; account: { id: number } };
    userIds.push(session.account.id);
    if (index === 0) token = session.accessToken; else otherToken = session.accessToken;
  }
  const [product] = await db.query("INSERT INTO products(name,description,price,stock) VALUES ('Payment test drink','Test',29000,100) RETURNING id");
  productId = product.id;
  const [size] = await db.query("INSERT INTO product_options(product_id,kind,name,surcharge) VALUES ($1,'SIZE','S',0) RETURNING id", [productId]);
  sizeId = size.id;
});

if (enabled) after(async () => {
  if (db?.isInitialized && orders.length) {
    await db.query('DELETE FROM payment_reviews WHERE payment_id IN (SELECT id FROM payments WHERE order_id = ANY($1::int[]))', [orders]);
    await db.query('DELETE FROM payments WHERE order_id = ANY($1::int[])', [orders]);
    await db.query('DELETE FROM orders WHERE id = ANY($1::int[])', [orders]);
  }
  if (db?.isInitialized && productId) {
    await db.query('DELETE FROM product_options WHERE product_id = $1', [productId]);
    await db.query('DELETE FROM products WHERE id = $1', [productId]);
    await db.query('DELETE FROM users WHERE id = ANY($1::int[])', [userIds]);
  }
  await app?.close();
  if (db?.isInitialized) await db.destroy();
});

interface Attempt { paymentId: number; transactionRef: string; amount: number; status: string; paymentUrl: string | null; idempotencyKey: string; expiresAt: string; createdAt: string }
async function createOrder() {
  const response = await post('/orders', { items: [{ productId, sizeOptionId: sizeId, quantity: 1 }] });
  assert.equal(response.status, 201);
  const order = await response.json() as { orderId: number };
  orders.push(order.orderId); return order.orderId;
}
async function createPayment(orderId: number, key: string = randomUUID()) {
  const response = await post(`/orders/${orderId}/payments`, { idempotencyKey: key });
  assert.equal(response.status, 201, await response.clone().text());
  return response.json() as Promise<Attempt>;
}
async function stock() { return (await db.query('SELECT stock FROM products WHERE id = $1', [productId]))[0].stock as number; }
async function paymentRow(id: number) { return (await db.query('SELECT * FROM payments WHERE id = $1', [id]))[0]; }
function signedQuery(attempt: Attempt, overrides: Record<string, string> = {}) {
  const parameters: Record<string, string> = {
    vnp_TmnCode: 'TESTCODE', vnp_TxnRef: attempt.transactionRef, vnp_Amount: String(attempt.amount * 100),
    vnp_ResponseCode: '00', vnp_TransactionStatus: '00', vnp_TransactionNo: '987654',
    vnp_PayDate: '20261113170200', vnp_BankCode: 'NCB', ...overrides,
  };
  const data = Object.keys(parameters).sort().map(key => `${encodeURIComponent(key)}=${encodeURIComponent(parameters[key]).replace(/%20/g, '+')}`).join('&');
  return `${data}&vnp_SecureHash=${createHmac('sha512', secret).update(data).digest('hex')}`;
}
async function ipn(attempt: Attempt, overrides: Record<string, string> = {}) {
  const response = await get(`/payments/vnpay/ipn?${signedQuery(attempt, overrides)}`, '');
  assert.equal(response.status, 200);
  return (await response.json() as { RspCode: string }).RspCode;
}

test('payment API enforces JWT, ownership, server amount and idempotency under concurrency', { skip: !enabled }, async () => {
  const orderId = await createOrder();
  assert.equal((await post(`/orders/${orderId}/payments`, {}, '')).status, 401);
  assert.equal((await get(`/orders/${orderId}/payment-status`, '')).status, 401);
  assert.equal((await post(`/orders/${orderId}/payments`, {}, otherToken)).status, 404);
  assert.equal((await get(`/orders/${orderId}/payment-status`, otherToken)).status, 404);
  assert.equal((await post(`/orders/${orderId}/payments`, { amount: 1 })).status, 400);
  assert.equal((await post(`/orders/${orderId}/payments`, { idempotencyKey: 'invalid' })).status, 400);
  const [first, second] = await Promise.all([createPayment(orderId), createPayment(orderId)]);
  assert.equal(first.paymentId, second.paymentId);
  assert.equal(first.amount, 29000);
  assert.equal(new Date(first.expiresAt).getTime() - new Date(first.createdAt).getTime(), 15 * 60 * 1000);
  assert.equal((await createPayment(orderId, first.idempotencyKey)).paymentId, first.paymentId);
  assert.equal(Number((await db.query('SELECT count(*) FROM payments WHERE order_id=$1', [orderId]))[0].count), 1);
});

test('invalid/repeated IPN and forged Return parameters cannot corrupt order or stock', { skip: !enabled }, async () => {
  const orderId = await createOrder(); const attempt = await createPayment(orderId);
  const beforeStock = await stock();
  const invalid = await get(`/payments/vnpay/ipn?${signedQuery(attempt)}0`, '');
  assert.equal((await invalid.json() as { RspCode: string }).RspCode, '97');
  assert.equal(await ipn(attempt, { vnp_TmnCode: 'OTHERONE' }), '97');
  assert.equal(await ipn(attempt, { vnp_Amount: '100' }), '04');
  assert.equal(await ipn(attempt, { vnp_TxnRef: 'missing' }), '01');
  await get(`/orders/${orderId}/payment-status?vnp_ResponseCode=00&vnp_TransactionStatus=00`);
  assert.equal((await paymentRow(attempt.paymentId)).status, 'PENDING');
  const codes = await Promise.all([ipn(attempt), ipn(attempt), ipn(attempt)]);
  assert.deepEqual(codes.sort(), ['00', '02', '02']);
  assert.equal((await paymentRow(attempt.paymentId)).status, 'SUCCESS');
  assert.equal((await db.query('SELECT status FROM orders WHERE id=$1', [orderId]))[0].status, 'PAID');
  assert.equal(await stock(), beforeStock);
  assert.equal((await post(`/orders/${orderId}/payments`, {})).status, 409);
});

test('verified failure/expiry releases stock once; retry reserves it again with a fresh ref', { skip: !enabled }, async () => {
  for (const code of ['24', '11']) {
    const initialStock = await stock();
    const orderId = await createOrder(); const attempt = await createPayment(orderId);
    const failures = { vnp_ResponseCode: code, vnp_TransactionStatus: '02' };
    assert.equal(await ipn(attempt, failures), '00');
    assert.equal(await ipn(attempt, failures), '02');
    assert.equal(await stock(), initialStock);
    assert.equal((await paymentRow(attempt.paymentId)).status, code === '11' ? 'EXPIRED' : 'FAILED');
    assert.equal((await db.query('SELECT status FROM orders WHERE id=$1', [orderId]))[0].status, 'PENDING_PAYMENT');
    // Gửi lại cùng khóa không được tạo attempt mới hoặc trả lại URL đã kết thúc.
    const replay = await createPayment(orderId, attempt.idempotencyKey);
    assert.equal(replay.paymentId, attempt.paymentId); assert.equal(replay.paymentUrl, null);
    const retry = await createPayment(orderId);
    assert.notEqual(retry.transactionRef, attempt.transactionRef);
    assert.notEqual(retry.idempotencyKey, attempt.idempotencyKey);
    assert.equal(await stock(), initialStock - 1);
    await ipn(retry);
  }
});

test('retry rolls back if released inventory is no longer available', { skip: !enabled }, async () => {
  const orderId = await createOrder(); const attempt = await createPayment(orderId);
  await ipn(attempt, { vnp_ResponseCode: '24', vnp_TransactionStatus: '02' });
  const savedStock = await stock();
  try {
    await db.query('UPDATE products SET stock=0 WHERE id=$1', [productId]);
    assert.equal((await post(`/orders/${orderId}/payments`, {})).status, 409);
    assert.equal(Number((await db.query('SELECT count(*) FROM payments WHERE order_id=$1', [orderId]))[0].count), 1);
  } finally { await db.query('UPDATE products SET stock=$2 WHERE id=$1', [productId, savedStock]); }
});

test('expiry alone hides URL; QueryDR unknown blocks retry; later verified success settles once', { skip: !enabled }, async () => {
  const orderId = await createOrder(); const attempt = await createPayment(orderId);
  const beforeStock = await stock();
  await db.query("UPDATE payments SET created_at=now()-interval '16 minutes', expires_at=now()-interval '1 minute', next_query_at=now()-interval '1 minute' WHERE id=$1", [attempt.paymentId]);
  const repeated = await createPayment(orderId);
  assert.equal(repeated.paymentId, attempt.paymentId); assert.equal(repeated.paymentUrl, null);
  const gateway = app.get<PaymentGateway>(PAYMENT_GATEWAY);
  const originalQuery = gateway.queryTransaction.bind(gateway);
  let calls = 0;
  gateway.queryTransaction = async () => { calls++; return null; };
  try {
    await Promise.all([job.run(), job.run()]);
    assert.equal(calls, 1);
    assert.equal((await paymentRow(attempt.paymentId)).status, 'UNKNOWN');
    assert.equal(await stock(), beforeStock);
    assert.equal((await createPayment(orderId)).paymentId, attempt.paymentId);
    const status = await (await get(`/orders/${orderId}/payment-status`)).json() as { canRetry: boolean };
    assert.equal(status.canRetry, false); assert.equal(calls, 1);
    const evidence: PaymentEvidence = { transactionRef: attempt.transactionRef, amount: attempt.amount, status: 'SUCCESS', responseCode: '00', transactionStatus: '00', transactionNo: '123456', payDate: '20261113170200', bankCode: 'NCB' };
    gateway.queryTransaction = async () => evidence;
    await db.query("UPDATE payments SET next_query_at=now()-interval '1 minute' WHERE id=$1", [attempt.paymentId]);
    await Promise.all([job.run(), ipn(attempt)]);
    assert.equal((await paymentRow(attempt.paymentId)).status, 'SUCCESS');
    assert.equal(await stock(), beforeStock);
  } finally { gateway.queryTransaction = originalQuery; }
});

test('late successful IPN after terminal failure records review without reopening order or releasing twice', { skip: !enabled }, async () => {
  const orderId = await createOrder(); const attempt = await createPayment(orderId);
  await ipn(attempt, { vnp_ResponseCode: '11', vnp_TransactionStatus: '02' });
  const beforeStock = await stock();
  assert.equal(await ipn(attempt), '02'); assert.equal(await ipn(attempt), '02');
  const row = await paymentRow(attempt.paymentId);
  assert.equal(row.status, 'EXPIRED'); assert.equal(row.review_required, true);
  assert.equal((await db.query('SELECT status FROM orders WHERE id=$1', [orderId]))[0].status, 'PENDING_PAYMENT');
  assert.equal(await stock(), beforeStock);
  assert.equal(Number((await db.query('SELECT count(*) FROM payment_reviews WHERE payment_id=$1', [attempt.paymentId]))[0].count), 1);
  assert.equal((await post(`/orders/${orderId}/payments`, {})).status, 409);
});

test('QueryDR alone settles missing IPN and two job instances claim an attempt only once', { skip: !enabled }, async () => {
  const { ReconciliationJob } = await import('./reconciliation.job');
  const { PaymentSettlementService } = await import('./payment-settlement.service');
  const gateway = app.get<PaymentGateway>(PAYMENT_GATEWAY);
  const originalQuery = gateway.queryTransaction.bind(gateway);
  const secondJob = new ReconciliationJob(db, gateway, app.get(PaymentSettlementService));
  try {
    for (const outcome of ['SUCCESS', 'FAILED'] as const) {
      const orderId = await createOrder(); const attempt = await createPayment(orderId);
      const reservedStock = await stock();
      let calls = 0;
      gateway.queryTransaction = async request => {
        calls++;
        return { transactionRef: request.transactionRef, amount: request.amount, status: outcome,
          responseCode: '00', transactionStatus: outcome === 'SUCCESS' ? '00' : '02',
          transactionNo: '123456', payDate: '20261113170200', bankCode: 'NCB' };
      };
      await db.query("UPDATE payments SET created_at=now()-interval '16 minutes', expires_at=now()-interval '1 minute', next_query_at=now()-interval '1 minute' WHERE id=$1", [attempt.paymentId]);
      await Promise.all([job.run(), secondJob.run()]);
      assert.equal(calls, 1);
      assert.equal((await paymentRow(attempt.paymentId)).status, outcome);
      assert.equal((await paymentRow(attempt.paymentId)).settlement_source, 'QUERY');
      assert.equal(await stock(), outcome === 'FAILED' ? reservedStock + 1 : reservedStock);
      await Promise.all([job.run(), secondJob.run()]);
      assert.equal(calls, 1);
    }
  } finally { gateway.queryTransaction = originalQuery; }
});

test('success for an order no longer payable is recorded for manual review, never overwritten to PAID', { skip: !enabled }, async () => {
  const orderId = await createOrder(); const attempt = await createPayment(orderId);
  // Schema hiện tại chưa có CANCELLED/EXPIRED trên Order. PREPARING kiểm tra cùng nhánh bảo vệ.
  await db.query("UPDATE orders SET status='PREPARING' WHERE id=$1", [orderId]);
  const beforeStock = await stock();
  assert.equal(await ipn(attempt), '00');
  assert.equal((await paymentRow(attempt.paymentId)).review_required, true);
  assert.equal((await db.query('SELECT status FROM orders WHERE id=$1', [orderId]))[0].status, 'PREPARING');
  assert.equal(await stock(), beforeStock);
});

test('same key after successful IPN returns original payment', { skip: !enabled }, async () => {
  const orderId = await createOrder();
  const key = randomUUID();
  const first = await createPayment(orderId, key);

  assert.equal(await ipn(first), '00');

  const response = await post(`/orders/${orderId}/payments`, {
    idempotencyKey: key,
  });

  assert.equal(response.status, 201);

  const replay = await response.json() as Attempt;
  assert.equal(replay.paymentId, first.paymentId);
  assert.equal(replay.status, 'SUCCESS');
  assert.equal(replay.paymentUrl, null);

  const [row] = await db.query(
    'SELECT COUNT(*) AS count FROM payments WHERE order_id = $1',
    [orderId],
  );
  assert.equal(Number(row.count), 1);
});