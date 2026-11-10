import 'reflect-metadata';
import { config } from 'dotenv';
import { Controller, Get, Module, NotFoundException, Param, ParseIntPipe, ServiceUnavailableException } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DataSource, QueryRunner } from 'typeorm';

config({ path: '../../.env' });
class Catalog1760000000000 {
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
class ProductImages1760000001000 {
  async up(db: QueryRunner) {
    await db.query('ALTER TABLE products ADD COLUMN image_url text');
    await db.query(`UPDATE products SET image_url = CASE name
      WHEN 'Cà phê sữa' THEN '/products/ca-phe-sua.jpg'
      WHEN 'Bạc xỉu' THEN '/products/bac-xiu.jpg'
      WHEN 'Trà đào' THEN '/products/tra-dao.jpg'
      WHEN 'Matcha latte' THEN '/products/matcha-latte.jpg'
    END`);
  }
  async down(db: QueryRunner) {
    await db.query('ALTER TABLE products DROP COLUMN image_url');
  }
}
const db = new DataSource({
  type: 'postgres', url: process.env.DATABASE_URL,
  migrations: [Catalog1760000000000, ProductImages1760000001000],
});

@Controller()
class CatalogController {
  @Get('health')
  async health() {
    try {
      await db.query('SELECT 1');
      return { status: 'ok' };
    } catch {
      throw new ServiceUnavailableException('Không kết nối được cơ sở dữ liệu.');
    }
  }

  @Get('products')
  list() {
    return db.query('SELECT id, name, description, price, stock, image_url AS "imageUrl" FROM products ORDER BY id');
  }

  @Get('products/:id')
  async detail(@Param('id', ParseIntPipe) id: number) {
    const [product] = await db.query('SELECT id, name, description, price, stock, image_url AS "imageUrl" FROM products WHERE id = $1', [id]);
    if (!product) throw new NotFoundException('Không tìm thấy món.');
    const options = await db.query(
      'SELECT id, kind, name, surcharge FROM product_options WHERE product_id = $1 ORDER BY id',
      [id],
    );
    return { ...product, options };
  }
}

@Module({ controllers: [CatalogController] })
class AppModule {}

async function start() {
  await db.initialize();
  await db.runMigrations({ transaction: 'all' });
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:3000' });
  await app.listen(Number(process.env.PORT ?? 3001), '0.0.0.0');
}
void start().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Không thể khởi động API.');
  process.exitCode = 1;
});
