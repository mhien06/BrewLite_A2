import { MigrationInterface, QueryRunner } from 'typeorm';

export class Catalog1760000000000 implements MigrationInterface {
  async up(db: QueryRunner) {
    await db.query(`CREATE TABLE products (
      id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      name text NOT NULL, description text NOT NULL,
      price integer NOT NULL CHECK (price >= 0),
      stock integer NOT NULL CHECK (stock >= 0)
    )`);
    await db.query(`CREATE TABLE product_options (
      id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      product_id integer NOT NULL REFERENCES products(id),
      kind text NOT NULL CHECK (kind IN ('SIZE', 'TOPPING')),
      name text NOT NULL, surcharge integer NOT NULL CHECK (surcharge >= 0),
      UNIQUE(product_id, kind, name)
    )`);
    await db.query(`INSERT INTO products (name, description, price, stock) VALUES
      ('Cà phê sữa', 'Cà phê pha cùng sữa đặc.', 29000, 30),
      ('Bạc xỉu', 'Sữa và cà phê, vị nhẹ.', 32000, 25),
      ('Trà đào', 'Trà và đào miếng.', 35000, 20),
      ('Matcha latte', 'Matcha pha cùng sữa tươi.', 39000, 25)`);
    await db.query(`INSERT INTO product_options (product_id, kind, name, surcharge)
      SELECT products.id, o.kind, o.name, o.surcharge FROM products
      CROSS JOIN (VALUES ('SIZE','S',0), ('SIZE','M',5000), ('SIZE','L',10000),
      ('TOPPING','Trân châu',8000), ('TOPPING','Kem sữa',10000),
      ('TOPPING','Thạch cà phê',7000)) AS o(kind,name,surcharge)`);
  }
  async down(db: QueryRunner) {
    await db.query('DROP TABLE product_options');
    await db.query('DROP TABLE products');
  }
}
