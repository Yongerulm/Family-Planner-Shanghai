import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { WinstonModule } from 'nest-winston';

import { createWinstonLogger } from './config/logger.config';
import { appConfig, databaseConfig, redisConfig } from './config/app.config';
import { getDatabaseConfig } from './config/database.config';
import { getRedisConfig } from './config/redis.config';

// Modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { FamiliesModule } from './modules/families/families.module';
import { ShoppingModule } from './modules/shopping/shopping.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { NotesModule } from './modules/notes/notes.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { MealsModule } from './modules/meals/meals.module';
import { RecipesModule } from './modules/recipes/recipes.module';
import { SchoolModule } from './modules/school/school.module';
import { FreezerModule } from './modules/freezer/freezer.module';
import { WeatherModule } from './modules/weather/weather.module';
import { VaultModule } from './modules/vault/vault.module';
import { EmergencyModule } from './modules/emergency/emergency.module';
import { GamificationModule } from './modules/gamification/gamification.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SyncModule } from './modules/sync/sync.module';
import { AuditModule } from './modules/audit/audit.module';
import { AdminModule } from './modules/admin/admin.module';
import { RedisModule } from './modules/redis/redis.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    // Config (global, loads .env)
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig],
      envFilePath: ['.env.local', '.env'],
    }),

    // Logger (global)
    WinstonModule.forRoot({
      instance: createWinstonLogger(),
    }),

    // Database
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: getDatabaseConfig,
    }),

    // Rate Limiting
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1_000, limit: 20 },
      { name: 'medium', ttl: 60_000, limit: 200 },
      { name: 'long', ttl: 3_600_000, limit: 2000 },
    ]),

    // Job Queue
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: getRedisConfig,
    }),

    // Event Emitter (für domain events)
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      maxListeners: 20,
    }),

    // Scheduler (für Cron Jobs)
    ScheduleModule.forRoot(),

    // Domain Modules
    AuthModule,
    UsersModule,
    FamiliesModule,
    ShoppingModule,
    TasksModule,
    NotesModule,
    CalendarModule,
    MealsModule,
    RecipesModule,
    SchoolModule,
    FreezerModule,
    WeatherModule,
    VaultModule,
    EmergencyModule,
    GamificationModule,
    NotificationsModule,
    SyncModule,
    AuditModule,
    AdminModule,
    RedisModule,
    HealthModule,
  ],
  providers: [
    // Global Rate Limit Guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
