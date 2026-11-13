import { Module } from '@nestjs/common';
import { VnpayGatewayModule } from '../vnpay/vnpay.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentSettlementService } from './payment-settlement.service';
import { ReconciliationJob } from './reconciliation.job';

@Module({
  imports: [VnpayGatewayModule], controllers: [PaymentsController],
  providers: [PaymentsService, PaymentSettlementService, ReconciliationJob],
})
export class PaymentsModule {}
