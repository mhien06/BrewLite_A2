import { Body, Controller, Get, Header, Inject, Param, ParseIntPipe, Post, Query, Req, ValidationPipe } from '@nestjs/common';
import { IsOptional, IsUUID } from 'class-validator';
import { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../common/current-user.decorator';
import { Public } from '../common/public.decorator';
import { PAYMENT_GATEWAY, PaymentGateway } from './payment-gateway';
import { PaymentsService } from './payments.service';
import { PaymentSettlementService } from './payment-settlement.service';

export class CreatePaymentDto {
  @IsOptional() @IsUUID('4') idempotencyKey?: string;
}

@Controller()
export class PaymentsController {
  constructor(
    @Inject(PaymentsService) private readonly payments: PaymentsService,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
    @Inject(PaymentSettlementService) private readonly settlement: PaymentSettlementService,
  ) {}

  @Post('orders/:id/payments')
  create(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body(new ValidationPipe({ expectedType: CreatePaymentDto, whitelist: true, forbidNonWhitelisted: true, transform: true })) body: CreatePaymentDto,
    @Req() request: { ip?: string },
  ) {
    // Không tin X-Forwarded-For tùy ý từ client; Express lấy IP kết nối trực tiếp.
    const ipAddress = request.ip?.replace(/^::ffff:/, '') ?? '127.0.0.1';
    return this.payments.create(user.sub, id, body?.idempotencyKey ?? undefined, ipAddress);
  }

  @Get('orders/:id/payment-status')
  @Header('Cache-Control', 'no-store')
  status(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.payments.status(user.sub, id);
  }

  @Public()
  @Get('payments/vnpay/ipn')
  @Header('Cache-Control', 'no-store')
  async ipn(@Query() query: Record<string, unknown>) {
    try {
      const evidence = this.gateway.verifyNotification(query);
      if (!evidence) return { RspCode: '97', Message: 'Invalid signature or parameters' };
      const result = await this.settlement.settle(evidence, 'IPN');
      const codes = { ACCEPTED: '00', DUPLICATE: '02', NOT_FOUND: '01', INVALID_AMOUNT: '04' };
      return { RspCode: codes[result], Message: result };
    } catch {
      // VNPay cần HTTP 200 và RspCode để quyết định gửi lại IPN.
      return { RspCode: '99', Message: 'Unable to process notification' };
    }
  }
}
