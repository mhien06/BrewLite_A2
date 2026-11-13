import { MigrationInterface, QueryRunner } from 'typeorm';

export class StaffOrderCancelled1760000004000 implements MigrationInterface {
  async up(db: QueryRunner) {
    await db.query('ALTER TABLE orders DROP CONSTRAINT orders_status_check');
    await db.query(`ALTER TABLE orders ADD CONSTRAINT orders_status_check
      CHECK (status IN ('PENDING_PAYMENT', 'PAID', 'PREPARING', 'READY_FOR_PICKUP', 'COMPLETED', 'CANCELLED'))`);
  }

  async down(db: QueryRunner) {
    const [cancelled] = await db.query("SELECT id FROM orders WHERE status = 'CANCELLED' LIMIT 1");
    if (cancelled) throw new Error('Cannot revert staff order migration while cancelled orders exist.');
    await db.query('ALTER TABLE orders DROP CONSTRAINT orders_status_check');
    await db.query(`ALTER TABLE orders ADD CONSTRAINT orders_status_check
      CHECK (status IN ('PENDING_PAYMENT', 'PAID', 'PREPARING', 'READY_FOR_PICKUP', 'COMPLETED'))`);
  }
}
