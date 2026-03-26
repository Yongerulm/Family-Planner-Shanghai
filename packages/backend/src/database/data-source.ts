import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';

// Für CLI-Tools (migration:generate, migration:run etc.)
config({ path: join(__dirname, '..', '..', '..', '..', '.env') });
config({ path: join(__dirname, '..', '..', '..', '..', '.env.local') });

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  database: process.env.DB_NAME ?? 'family_planner',
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  synchronize: false,
  logging: process.env.DB_LOGGING === 'true',
});
