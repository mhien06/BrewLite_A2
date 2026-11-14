import { Controller, Get, NotFoundException, Param, ParseIntPipe, ServiceUnavailableException } from '@nestjs/common';
import { Public } from '../common/public.decorator';
import { DATA_SOURCE } from '../database/database.module';
import { Inject } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { productDetailResponse } from '../catalog-domain.cjs';

@Controller()
export class CatalogController {
  constructor(@Inject(DATA_SOURCE) private readonly db: DataSource) {}

  @Public()
  @Get('health')
  async health() {
    try { await this.db.query('SELECT 1'); return { status: 'ok' }; }
    catch { throw new ServiceUnavailableException('Database unavailable.'); }
  }

  @Public()
  @Get('products')
  list() {
    return this.db.query('SELECT id, name, description, price, stock, image_url AS "imageUrl" FROM products ORDER BY id');
  }

  @Public()
  @Get('products/:id')
  async detail(@Param('id', ParseIntPipe) id: number) {
    const [product] = await this.db.query('SELECT id, name, description, price, stock, image_url AS "imageUrl" FROM products WHERE id = $1', [id]);
    if (!product) throw new NotFoundException('Product not found.');
    const options = await this.db.query('SELECT id, kind, name, surcharge FROM product_options WHERE product_id = $1 ORDER BY id', [id]);
    return productDetailResponse(product, options);
  }
}
