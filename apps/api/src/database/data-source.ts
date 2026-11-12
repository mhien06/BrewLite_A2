import { DataSource } from 'typeorm';
import { Catalog1760000000000 } from './migrations/1760000000000-catalog';
import { ProductImages1760000001000 } from './migrations/1760000001000-product-images';
import { AuthOrders1760000002000 } from './migrations/1760000002000-auth-orders';

export const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  migrations: [Catalog1760000000000, ProductImages1760000001000, AuthOrders1760000002000],
});
