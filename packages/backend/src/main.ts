import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { createWinstonLogger } from './config/logger.config';
import { HttpExceptionFilter } from './shared/filters/http-exception.filter';
import { TransformInterceptor } from './shared/interceptors/transform.interceptor';

async function bootstrap() {
  const logger = createWinstonLogger();

  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({ instance: logger }),
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');

  // Security
  app.use(helmet({
    contentSecurityPolicy: nodeEnv === 'production',
    crossOriginEmbedderPolicy: false,
  }));

  // Compression
  app.use(compression());

  // CORS
  app.enableCors({
    origin: configService.get<string>('CORS_ORIGINS', '*').split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-App-Version', 'X-Platform'],
  });

  // API Versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'v',
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // Global Pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global Filters
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global Interceptors
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger (nur in non-production oder wenn explizit aktiviert)
  if (nodeEnv !== 'production' || configService.get<boolean>('SWAGGER_ENABLED', false)) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Family Planner API')
      .setDescription('Family Planner - Self-hosted family organization API')
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'access-token',
      )
      .addTag('auth', 'Authentication & Authorization')
      .addTag('users', 'User Management')
      .addTag('families', 'Family Management')
      .addTag('shopping', 'Shopping Lists')
      .addTag('tasks', 'Todo & Tasks')
      .addTag('notes', 'Notes')
      .addTag('calendar', 'Calendar Events')
      .addTag('meals', 'Meal Planning')
      .addTag('school', 'School Planner')
      .addTag('freezer', 'Freezer Tracker')
      .addTag('weather', 'Weather Station')
      .addTag('vault', 'Document Vault')
      .addTag('emergency', 'Emergency Preparedness')
      .addTag('gamification', 'Gamification System')
      .addTag('notifications', 'Notification Center')
      .addTag('health', 'System Health')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
      },
    });

    logger.info(`Swagger docs available at: http://localhost:${port}/api/docs`);
  }

  // Graceful shutdown on SIGTERM/SIGINT (docker compose stop sends SIGTERM)
  // Without this, the container waits ~10s then gets SIGKILL → dirty DB disconnect
  app.enableShutdownHooks();

  await app.listen(port);
  logger.info(`Family Planner API running on port ${port} [${nodeEnv}]`);
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
