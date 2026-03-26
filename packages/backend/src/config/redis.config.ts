import { ConfigService } from '@nestjs/config';
import { BullRootModuleOptions } from '@nestjs/bullmq';

export function getRedisConfig(configService: ConfigService): BullRootModuleOptions {
  return {
    connection: {
      host: configService.get<string>('redis.host', 'localhost'),
      port: configService.get<number>('redis.port', 6379),
      password: configService.get<string>('redis.password'),
      db: configService.get<number>('redis.db', 0),
      maxRetriesPerRequest: null, // BullMQ Requirement
      enableReadyCheck: false,    // BullMQ Requirement
      retryStrategy: (times: number) => {
        if (times > 10) return null; // Aufgeben nach 10 Versuchen
        return Math.min(times * 1000, 5000); // Max 5 Sekunden Wartezeit
      },
    },
    defaultJobOptions: {
      removeOnComplete: { count: 100 }, // Letzte 100 abgeschlossene Jobs behalten
      removeOnFail: { count: 500 },     // Letzte 500 fehlgeschlagene Jobs behalten
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    },
  };
}
