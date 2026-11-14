import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import type { DataSource, EntityManager } from 'typeorm';
import { PaymentSettlementService } from './payment-settlement.service';
import type { PaymentEvidence } from './payment-gateway';

function createMockSettlementContext(options: {
  lookupOrderId?: number;
  order?: { id: number; user_id: number; status: string; total_amount: number; inventory_released_at: Date | null };
  payment?: {
    id: number;
    order_id: number;
    transaction_ref: string;
    amount: number;
    status: string;
    review_required: boolean;
  };
}) {
  const executedQueries: Array<{ sql: string; params: unknown[] }> = [];

  const manager = {
    query: async (sql: string, params: unknown[] = []) => {
      executedQueries.push({ sql, params });

      if (sql.includes('SELECT order_id FROM payments')) {
        return options.lookupOrderId ? [{ order_id: options.lookupOrderId }] : [];
      }
      if (sql.includes('SELECT * FROM orders WHERE id = $1 FOR UPDATE')) {
        return options.order ? [options.order] : [];
      }
      if (sql.includes('SELECT * FROM payments WHERE transaction_ref = $1 FOR UPDATE')) {
        return options.payment ? [options.payment] : [];
      }
      if (sql.includes('SELECT id FROM payments WHERE order_id = $1 AND review_required')) {
        return [];
      }
      if (sql.includes('WITH released AS')) {
        return [{ id: options.order?.id ?? 1 }];
      }
      if (sql.includes('SELECT p.id, p.stock')) {
        return [{ id: 1, stock: 10, quantity: 2 }];
      }
      return [];
    },
  } as unknown as EntityManager;

  const mockDataSource = {
    transaction: async <T>(runInTransaction: (m: EntityManager) => Promise<T>): Promise<T> => {
      return runInTransaction(manager);
    },
  } as unknown as DataSource;

  const service = new PaymentSettlementService(mockDataSource);
  return { service, executedQueries };
}

const baseEvidence: PaymentEvidence = {
  transactionRef: 'TX123456',
  amount: 50000,
  status: 'SUCCESS',
  responseCode: '00',
  transactionStatus: '00',
  transactionNo: '999888',
  bankCode: 'NCB',
  payDate: '20261114120000',
};

test('UNIT: chuyển trạng thái PENDING -> SUCCESS cập nhật đơn hàng thành PAID', async () => {
  const { service, executedQueries } = createMockSettlementContext({
    lookupOrderId: 10,
    order: { id: 10, user_id: 1, status: 'PENDING_PAYMENT', total_amount: 50000, inventory_released_at: null },
    payment: { id: 20, order_id: 10, transaction_ref: 'TX123456', amount: 50000, status: 'PENDING', review_required: false },
  });

  const result = await service.settle(baseEvidence, 'IPN');

  assert.equal(result, 'ACCEPTED');

  // Đơn hàng phải chuyển sang PAID
  const orderUpdate = executedQueries.find((q) => q.sql.includes("UPDATE orders SET status = 'PAID'"));
  assert.ok(orderUpdate, 'Phải cập nhật trạng thái đơn hàng sang PAID');
  assert.deepEqual(orderUpdate.params, [10]);

  // Payment phải cập nhật status sang SUCCESS
  const paymentUpdate = executedQueries.find((q) => q.sql.includes('UPDATE payments SET status = $2'));
  assert.ok(paymentUpdate, 'Phải cập nhật trạng thái thanh toán sang SUCCESS');
  assert.equal(paymentUpdate.params[1], 'SUCCESS');
});

test('UNIT: chuyển trạng thái PENDING -> FAILED kích hoạt hoàn trả tồn kho', async () => {
  const { service, executedQueries } = createMockSettlementContext({
    lookupOrderId: 10,
    order: { id: 10, user_id: 1, status: 'PENDING_PAYMENT', total_amount: 50000, inventory_released_at: null },
    payment: { id: 20, order_id: 10, transaction_ref: 'TX123456', amount: 50000, status: 'PENDING', review_required: false },
  });

  const failedEvidence: PaymentEvidence = {
    ...baseEvidence,
    status: 'FAILED',
    responseCode: '24',
    transactionStatus: '02',
  };

  const result = await service.settle(failedEvidence, 'IPN');

  assert.equal(result, 'ACCEPTED');

  // Kiểm tra cờ release và hoàn tồn kho
  const releaseFlag = executedQueries.find((q) => q.sql.includes('WITH released AS'));
  assert.ok(releaseFlag, 'Phải kích hoạt giải phóng tồn kho cho đơn thất bại');

  // Payment phải cập nhật status sang FAILED
  const paymentUpdate = executedQueries.find((q) => q.sql.includes('UPDATE payments SET status = $2'));
  assert.ok(paymentUpdate);
  assert.equal(paymentUpdate.params[1], 'FAILED');
});

test('UNIT: chuyển trạng thái PENDING -> EXPIRED kích hoạt hoàn trả tồn kho', async () => {
  const { service, executedQueries } = createMockSettlementContext({
    lookupOrderId: 10,
    order: { id: 10, user_id: 1, status: 'PENDING_PAYMENT', total_amount: 50000, inventory_released_at: null },
    payment: { id: 20, order_id: 10, transaction_ref: 'TX123456', amount: 50000, status: 'PENDING', review_required: false },
  });

  const expiredEvidence: PaymentEvidence = {
    ...baseEvidence,
    status: 'EXPIRED',
    responseCode: '11',
    transactionStatus: '02',
  };

  const result = await service.settle(expiredEvidence, 'QUERY');

  assert.equal(result, 'ACCEPTED');

  const releaseFlag = executedQueries.find((q) => q.sql.includes('WITH released AS'));
  assert.ok(releaseFlag, 'Phải kích hoạt giải phóng tồn kho cho đơn hết hạn');

  const paymentUpdate = executedQueries.find((q) => q.sql.includes('UPDATE payments SET status = $2'));
  assert.ok(paymentUpdate);
  assert.equal(paymentUpdate.params[1], 'EXPIRED');
});

test('UNIT: xử lý IPN trùng lặp khi thanh toán đã hoàn tất trả về DUPLICATE', async () => {
  const { service, executedQueries } = createMockSettlementContext({
    lookupOrderId: 10,
    order: { id: 10, user_id: 1, status: 'PAID', total_amount: 50000, inventory_released_at: null },
    payment: { id: 20, order_id: 10, transaction_ref: 'TX123456', amount: 50000, status: 'SUCCESS', review_required: false },
  });

  const result = await service.settle(baseEvidence, 'IPN');

  assert.equal(result, 'DUPLICATE');

  // Không được ghi đè trạng thái thanh toán
  const paymentUpdate = executedQueries.find((q) => q.sql.includes('UPDATE payments SET status = $2'));
  assert.equal(paymentUpdate, undefined, 'Không được cập nhật thanh toán đã ở trạng thái cuối');
});

test('UNIT: từ chối thanh toán khi số tiền không khớp (INVALID_AMOUNT)', async () => {
  const { service } = createMockSettlementContext({
    lookupOrderId: 10,
    order: { id: 10, user_id: 1, status: 'PENDING_PAYMENT', total_amount: 50000, inventory_released_at: null },
    payment: { id: 20, order_id: 10, transaction_ref: 'TX123456', amount: 50000, status: 'PENDING', review_required: false },
  });

  const wrongAmountEvidence: PaymentEvidence = {
    ...baseEvidence,
    amount: 99999, // Sai lệch số tiền
  };

  const result = await service.settle(wrongAmountEvidence, 'IPN');
  assert.equal(result, 'INVALID_AMOUNT');
});
