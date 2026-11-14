import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { ConflictException } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { reservePaymentStock, releasePaymentStock } from './payment-inventory';

function createMockManager(options: {
  products?: Array<{ id: number; stock: number; quantity: number }>;
  releasedReturned?: boolean;
}) {
  const executedQueries: Array<{ sql: string; params: unknown[] }> = [];

  const manager = {
    query: async (sql: string, params: unknown[] = []) => {
      executedQueries.push({ sql, params });

      if (sql.includes('SELECT p.id, p.stock')) {
        return options.products ?? [{ id: 1, stock: 10, quantity: 2 }];
      }
      if (sql.includes('WITH released AS')) {
        return options.releasedReturned !== false ? [{ id: params[0] }] : [];
      }
      return [];
    },
  } as unknown as EntityManager;

  return { manager, executedQueries };
}

test('UNIT: reservePaymentStock trừ tồn kho chính xác khi số lượng khả dụng', async () => {
  const { manager, executedQueries } = createMockManager({
    products: [{ id: 10, stock: 15, quantity: 3 }],
  });

  await reservePaymentStock(manager, 100);

  // Kiểm tra câu lệnh trừ tồn kho: stock = stock - 3
  const updateProduct = executedQueries.find((q) => q.sql.includes('UPDATE products SET stock = stock - $2'));
  assert.ok(updateProduct, 'Phải thực thi lệnh UPDATE products');
  assert.deepEqual(updateProduct.params, [10, 3]);

  // Kiểm tra câu lệnh reset inventory_released_at
  const resetOrder = executedQueries.find((q) => q.sql.includes('UPDATE orders SET inventory_released_at = NULL'));
  assert.ok(resetOrder, 'Phải thực thi lệnh reset inventory_released_at');
  assert.deepEqual(resetOrder.params, [100]);
});

test('UNIT: reservePaymentStock từ chối và không trừ kho khi tồn kho không đủ', async () => {
  const { manager, executedQueries } = createMockManager({
    products: [{ id: 10, stock: 1, quantity: 5 }], // Cần 5 nhưng chỉ có 1
  });

  await assert.rejects(
    async () => {
      await reservePaymentStock(manager, 100);
    },
    (err: unknown) => {
      assert.ok(err instanceof ConflictException);
      assert.equal((err as ConflictException).getStatus(), 409);
      return true;
    },
  );

  // Đảm bảo không có lệnh UPDATE products nào được thực thi
  const updateProduct = executedQueries.find((q) => q.sql.includes('UPDATE products SET stock = stock - $2'));
  assert.equal(updateProduct, undefined, 'Không được trừ kho khi không đủ tồn');
});

test('UNIT: releasePaymentStock hoàn tồn kho khi đơn chưa từng được hoàn', async () => {
  const { manager, executedQueries } = createMockManager({
    products: [{ id: 10, stock: 12, quantity: 3 }],
    releasedReturned: true,
  });

  await releasePaymentStock(manager, 100);

  // Kiểm tra cờ atomic update trên order
  const checkReleased = executedQueries.find((q) => q.sql.includes('WITH released AS'));
  assert.ok(checkReleased, 'Phải kiểm tra và cập nhật atomic cờ inventory_released_at');
  assert.deepEqual(checkReleased.params, [100]);

  // Kiểm tra câu lệnh hoàn tồn kho: stock = stock + 3
  const updateProduct = executedQueries.find((q) => q.sql.includes('UPDATE products SET stock = stock + $2'));
  assert.ok(updateProduct, 'Phải thực thi lệnh hoàn trả tồn kho');
  assert.deepEqual(updateProduct.params, [10, 3]);
});

test('UNIT: releasePaymentStock không hoàn kho lần 2 (idempotent)', async () => {
  const { manager, executedQueries } = createMockManager({
    products: [{ id: 10, stock: 12, quantity: 3 }],
    releasedReturned: false, // Giả lập cờ đã được set từ trước (không trả về id)
  });

  await releasePaymentStock(manager, 100);

  // Đảm bảo không có lệnh UPDATE products nào được gọi vì cờ đã set
  const updateProduct = executedQueries.find((q) => q.sql.includes('UPDATE products SET stock = stock + $2'));
  assert.equal(updateProduct, undefined, 'Không được hoàn tồn kho lần 2 nếu cờ đã set');
});
