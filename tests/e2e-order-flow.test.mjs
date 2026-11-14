import assert from 'node:assert/strict';
import test from 'node:test';
import pg from '../apps/api/node_modules/pg/lib/index.js';
const { Client } = pg;

const webUrl = process.env.WEB_URL ?? 'http://localhost:3002';
const apiUrl = process.env.API_URL ?? 'http://localhost:3003';
const dbUrl = process.env.DATABASE_URL ?? 'postgresql://postgres:brewlite_local@localhost:5434/brewlite_a2';

test('Automated E2E: Menu -> Cart -> Checkout -> Place Order -> Confirmation -> DB Verification', async () => {
  // 1. Kiểm tra Web Frontend đang phục vụ giao diện Menu
  const webResponse = await fetch(webUrl);
  assert.equal(webResponse.status, 200, 'Web frontend phải trả về HTTP 200');
  const webHtml = await webResponse.text();
  assert.ok(webHtml.includes('BrewLite'), 'Trang web phải chứa tiêu đề BrewLite');

  // 2. Kiểm tra API Healthcheck
  const healthResponse = await fetch(`${apiUrl}/health`);
  assert.equal(healthResponse.status, 200, 'API healthcheck phải trả về 200');
  const healthData = await healthResponse.json();
  assert.deepEqual(healthData, { status: 'ok' });

  // 3. Khách hàng truy cập Menu và xem chi tiết sản phẩm
  const productsResponse = await fetch(`${apiUrl}/products`);
  assert.equal(productsResponse.status, 200);
  const products = await productsResponse.json();
  assert.ok(Array.isArray(products) && products.length > 0, 'Phải có sản phẩm trong thực đơn');

  const targetProduct = products[0];
  const detailResponse = await fetch(`${apiUrl}/products/${targetProduct.id}`);
  assert.equal(detailResponse.status, 200);
  const productDetail = await detailResponse.json();
  assert.equal(productDetail.id, targetProduct.id);

  const sizeOption = productDetail.options.find((opt) => opt.kind === 'SIZE');
  const toppingOption = productDetail.options.find((opt) => opt.kind === 'TOPPING');
  assert.ok(sizeOption, 'Sản phẩm phải có tùy chọn Size');

  // 4. Khách hàng đăng ký tài khoản mới để tiến hành Checkout
  const uniqueEmail = `e2e_customer_${Date.now()}@example.com`;
  const registerResponse = await fetch(`${apiUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Nguyễn Văn Test E2E',
      email: uniqueEmail,
      password: 'StrongPassword123!',
      confirmPassword: 'StrongPassword123!',
    }),
  });
  assert.equal(registerResponse.status, 201, 'Đăng ký tài khoản phải thành công');
  const session = await registerResponse.json();
  assert.ok(session.accessToken, 'Phải nhận được accessToken');
  const token = session.accessToken;
  const customerId = session.account.id;

  // 5. Tiến hành Checkout & Đặt đơn hàng (Place Order)
  const orderQuantity = 2;
  const expectedUnitPrice = targetProduct.price + sizeOption.surcharge + (toppingOption ? toppingOption.surcharge : 0);
  const expectedTotal = expectedUnitPrice * orderQuantity;

  const createOrderResponse = await fetch(`${apiUrl}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      items: [
        {
          productId: targetProduct.id,
          sizeOptionId: sizeOption.id,
          toppingOptionIds: toppingOption ? [toppingOption.id] : [],
          quantity: orderQuantity,
        },
      ],
    }),
  });

  assert.equal(createOrderResponse.status, 201, 'Tạo đơn hàng phải thành công (HTTP 201)');
  const order = await createOrderResponse.json();
  assert.ok(order.orderId, 'Đơn hàng phải có orderId');
  assert.equal(order.status, 'PENDING_PAYMENT', 'Trạng thái đơn hàng mới phải là PENDING_PAYMENT');
  assert.equal(order.totalAmount, expectedTotal, 'Tổng tiền phải khớp với tính toán phía server');

  // 6. Kiểm tra trang xác nhận và xem chi tiết đơn hàng (Confirmation)
  const getOrderResponse = await fetch(`${apiUrl}/orders/${order.orderId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(getOrderResponse.status, 200, 'Khách hàng phải xem được đơn hàng đã tạo');
  const confirmedOrder = await getOrderResponse.json();
  assert.equal(confirmedOrder.orderId, order.orderId);
  assert.equal(confirmedOrder.status, 'PENDING_PAYMENT');
  assert.equal(Number(confirmedOrder.totalAmount), expectedTotal);

  // 7. Khởi tạo thanh toán VNPay Sandbox (không thanh toán thật)
  const idempotencyKey = crypto.randomUUID();
  const paymentResponse = await fetch(`${apiUrl}/orders/${order.orderId}/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ idempotencyKey }),
  });
  assert.equal(paymentResponse.status, 201, 'Khởi tạo thanh toán phải thành công');
  const paymentData = await paymentResponse.json();
  assert.ok(paymentData.paymentUrl, 'Phải có paymentUrl của VNPay Sandbox');
  assert.ok(paymentData.paymentUrl.includes('sandbox.vnpayment.vn'), 'URL thanh toán phải trỏ đến sandbox');

  // 8. Kiểm tra trạng thái thanh toán từ endpoint payment-status
  const paymentStatusResponse = await fetch(`${apiUrl}/orders/${order.orderId}/payment-status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(paymentStatusResponse.status, 200);
  const paymentStatus = await paymentStatusResponse.json();
  assert.equal(paymentStatus.payment.status, 'PENDING');
  assert.equal(paymentStatus.payment.amount, expectedTotal);

  // 9. Xác minh đơn hàng và thanh toán tồn tại trong Database thực tế (PostgreSQL)
  const db = new Client(dbUrl);
  await db.connect();
  try {
    const orderRows = await db.query('SELECT id, user_id, status, total_amount FROM orders WHERE id = $1', [order.orderId]);
    assert.equal(orderRows.rows.length, 1, 'Đơn hàng phải tồn tại trong PostgreSQL');
    assert.equal(orderRows.rows[0].id, order.orderId);
    assert.equal(orderRows.rows[0].status, 'PENDING_PAYMENT');
    assert.equal(Number(orderRows.rows[0].total_amount), expectedTotal);

    const paymentRows = await db.query('SELECT id, order_id, status, amount FROM payments WHERE order_id = $1', [order.orderId]);
    assert.equal(paymentRows.rows.length, 1, 'Giao dịch thanh toán phải tồn tại trong PostgreSQL');
    assert.equal(paymentRows.rows[0].status, 'PENDING');
    assert.equal(Number(paymentRows.rows[0].amount), expectedTotal);
  } finally {
    // 10. Dọn dẹp dữ liệu test E2E để không ảnh hưởng database
    await db.query('DELETE FROM payments WHERE order_id = $1', [order.orderId]);
    await db.query('DELETE FROM order_items WHERE order_id = $1', [order.orderId]);
    await db.query('DELETE FROM orders WHERE id = $1', [order.orderId]);
    await db.query('DELETE FROM users WHERE id = $1', [customerId]);
    await db.end();
  }
});
