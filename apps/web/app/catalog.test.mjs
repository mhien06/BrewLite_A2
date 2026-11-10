import assert from 'node:assert/strict';
import test from 'node:test';
import { formatVndPrice, splitOptions, stockLabel } from './catalog.mjs';

test('formats product prices using Vietnamese currency grouping', () => {
  assert.equal(formatVndPrice(29000), '29.000đ');
  assert.equal(formatVndPrice(0), '0đ');
});

test('shows the correct stock label for available and sold-out products', () => {
  assert.equal(stockLabel(1), 'CÒN HÀNG');
  assert.equal(stockLabel(0), 'TẠM HẾT');
});

test('splits product options by size and topping', () => {
  const sizes = [{ id: 1, kind: 'SIZE', name: 'M' }];
  const toppings = [{ id: 2, kind: 'TOPPING', name: 'Trân châu' }];

  assert.deepEqual(splitOptions([...sizes, ...toppings]), { sizes, toppings });
});
