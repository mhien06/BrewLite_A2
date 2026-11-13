import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DATA_SOURCE } from '../database/database.module';
import { PAYMENT_GATEWAY, PaymentGateway } from './payment-gateway';
import { PaymentRow } from './payment.types';
import { PaymentSettlementService } from './payment-settlement.service';

@Injectable()
export class ReconciliationJob implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  private readonly logger = new Logger(ReconciliationJob.name);

  constructor(
    @Inject(DATA_SOURCE) private readonly db: DataSource,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
    @Inject(PaymentSettlementService) private readonly settlement: PaymentSettlementService,
  ) {}

  onModuleInit() {
    if (process.env.PAYMENT_RECONCILIATION_ENABLED === 'false') return;
    // Timer có vòng đời NestJS, không cần thêm thư viện chỉ để chạy mỗi phút.
    this.timer = setInterval(() => { void this.run(); }, 60_000);
    this.timer.unref();
    void this.run();
  }

  onModuleDestroy() { clearInterval(this.timer); }

  async run() {
    if (this.running) return;
    this.running = true;
    try {
      for (let index = 0; index < 20; index++) {
        // Nhận từng việc bằng lease ngắn. Không giữ transaction khi chờ mạng VNPay.
        const rows = await this.db.query(`WITH candidate AS (
          SELECT id FROM payments WHERE status IN ('PENDING','UNKNOWN')
          AND expires_at <= now() AND next_query_at <= now()
          ORDER BY next_query_at FOR UPDATE SKIP LOCKED LIMIT 1
        ), claimed AS (
          UPDATE payments p SET next_query_at = now() + interval '1 minute',
          query_attempts = query_attempts + 1 FROM candidate c WHERE p.id = c.id RETURNING p.*
        ) SELECT * FROM claimed`) as PaymentRow[];
        const payment = rows[0];
        if (!payment) break;
        try {
          const evidence = await this.gateway.queryTransaction({
            orderId: payment.order_id, transactionRef: payment.transaction_ref, amount: payment.amount,
            createdAt: payment.created_at, expiresAt: payment.expires_at, ipAddress: '127.0.0.1',
          });
          if (evidence) await this.settlement.settle(evidence, 'QUERY');
          else await this.settlement.markUnknown(payment.id);
        } catch {
          await this.settlement.markUnknown(payment.id);
          this.logger.warn(`Reconciliation pending for payment ${payment.id}`);
        }
      }
    } catch {
      // Không log URL thanh toán, secret hay dữ liệu phản hồi nguyên bản.
      this.logger.warn('Reconciliation could not complete; retry on next interval.');
    } finally { this.running = false; }
  }
}
