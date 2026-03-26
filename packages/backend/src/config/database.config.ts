import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'path';

export function getDatabaseConfig(configService: ConfigService): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    host: configService.get<string>('database.host'),
    port: configService.get<number>('database.port'),
    database: configService.get<string>('database.name'),
    username: configService.get<string>('database.user'),
    password: configService.get<string>('database.password'),
    entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
    migrations: [join(__dirname, '..', 'database', 'migrations', '*.{ts,js}')],
    synchronize: false,
    logging: configService.get<boolean>('database.logging', false),
    ssl: configService.get<boolean>('database.ssl', false)
      ? { rejectUnauthorized: false }
      : false,
    extra: {
      max: configService.get<number>('database.maxConnections', 20),
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 30_000,
    },
    // Migrations werden beim Start automatisch ausgeführt
    migrationsRun: true,
  };
}
