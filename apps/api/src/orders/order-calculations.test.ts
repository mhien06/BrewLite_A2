import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { aggregateOrderQuantities, assertSufficientStock, calculateLineAmounts, calculateOrderSubtotal } from './order-calculations';

test('calculates server-priced line totals and order subtotal', () => {
  const firstLine = calculateLineAmounts(100, 30, [20], 2);
  const secondLine = calculateLineAmounts(200, 0, [], 1);
  assert.deepEqual(firstLine, { unitPrice: 150, lineTotal: 300 });
  assert.equal(calculateOrderSubtotal([firstLine, secondLine]), 500);
});

test('aggregates quantities for products that occur on multiple order lines', () => {
  assert.deepEqual(
    aggregateOrderQuantities([
      { productId: 7, quantity: 2 },
      { productId: 3, quantity: 1 },
      { productId: 7, quantity: 3 },
    ]),
    new Map([[7, 5], [3, 1]]),
  );
});

test('rejects insufficient stock and quantities or amounts beyond database limits', () => {
  assert.throws(() => assertSufficientStock(7, 3, 2), (error) => {
    assert.ok(error instanceof ConflictException);
    assert.equal(error.getStatus(), 409);
    assert.deepEqual(error.getResponse(), {
      message: 'Not enough stock for this order.',
      code: 'INSUFFICIENT_STOCK',
      productId: 7,
      requested: 3,
      available: 2,
    });
    return true;
  });
  assert.throws(
    () => aggregateOrderQuantities([{ productId: 7, quantity: 2_147_483_647 }, { productId: 7, quantity: 1 }]),
    BadRequestException,
  );
  assert.throws(() => calculateLineAmounts(2_147_483_647, 1, [], 1), BadRequestException);
  assert.throws(() => calculateOrderSubtotal([{ lineTotal: 2_147_483_647 }, { lineTotal: 1 }]), BadRequestException);
});
