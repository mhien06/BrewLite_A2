import assert from 'node:assert/strict';
import test from 'node:test';

const baseUrl = process.env.API_TEST_URL ?? 'http://localhost:3001';

test('menu có món mẫu, chi tiết có tùy chọn', async () => {
  const list = await fetch(baseUrl + '/products');
  assert.equal(list.status, 200);
  const products = await list.json();
  assert.ok(Array.isArray(products) && products.length > 0);
  const product = products[0];
  assert.ok(Number.isInteger(product.id));
  assert.ok(product.name);
  assert.ok(Number.isInteger(product.price) && product.price >= 0);
  assert.ok(Number.isInteger(product.stock) && product.stock >= 0);

  const detail = await fetch(baseUrl + '/products/' + product.id);
  assert.equal(detail.status, 200);
  const item = await detail.json();
  assert.equal(item.id, product.id);
  assert.equal(item.name, product.name);
  assert.ok(item.options.some(option => option.kind === 'SIZE'));
  assert.ok(item.options.some(option => option.kind === 'TOPPING'));
});

test('API trả 404 cho mã không có và 400 cho mã sai định dạng', async () => {
  assert.equal((await fetch(baseUrl + '/products/0')).status, 404);
  assert.equal((await fetch(baseUrl + '/products/abc')).status, 400);
});
