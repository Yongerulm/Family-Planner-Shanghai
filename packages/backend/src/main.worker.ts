/**
 * Worker Entrypoint
 * Verarbeitet BullMQ-Jobs: Push-Notifications, Task-Reminders, Calendar-Reminders
 * Läuft als separater Container ohne HTTP-Server.
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { createWinstonLogger } from './config/logger.config';
import { WinstonModule } from 'nest-winston';

async function bootstrapWorker() {
  const logger = createWinstonLogger();

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: WinstonModule.createLogger({ instance: logger }),
  });

  // NestJS context bleibt offen; BullMQ Processors sind automatisch aktiv
  // weil sie via @Processor()-Dekorator registriert sind.
  await app.init();

  logger.info('Family Planner Worker started — waiting for jobs');

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('Worker received SIGTERM, shutting down...');
    await app.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    await app.close();
    process.exit(0);
  });
}

bootstrapWorker().catch((error) => {
  console.error('Worker failed to start:', error);
  process.exit(1);
});
