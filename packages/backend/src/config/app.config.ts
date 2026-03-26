import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  domain: process.env.DOMAIN ?? 'localhost',
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000').split(','),
  swaggerEnabled: process.env.SWAGGER_ENABLED === 'true',

  jwt: {
    privateKeyPath: process.env.JWT_PRIVATE_KEY_PATH,
    publicKeyPath: process.env.JWT_PUBLIC_KEY_PATH,
    privateKey: process.env.JWT_PRIVATE_KEY,
    publicKey: process.env.JWT_PUBLIC_KEY,
    accessTokenExpiry: process.env.JWT_ACCESS_TOKEN_EXPIRY ?? '15m',
    refreshTokenExpiry: process.env.JWT_REFRESH_TOKEN_EXPIRY ?? '30d',
  },

  bcrypt: {
    rounds: parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10),
    pepper: process.env.BCRYPT_PEPPER ?? '',
  },

  vault: {
    encryptionKey: process.env.VAULT_ENCRYPTION_KEY ?? '',
  },

  minio: {
    endpoint: process.env.MINIO_ENDPOINT ?? 'minio',
    port: parseInt(process.env.MINIO_PORT ?? '9000', 10),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    rootUser: process.env.MINIO_ROOT_USER ?? '',
    rootPassword: process.env.MINIO_ROOT_PASSWORD ?? '',
    bucketPublic: process.env.MINIO_BUCKET_PUBLIC ?? 'family-assets',
    bucketVault: process.env.MINIO_BUCKET_VAULT ?? 'family-vault',
    bucketBackups: process.env.MINIO_BUCKET_BACKUPS ?? 'family-backups',
  },

  push: {
    apns: {
      keyId: process.env.APNS_KEY_ID,
      teamId: process.env.APNS_TEAM_ID,
      privateKeyPath: process.env.APNS_PRIVATE_KEY_PATH,
      production: process.env.APNS_PRODUCTION === 'true',
    },
    fcm: {
      serverKey: process.env.FCM_SERVER_KEY,
    },
  },

  weather: {
    provider: process.env.WEATHER_API_PROVIDER ?? 'openweathermap',
    apiKey: process.env.WEATHER_API_KEY ?? '',
    defaultLocation: process.env.WEATHER_DEFAULT_LOCATION ?? 'Shanghai,CN',
  },
}));

export const databaseConfig = registerAs('database', () => ({
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  name: process.env.DB_NAME ?? 'family_planner',
  user: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  ssl: process.env.DB_SSL === 'true',
  logging: process.env.DB_LOGGING === 'true',
  synchronize: false, // Immer false in Produktion! Nur Migrations.
  maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS ?? '20', 10),
}));

export const redisConfig = registerAs('redis', () => ({
  host: process.env.REDIS_HOST ?? 'localhost',
  port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB ?? '0', 10),
  keyPrefix: 'fp:',
}));
