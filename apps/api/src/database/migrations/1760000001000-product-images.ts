import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProductImages1760000001000 implements MigrationInterface {
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
