import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { createHmac } from 'node:crypto';
import { VnpayGateway, vnpayDate } from './vnpay.gateway';

// Chỉ là dữ liệu giả dùng trong test, không phải thông tin tài khoản Sandbox.
const secret = 'unit-test-only-vnpay-secret';
process.env.VNPAY_TMN_CODE = 'TESTCODE';
process.env.VNPAY_HASH_SECRET = secret;
process.env.VNPAY_PAYMENT_URL = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
process.env.VNPAY_QUERY_URL = 'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction';
process.env.VNPAY_RETURN_URL = 'http://localhost:3002/payment/return';
const gateway = new VnpayGateway();
const request = {
  orderId: 12, transactionRef: 'abc123', amount: 29000, ipAddress: '127.0.0.1',
  createdAt: new Date('2026-11-13T10:00:00Z'), expiresAt: new Date('2026-11-13T10:15:00Z'),
};
const hmac = (data: string) => createHmac('sha512', secret).update(data).digest('hex');

function notification(overrides: Record<string, string> = {}) {
  const data: Record<string, string> = {
    vnp_TmnCode: 'TESTCODE', vnp_TxnRef: 'abc123', vnp_Amount: '2900000',
    vnp_ResponseCode: '00', vnp_TransactionStatus: '00', vnp_TransactionNo: '123456',
    vnp_PayDate: '20261113170200', vnp_BankCode: 'NCB', ...overrides,
  };
  const entries = Object.entries(data).sort(([a], [b]) => a.localeCompare(b));
  const query = entries.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value).replace(/%20/g, '+')}`).join('&');
  return { ...data, vnp_SecureHash: hmac(query) };
}

test('URL signs encoded parameters, uses DB amount x100 and exactly fifteen minutes in GMT+7', () => {
  const url = new URL(gateway.createPaymentUrl(request));
  const signature = url.searchParams.get('vnp_SecureHash');
  const rawSignedData = url.search.slice(1).split('&vnp_SecureHash=')[0];
  assert.equal(signature, hmac(rawSignedData));
  assert.ok(rawSignedData.includes('Thanh+toan+don+hang+12'));
  assert.equal(url.searchParams.get('vnp_Amount'), '2900000');
  assert.equal(url.searchParams.get('vnp_CreateDate'), '20261113170000');
  assert.equal(url.searchParams.get('vnp_ExpireDate'), '20261113171500');
  assert.equal(new URL(url.searchParams.get('vnp_ReturnUrl')!).searchParams.get('orderId'), '12');
  assert.equal(vnpayDate(new Date('2026-12-31T20:00:00Z')), '20270101030000');
});

test('IPN rejects tampering, repeated parameters, wrong merchant and malformed signature', () => {
  const signed = notification();
  assert.equal(gateway.verifyNotification(signed)?.status, 'SUCCESS');
  assert.equal(gateway.verifyNotification({ ...signed, vnp_Amount: '100' }), null);
  assert.equal(gateway.verifyNotification({ ...signed, vnp_TxnRef: ['abc123', 'another'] }), null);
  assert.equal(gateway.verifyNotification({ ...signed, vnp_SecureHash: 'zz' }), null);
  assert.equal(gateway.verifyNotification(notification({ vnp_TmnCode: 'OTHERONE' })), null);
  assert.equal(gateway.verifyNotification(notification({ vnp_Amount: '2900001' })), null);
  assert.equal(gateway.verifyNotification(notification({ vnp_TransactionNo: '0' })), null);
});

test('IPN distinguishes failure and expiry, preserves uncertain/reversal/fraud states', () => {
  assert.equal(gateway.verifyNotification(notification({ vnp_ResponseCode: '24', vnp_TransactionStatus: '02' }))?.status, 'FAILED');
  assert.equal(gateway.verifyNotification(notification({ vnp_ResponseCode: '11', vnp_TransactionStatus: '02' }))?.status, 'EXPIRED');
  for (const transactionStatus of ['01', '04', '05', '06', '07', '09', '99']) {
    assert.equal(gateway.verifyNotification(notification({ vnp_TransactionStatus: transactionStatus }))?.status, 'UNKNOWN');
  }
});

test('QueryDR verifies pipe signature and correlation; errors cannot become terminal failures', async () => {
  const originalFetch = globalThis.fetch;
  const response: Record<string, string> = {
    vnp_ResponseId: 'response123', vnp_Command: 'querydr', vnp_ResponseCode: '00', vnp_Message: 'Success',
    vnp_TmnCode: 'TESTCODE', vnp_TxnRef: 'abc123', vnp_Amount: '2900000', vnp_BankCode: 'NCB',
    vnp_PayDate: '20261113170200', vnp_TransactionNo: '123456', vnp_TransactionType: '01',
    vnp_TransactionStatus: '00', vnp_OrderInfo: 'Thanh toan don hang 12', vnp_PromotionCode: '', vnp_PromotionAmount: '',
  };
  const requestIds = new Set<string>();
  let corruptHash = false;
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(options!.body as string) as Record<string, string>;
    const signatureData = [body.vnp_RequestId, '2.1.0', 'querydr', 'TESTCODE', 'abc123', '20261113170000', body.vnp_CreateDate, '127.0.0.1', 'Truy van don hang 12'].join('|');
    assert.equal(body.vnp_SecureHash, hmac(signatureData));
    assert.ok(!requestIds.has(body.vnp_RequestId));
    requestIds.add(body.vnp_RequestId);
    return Response.json({ ...response, vnp_SecureHash: corruptHash ? '0'.repeat(128) : hmac(Object.values(response).join('|')) });
  };
  try {
    assert.equal((await gateway.queryTransaction(request))?.status, 'SUCCESS');
    corruptHash = true;
    assert.equal(await gateway.queryTransaction(request), null);
    corruptHash = false;
    for (const [key, value] of [['vnp_TmnCode', 'OTHERONE'], ['vnp_TxnRef', 'other'], ['vnp_Amount', '100'], ['vnp_TransactionType', '02'], ['vnp_ResponseCode', '91']]) {
      const previous = response[key]; response[key] = value;
      assert.equal(await gateway.queryTransaction(request), null, key);
      response[key] = previous;
    }
    response.vnp_TransactionStatus = '02';
    assert.equal((await gateway.queryTransaction(request))?.status, 'FAILED');
    response.vnp_TransactionStatus = '01';
    assert.equal((await gateway.queryTransaction(request))?.status, 'UNKNOWN');
    // Sandbox có thể trả HTTP 200 nhưng lỗi 99 không có chữ ký.
    // Không được coi lỗi truy vấn này là giao dịch thất bại rồi hoàn tồn.
    globalThis.fetch = async () => Response.json({ vnp_ResponseCode: '99', vnp_Message: 'Unexpected error' });
    assert.equal(await gateway.queryTransaction(request), null);
    globalThis.fetch = async () => Response.json({ ...response, vnp_TransactionStatus: '00' });
    assert.equal(await gateway.queryTransaction(request), null);
    globalThis.fetch = async () => { throw new Error('timeout'); };
    assert.equal(await gateway.queryTransaction(request), null);
  } finally { globalThis.fetch = originalFetch; }
});
