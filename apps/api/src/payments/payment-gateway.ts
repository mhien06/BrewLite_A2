// Port: nghiệp vụ thanh toán chỉ biết interface này, không phụ thuộc tham số vnp_*.
export const PAYMENT_GATEWAY = 'PAYMENT_GATEWAY';

export type PaymentStatus = 'PENDING' | 'UNKNOWN' | 'SUCCESS' | 'FAILED' | 'EXPIRED';

export interface PaymentRequest {
  orderId: number;
  transactionRef: string;
  amount: number;
  createdAt: Date;
  expiresAt: Date;
  ipAddress: string;
}

export interface PaymentEvidence {
  transactionRef: string;
  amount: number;
  status: Exclude<PaymentStatus, 'PENDING'>;
  responseCode: string;
  transactionStatus: string;
  transactionNo: string;
  bankCode: string;
  payDate: string;
}

export interface PaymentGateway {
  createPaymentUrl(request: PaymentRequest): string;
  verifyNotification(query: Record<string, unknown>): PaymentEvidence | null;
  queryTransaction(request: PaymentRequest): Promise<PaymentEvidence | null>;
}
