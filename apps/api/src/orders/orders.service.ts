import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DATA_SOURCE } from '../database/database.module';
import { CreateOrderDto } from './orders.dto';
import { aggregateOrderQuantities, assertSufficientStock, calculateLineAmounts, calculateOrderSubtotal } from './order-calculations';

type ProductRow = { id: number; name: string; price: number; stock: number };
type OptionRow = { id: number; kind: 'SIZE' | 'TOPPING'; name: string; surcharge: number };
type OrderSnapshot = {
  productId: number;
  productName: string;
  quantity: number;
  size: { id: number; name: string };
  toppings: Array<{ id: number; name: string }>;
  unitPrice: number;
  lineTotal: number;
};

@Injectable()
export class OrdersService {
  constructor(@Inject(DATA_SOURCE) private readonly db: DataSource) {}

  create(userId: number, body: CreateOrderDto) {
    return this.db.transaction(async (manager) => {
      const productIds = [...new Set(body.items.map((item) => item.productId))].sort((a, b) => a - b);
      const products = await manager.query(
        'SELECT id, name, price, stock FROM products WHERE id = ANY($1::int[]) ORDER BY id FOR UPDATE', [productIds],
      ) as ProductRow[];
      const byProduct = new Map(products.map((product) => [product.id, product]));
      if (products.length !== productIds.length) throw new NotFoundException({ code: 'PRODUCT_NOT_FOUND', message: 'One or more products do not exist.' });

      const required = aggregateOrderQuantities(body.items);
      for (const [productId, quantity] of required) {
        const product = byProduct.get(productId)!;
        assertSufficientStock(productId, quantity, product.stock);
      }

      const snapshots: OrderSnapshot[] = [];
      for (const item of body.items) {
        const product = byProduct.get(item.productId)!;
        const toppingOptionIds = item.toppingOptionIds ?? [];
        const optionIds = [item.sizeOptionId, ...toppingOptionIds];
        const options = await manager.query(
          `SELECT id, kind, name, surcharge FROM product_options
           WHERE product_id = $1 AND id = ANY($2::int[]) ORDER BY id`, [item.productId, optionIds],
        ) as OptionRow[];
        const size = options.find((option) => option.id === item.sizeOptionId && option.kind === 'SIZE');
        const toppings = toppingOptionIds.map((id) => options.find((option) => option.id === id && option.kind === 'TOPPING'));
        if (!size || toppings.some((option) => !option)) {
          throw new BadRequestException({
            code: 'INVALID_PRODUCT_OPTION', message: 'A selected size or topping does not belong to the product.',
          });
        }
        const selectedToppings = toppings as OptionRow[];
        const { unitPrice, lineTotal } = calculateLineAmounts(
          Number(product.price),
          Number(size.surcharge),
          selectedToppings.map((option) => Number(option.surcharge)),
          item.quantity,
        );
        snapshots.push({
          productId: product.id, productName: product.name, quantity: item.quantity,
          size: { id: size.id, name: size.name },
          toppings: selectedToppings.map(({ id, name }) => ({ id, name })),
          unitPrice, lineTotal,
        });
      }

      const subtotal = calculateOrderSubtotal(snapshots);
      const [order] = await manager.query(
        `INSERT INTO orders(user_id, subtotal, total_amount) VALUES ($1, $2, $2)
         RETURNING id, status, subtotal, discount_amount AS "discountAmount", total_amount AS "totalAmount", created_at AS "createdAt"`,
        [userId, subtotal],
      ) as Array<{ id: number; status: string; subtotal: number; discountAmount: number; totalAmount: number; createdAt: Date }>;

      for (const snapshot of snapshots) {
        await manager.query(
          `INSERT INTO order_items(order_id, product_id, product_name, size_snapshot, toppings_snapshot, quantity, unit_price, line_total)
           VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7, $8)`,
          [order.id, snapshot.productId, snapshot.productName, JSON.stringify(snapshot.size), JSON.stringify(snapshot.toppings), snapshot.quantity, snapshot.unitPrice, snapshot.lineTotal],
        );
      }
      for (const [productId, quantity] of required) {
        await manager.query('UPDATE products SET stock = stock - $2 WHERE id = $1', [productId, quantity]);
      }
      return { orderId: order.id, status: order.status, subtotal: Number(order.subtotal), discountAmount: Number(order.discountAmount), totalAmount: Number(order.totalAmount), createdAt: order.createdAt, items: snapshots };
    });
  }

  async list(userId: number) {
    return this.db.query(
      `SELECT o.id AS "orderId", o.status, o.subtotal, o.discount_amount AS "discountAmount",
              o.total_amount AS "totalAmount", o.created_at AS "createdAt",
              COALESCE(jsonb_agg(jsonb_build_object('productId', i.product_id, 'productName', i.product_name,
                'quantity', i.quantity, 'size', i.size_snapshot, 'toppings', i.toppings_snapshot,
                'unitPrice', i.unit_price, 'lineTotal', i.line_total)) FILTER (WHERE i.id IS NOT NULL), '[]'::jsonb) AS items
       FROM orders o LEFT JOIN order_items i ON i.order_id = o.id
       WHERE o.user_id = $1 GROUP BY o.id ORDER BY o.created_at DESC`, [userId],
    );
  }

  async get(userId: number, orderId: number) {
    const [order] = await this.db.query(
      `SELECT o.id AS "orderId", o.status, o.subtotal, o.discount_amount AS "discountAmount",
              o.total_amount AS "totalAmount", o.created_at AS "createdAt",
              COALESCE(jsonb_agg(jsonb_build_object('productId', i.product_id, 'productName', i.product_name,
                'quantity', i.quantity, 'size', i.size_snapshot, 'toppings', i.toppings_snapshot,
                'unitPrice', i.unit_price, 'lineTotal', i.line_total)) FILTER (WHERE i.id IS NOT NULL), '[]'::jsonb) AS items
       FROM orders o LEFT JOIN order_items i ON i.order_id = o.id
       WHERE o.user_id = $1 AND o.id = $2 GROUP BY o.id`, [userId, orderId],
    );
    if (!order) throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Order not found.' });
    return order;
  }
}
