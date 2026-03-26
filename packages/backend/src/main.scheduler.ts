/**
 * Scheduler Entrypoint
 * Führt @Cron-Jobs aus: Wetter-Fetch, Freezer-Expiry-Check, Emergency-Expiry-Check,
 * Backup-Trigger, Token-Cleanup
 * Läuft als separater Container ohne HTTP-Server.
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { createWinstonLogger } from './config/logger.config';
import { WinstonModule } from 'nest-winston';

async function bootstrapScheduler() {
  const logger = createWinstonLogger();

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: WinstonModule.createLogger({ instance: logger }),
  });

  await app.init();

  logger.info('Family Planner Scheduler started — cron jobs active');

  process.on('SIGTERM', async () => {
    logger.info('Scheduler received SIGTERM, shutting down...');
    await app.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    await app.close();
    process.exit(0);
  });
}

bootstrapScheduler().catch((error) => {
  console.error('Scheduler failed to start:', error);
  process.exit(1);
});
