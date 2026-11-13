import { Module } from '@nestjs/common';
import { PAYMENT_GATEWAY } from '../payments/payment-gateway';
import { VnpayGateway } from './vnpay.gateway';

@Module({ providers: [{ provide: PAYMENT_GATEWAY, useClass: VnpayGateway }], exports: [PAYMENT_GATEWAY] })
export class VnpayGatewayModule {}
