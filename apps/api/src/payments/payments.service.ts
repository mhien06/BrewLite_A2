import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { DATA_SOURCE } from '../database/database.module';
import { PAYMENT_GATEWAY, PaymentGateway } from './payment-gateway';
import { isUnresolved, PaymentOrder, PaymentRow } from './payment.types';
import { reservePaymentStock } from './payment-inventory';

@Injectable()
export class PaymentsService {
  constructor(
    @Inject(DATA_SOURCE) private readonly db: DataSource,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
  ) {}

  async create(userId: number, orderId: number, idempotencyKey: string = randomUUID(), ipAddress = '127.0.0.1') {
    return this.db.transaction(async manager => {
      const [order] = await manager.query('SELECT * FROM orders WHERE id = $1 AND user_id = $2 FOR UPDATE', [orderId, userId]) as PaymentOrder[];
      if (!order) throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Order not found.' });
      if (order.status !== 'PENDING_PAYMENT') {
        throw new ConflictException({ code: 'ORDER_NOT_PAYABLE', message: 'Order is not awaiting payment.' });
      }
      const [review] = await manager.query('SELECT id FROM payments WHERE order_id = $1 AND review_required = true LIMIT 1', [orderId]);
      if (review) throw new ConflictException({ code: 'PAYMENT_REVIEW_REQUIRED', message: 'Payment needs manual review.' });

      const [previous] = await manager.query('SELECT * FROM payments WHERE order_id = $1 AND idempotency_key = $2', [orderId, idempotencyKey]) as PaymentRow[];
      if (previous) return this.response(previous);
      const [active] = await manager.query("SELECT * FROM payments WHERE order_id = $1 AND status IN ('PENDING','UNKNOWN','SUCCESS')", [orderId]) as PaymentRow[];
      // Hai request đồng thời nhận cùng attempt, dù frontend gửi hai khóa khác nhau.
      if (active) return this.response(active);

      if (order.inventory_released_at) await reservePaymentStock(manager, orderId);
      const createdAt = new Date();
      // Mỗi lượt thanh toán có 15 phút theo FR-11 và ADR-006.
      const expiresAt = new Date(createdAt.getTime() + 15 * 60 * 1000);
      const transactionRef = randomUUID().replace(/-/g, '');
      const paymentUrl = this.gateway.createPaymentUrl({
        orderId, transactionRef, amount: order.total_amount, createdAt, expiresAt, ipAddress,
      });
      const [payment] = await manager.query(`INSERT INTO payments
        (order_id, transaction_ref, idempotency_key, amount, payment_url, created_at, expires_at, next_query_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$7) RETURNING *`,
      [orderId, transactionRef, idempotencyKey, order.total_amount, paymentUrl, createdAt, expiresAt]) as PaymentRow[];
      return this.response(payment);
    });
  }

  async status(userId: number, orderId: number) {
    // Một SELECT lấy cùng snapshot. Endpoint này không gọi VNPay, không cập nhật dữ liệu.
    const [row] = await this.db.query(`SELECT o.status AS "orderStatus", p.*,
      EXISTS(SELECT 1 FROM payments r WHERE r.order_id = o.id AND r.review_required) AS "needsReview"
      FROM orders o LEFT JOIN LATERAL (
        SELECT * FROM payments WHERE order_id = o.id ORDER BY id DESC LIMIT 1
      ) p ON true WHERE o.id = $1 AND o.user_id = $2`, [orderId, userId]) as
      Array<PaymentRow & { orderStatus: string; needsReview: boolean }>;
    if (!row) throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Order not found.' });
    const canPay = row.orderStatus === 'PENDING_PAYMENT' && !row.needsReview;
    return {
      orderId, orderStatus: row.orderStatus, payment: row.id ? this.response(row) : null,
      canPay: canPay && !row.id,
      canRetry: canPay && ['FAILED', 'EXPIRED'].includes(row.status),
      needsReview: row.needsReview,
    };
  }

  private response(payment: PaymentRow) {
    const expired = payment.expires_at.getTime() <= Date.now();
    return {
      paymentId: payment.id, orderId: payment.order_id, transactionRef: payment.transaction_ref,
      idempotencyKey: payment.idempotency_key, amount: payment.amount, status: payment.status,
      createdAt: payment.created_at, expiresAt: payment.expires_at,
      awaitingVerification: isUnresolved(payment.status) && (expired || payment.status === 'UNKNOWN'),
      // Hết thời gian chỉ ẩn URL; không tự kết luận EXPIRED khi chưa có bằng chứng.
      paymentUrl: payment.status === 'PENDING' && !expired && !payment.review_required ? payment.payment_url : null,
      needsReview: payment.review_required,
    };
  }
}
