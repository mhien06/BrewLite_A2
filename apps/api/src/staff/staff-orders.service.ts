import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DATA_SOURCE } from '../database/database.module';
import { StaffOrderStatus } from './staff-orders.dto';

type OrderStatus = 'PENDING_PAYMENT' | 'PAID' | 'PREPARING' | 'READY_FOR_PICKUP' | 'COMPLETED' | 'CANCELLED';
type StaffOrderRow = { id: number; status: OrderStatus; totalAmount: number };

const orderSelect = `
  SELECT o.id AS "orderId", o.status, o.subtotal, o.discount_amount AS "discountAmount",
    o.total_amount AS "totalAmount", o.created_at AS "createdAt",
    u.full_name AS "customerName", p.status AS "paymentStatus",
    COALESCE(p.status = 'SUCCESS' AND p.amount = o.total_amount AND NOT p.review_required, false) AS "paymentVerified",
    COALESCE(jsonb_agg(jsonb_build_object(
      'productId', i.product_id, 'productName', i.product_name, 'quantity', i.quantity,
      'size', i.size_snapshot, 'toppings', i.toppings_snapshot,
      'unitPrice', i.unit_price, 'lineTotal', i.line_total
    ) ORDER BY i.id) FILTER (WHERE i.id IS NOT NULL), '[]'::jsonb) AS items
  FROM orders o
  JOIN users u ON u.id = o.user_id
  LEFT JOIN LATERAL (
    SELECT status, amount, review_required FROM payments
    WHERE order_id = o.id ORDER BY id DESC LIMIT 1
  ) p ON true
  LEFT JOIN order_items i ON i.order_id = o.id`;

@Injectable()
export class StaffOrdersService {
  constructor(@Inject(DATA_SOURCE) private readonly db: DataSource) {}

  async list() {
    return this.db.query(`${orderSelect}
      GROUP BY o.id, u.full_name, p.status, p.amount, p.review_required
      ORDER BY CASE o.status WHEN 'PAID' THEN 0 WHEN 'PREPARING' THEN 1 WHEN 'READY_FOR_PICKUP' THEN 2 ELSE 3 END,
        o.created_at ASC, o.id ASC`);
  }

  async get(orderId: number) {
    const [order] = await this.db.query(`${orderSelect}
      WHERE o.id = $1
      GROUP BY o.id, u.full_name, p.status, p.amount, p.review_required`, [orderId]);
    if (!order) throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Order not found.' });
    return order;
  }

  async updateStatus(orderId: number, next: StaffOrderStatus) {
    return this.db.transaction(async manager => {
      const [order] = await manager.query(
        'SELECT id, status, total_amount AS "totalAmount" FROM orders WHERE id = $1 FOR UPDATE', [orderId],
      ) as StaffOrderRow[];
      if (!order) throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Order not found.' });
      if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
        throw new ConflictException({ code: 'ORDER_TERMINAL', message: 'Completed or cancelled orders cannot be changed.' });
      }

      const nextAllowed: Partial<Record<OrderStatus, StaffOrderStatus>> = {
        PAID: 'PREPARING', PREPARING: 'READY_FOR_PICKUP', READY_FOR_PICKUP: 'COMPLETED',
      };
      if (nextAllowed[order.status] !== next) {
        if (order.status === 'PENDING_PAYMENT') {
          throw new ConflictException({ code: 'ORDER_NOT_PAID', message: 'Only a verified paid order can enter preparation.' });
        }
        throw new ConflictException({ code: 'INVALID_ORDER_TRANSITION', message: 'Order status can only move to the next processing step.' });
      }

      if (order.status === 'PAID') {
        const [payment] = await manager.query(`SELECT id FROM payments
          WHERE order_id = $1 AND status = 'SUCCESS' AND amount = $2 AND review_required = false
          ORDER BY id DESC LIMIT 1`, [orderId, order.totalAmount]);
        if (!payment) throw new ConflictException({ code: 'PAYMENT_NOT_VERIFIED', message: 'Payment has not been verified by the server.' });
      }

      const [updated] = await manager.query(`UPDATE orders SET status = $2
        WHERE id = $1 AND status = $3
        RETURNING id AS "orderId", status`, [orderId, next, order.status]);
      if (!updated) throw new ConflictException({ code: 'ORDER_STATUS_CONFLICT', message: 'The order changed while it was being updated. Refresh and try again.' });
      return updated;
    });
  }
}
