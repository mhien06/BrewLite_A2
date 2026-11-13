import { Inject, Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { DATA_SOURCE } from '../database/database.module';
import { PaymentEvidence } from './payment-gateway';
import { isUnresolved, PaymentOrder, PaymentRow } from './payment.types';
import { releasePaymentStock } from './payment-inventory';

export type SettlementResult = 'ACCEPTED' | 'DUPLICATE' | 'NOT_FOUND' | 'INVALID_AMOUNT';

@Injectable()
export class PaymentSettlementService {
  constructor(@Inject(DATA_SOURCE) private readonly db: DataSource) {}

  async settle(evidence: PaymentEvidence, source: 'IPN' | 'QUERY'): Promise<SettlementResult> {
    return this.db.transaction(async manager => {
      const [lookup] = await manager.query('SELECT order_id FROM payments WHERE transaction_ref = $1', [evidence.transactionRef]);
      if (!lookup) return 'NOT_FOUND';
      // Mọi luồng đều khóa Order trước Payment: tạo lại, IPN và đối soát dùng cùng thứ tự.
      const [order] = await manager.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [lookup.order_id]) as PaymentOrder[];
      const [payment] = await manager.query('SELECT * FROM payments WHERE transaction_ref = $1 FOR UPDATE', [evidence.transactionRef]) as PaymentRow[];
      if (!payment || !order) return 'NOT_FOUND';
      if (payment.amount !== evidence.amount || order.total_amount !== evidence.amount) return 'INVALID_AMOUNT';

      if (!isUnresolved(payment.status)) {
        // Không đổi trạng thái cuối. Nhưng không được bỏ mất bằng chứng thu tiền đến muộn.
        if (evidence.status === 'SUCCESS' && payment.status !== 'SUCCESS') {
          await this.flagReview(manager, payment.id, 'SUCCESS_AFTER_TERMINAL_FAILURE', evidence);
        }
        return 'DUPLICATE';
      }

      if (evidence.status === 'SUCCESS') {
        const [review] = await manager.query('SELECT id FROM payments WHERE order_id = $1 AND review_required LIMIT 1', [order.id]);
        if (order.status === 'PENDING_PAYMENT' && !order.inventory_released_at && !review) {
          await manager.query("UPDATE orders SET status = 'PAID' WHERE id = $1", [order.id]);
        } else {
          // Ngoài phạm vi hoàn tiền: chỉ ghi nhận giao dịch bất thường để đối soát thủ công.
          await this.flagReview(manager, payment.id, 'SUCCESS_FOR_UNPAYABLE_ORDER', evidence);
        }
      } else if ((evidence.status === 'FAILED' || evidence.status === 'EXPIRED') && order.status === 'PENDING_PAYMENT') {
        await releasePaymentStock(manager, order.id);
      }

      await manager.query(`UPDATE payments SET status = $2,
        settled_at = CASE WHEN $2 = 'UNKNOWN' THEN NULL ELSE now() END,
        response_code = $3, transaction_status = $4, transaction_no = $5,
        bank_code = $6, pay_date = $7, settlement_source = $8 WHERE id = $1`,
      [payment.id, evidence.status, evidence.responseCode, evidence.transactionStatus,
        evidence.transactionNo, evidence.bankCode, evidence.payDate, source]);
      return 'ACCEPTED';
    });
  }

  async markUnknown(paymentId: number) {
    // Chỉ thay đổi khi chưa kết thúc; không ghi đè SUCCESS nếu IPN vừa đến.
    await this.db.query("UPDATE payments SET status = 'UNKNOWN' WHERE id = $1 AND status IN ('PENDING','UNKNOWN')", [paymentId]);
  }

  private async flagReview(manager: EntityManager, paymentId: number, reason: string, evidence: PaymentEvidence) {
    await manager.query('UPDATE payments SET review_required = true WHERE id = $1', [paymentId]);
    await manager.query(`INSERT INTO payment_reviews(payment_id, reason, evidence) VALUES ($1, $2, $3::jsonb)
      ON CONFLICT (payment_id) DO NOTHING`, [paymentId, reason, JSON.stringify(evidence)]);
  }
}
