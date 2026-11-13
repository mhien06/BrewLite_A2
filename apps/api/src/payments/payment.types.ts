import { PaymentStatus } from './payment-gateway';

export interface PaymentRow {
  id: number;
  order_id: number;
  transaction_ref: string;
  idempotency_key: string;
  amount: number;
  status: PaymentStatus;
  payment_url: string;
  created_at: Date;
  expires_at: Date;
  review_required: boolean;
}

export interface PaymentOrder {
  id: number;
  user_id: number;
  status: string;
  total_amount: number;
  inventory_released_at: Date | null;
}

export function isUnresolved(status: PaymentStatus): boolean {
  return status === 'PENDING' || status === 'UNKNOWN';
}
