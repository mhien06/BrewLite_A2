import { MigrationInterface, QueryRunner } from 'typeorm';

export class Payments1760000003000 implements MigrationInterface {
  async up(db: QueryRunner) {
    // Đơn hiện có đã trừ tồn khi tạo. NULL nghĩa là tồn vẫn đang được giữ.
    await db.query('ALTER TABLE orders ADD COLUMN inventory_released_at timestamptz');
    await db.query(`CREATE TABLE payments (
      id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      order_id integer NOT NULL REFERENCES orders(id),
      transaction_ref varchar(100) NOT NULL UNIQUE,
      idempotency_key uuid NOT NULL,
      amount integer NOT NULL CHECK (amount > 0),
      status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','UNKNOWN','SUCCESS','FAILED','EXPIRED')),
      payment_url text NOT NULL,
      created_at timestamptz NOT NULL,
      expires_at timestamptz NOT NULL,
      settled_at timestamptz,
      next_query_at timestamptz NOT NULL,
      query_attempts integer NOT NULL DEFAULT 0,
      response_code text,
      transaction_status text,
      transaction_no text,
      bank_code text,
      pay_date text,
      settlement_source text CHECK (settlement_source IN ('IPN','QUERY')),
      review_required boolean NOT NULL DEFAULT false,
      UNIQUE(order_id, idempotency_key),
      CHECK (expires_at > created_at)
    )`);
    // Một đơn chỉ có tối đa một giao dịch chưa rõ kết quả hoặc đã thành công.
    await db.query(`CREATE UNIQUE INDEX payments_one_active_order_idx ON payments(order_id)
      WHERE status IN ('PENDING','UNKNOWN','SUCCESS')`);
    await db.query('CREATE INDEX payments_order_idx ON payments(order_id, id DESC)');
    await db.query(`CREATE INDEX payments_reconcile_idx ON payments(next_query_at)
      WHERE status IN ('PENDING','UNKNOWN')`);
    await db.query(`CREATE TABLE payment_reviews (
      payment_id integer PRIMARY KEY REFERENCES payments(id),
      reason text NOT NULL,
      evidence jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )`);
  }

  async down(db: QueryRunner) {
    await db.query('DROP TABLE payment_reviews');
    await db.query('DROP TABLE payments');
    await db.query('ALTER TABLE orders DROP COLUMN inventory_released_at');
  }
}
