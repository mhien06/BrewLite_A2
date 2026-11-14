import { MigrationInterface, QueryRunner } from 'typeorm';

export class AuthOrders1760000002000 implements MigrationInterface {
  async up(db: QueryRunner) {
    await db.query(`CREATE TABLE users (
      id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      full_name text NOT NULL,
      email text NOT NULL UNIQUE,
      password_hash text NOT NULL,
      role text NOT NULL DEFAULT 'CUSTOMER' CHECK (role IN ('CUSTOMER', 'STAFF', 'MANAGER')),
      status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
      created_at timestamptz NOT NULL DEFAULT now()
    )`);
    await db.query(`CREATE TABLE orders (
      id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      user_id integer NOT NULL REFERENCES users(id),
      status text NOT NULL DEFAULT 'PENDING_PAYMENT'
        CHECK (status IN ('PENDING_PAYMENT', 'PAID', 'PREPARING', 'READY_FOR_PICKUP', 'COMPLETED')),
      subtotal integer NOT NULL CHECK (subtotal >= 0),
      discount_amount integer NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
      total_amount integer NOT NULL CHECK (total_amount >= 0),
      created_at timestamptz NOT NULL DEFAULT now()
    )`);
    await db.query(`CREATE INDEX orders_user_created_idx ON orders(user_id, created_at DESC)`);
    await db.query(`CREATE TABLE order_items (
      id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      order_id integer NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id integer NOT NULL REFERENCES products(id),
      product_name text NOT NULL,
      size_snapshot jsonb NOT NULL,
      toppings_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
      quantity integer NOT NULL CHECK (quantity > 0),
      unit_price integer NOT NULL CHECK (unit_price >= 0),
      line_total integer NOT NULL CHECK (line_total >= 0)
    )`);
    await db.query('CREATE INDEX order_items_order_idx ON order_items(order_id)');
  }
  async down(db: QueryRunner) {
    await db.query('DROP TABLE order_items');
    await db.query('DROP TABLE orders');
    await db.query('DROP TABLE users');
  }
}
