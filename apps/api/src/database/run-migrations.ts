import 'reflect-metadata';
import { dataSource } from './data-source';

export async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required to run migrations.');
  }

  await dataSource.initialize();
  try {
    const executedMigrations = await dataSource.runMigrations({ transaction: 'all' });
    console.log(`Successfully applied ${executedMigrations.length} migration(s).`);
    return executedMigrations;
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

if (process.argv[1] && process.argv[1].includes('run-migrations')) {
  runMigrations().catch((err: unknown) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}
