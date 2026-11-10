import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const { productDetailResponse } = require('./catalog-domain.cjs');

test('product detail response combines the product and its options', () => {
  const product = { id: 7, name: 'Bạc xỉu', price: 32000 };
  const options = [
    { id: 1, kind: 'SIZE', name: 'M', surcharge: 5000 },
    { id: 2, kind: 'TOPPING', name: 'Trân châu', surcharge: 8000 },
  ];

  assert.deepEqual(productDetailResponse(product, options), { ...product, options });
});

test('product detail response does not mutate its inputs', () => {
  const product = { id: 3, name: 'Trà đào' };
  const options = [{ id: 4, kind: 'SIZE', name: 'L' }];
  const result = productDetailResponse(product, options);

  assert.notEqual(result, product);
  assert.equal('options' in product, false);
  assert.equal(result.options, options);
});
