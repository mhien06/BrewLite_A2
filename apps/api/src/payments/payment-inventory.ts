import { EntityManager } from 'typeorm';
import { assertSufficientStock } from '../orders/order-calculations';

// Chỉ dùng khi đã khóa dòng Order. Tái sử dụng phép kiểm tra tồn của Orders.
// Các sản phẩm luôn được khóa theo id tăng dần để tránh deadlock với tạo đơn.
async function lockProducts(manager: EntityManager, orderId: number) {
  return manager.query(`SELECT p.id, p.stock, items.quantity::integer AS quantity
    FROM products p JOIN (
      SELECT product_id, sum(quantity) AS quantity FROM order_items
      WHERE order_id = $1 GROUP BY product_id
    ) items ON items.product_id = p.id ORDER BY p.id FOR UPDATE OF p`, [orderId]) as
    Promise<Array<{ id: number; stock: number; quantity: number }>>;
}

export async function reservePaymentStock(manager: EntityManager, orderId: number) {
  const products = await lockProducts(manager, orderId);
  for (const product of products) assertSufficientStock(product.id, product.quantity, product.stock);
  for (const product of products) {
    await manager.query('UPDATE products SET stock = stock - $2 WHERE id = $1', [product.id, product.quantity]);
  }
  await manager.query('UPDATE orders SET inventory_released_at = NULL WHERE id = $1', [orderId]);
}

export async function releasePaymentStock(manager: EntityManager, orderId: number) {
  // Cờ trên Order ngăn hoàn tồn hai lần, kể cả khi IPN và job cùng chạy.
  const changed = await manager.query(`WITH released AS (
    UPDATE orders SET inventory_released_at = now()
    WHERE id = $1 AND inventory_released_at IS NULL RETURNING id
  ) SELECT id FROM released`, [orderId]);
  if (!changed[0]) return;
  const products = await lockProducts(manager, orderId);
  for (const product of products) {
    await manager.query('UPDATE products SET stock = stock + $2 WHERE id = $1', [product.id, product.quantity]);
  }
}
