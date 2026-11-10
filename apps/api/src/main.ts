import 'reflect-metadata';
import { config } from 'dotenv';

config({ path: '../../.env' });

async function start() {
  const [{ NestFactory }, { ValidationPipe }, { AppModule }, { ApiExceptionFilter }, { dataSource }] = await Promise.all([
    import('@nestjs/core'), import('@nestjs/common'), import('./app.module'),
    import('./common/api-exception.filter'), import('./database/data-source'),
  ]);
  await dataSource.initialize();
  await dataSource.runMigrations({ transaction: 'all' });
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:3000' });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new ApiExceptionFilter());
  await app.listen(Number(process.env.API_PORT ?? process.env.PORT ?? 3001), '0.0.0.0');
}

void start().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Could not start API.');
  process.exitCode = 1;
});
